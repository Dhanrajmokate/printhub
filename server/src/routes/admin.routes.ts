import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth.js';
import { getPlatformConfig, updatePlatformConfig } from '../services/systemConfig.service.js';

const router = Router();

// Enforce admin authentication on all routes in this router
router.use(authenticate);
router.use(requireRole(['ADMIN']));

// ==========================================
// 1. PLATFORM TELEMETRY & OVERVIEW STATS
// ==========================================
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalShops,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalPrinters,
      onlinePrinters,
      ordersAgg
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.shop.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: { in: ['PENDING', 'PRINTING'] } } }),
      prisma.printer.count(),
      prisma.printer.count({ where: { isOnline: true } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' }
      })
    ]);

    const totalRevenue = ordersAgg._sum.totalAmount || 0;

    // Recent 5 platform orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } },
        items: true
      }
    });

    const config = getPlatformConfig();

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalCustomers,
        totalShops,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPrinters,
        onlinePrinters,
        systemStatus: config.maintenanceMode ? 'MAINTENANCE' : 'OPERATIONAL',
        recentOrders
      }
    });
  } catch (error: any) {
    console.error('[AdminStatsError]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
  }
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, role } = req.query;

    const whereClause: any = {};

    if (role && typeof role === 'string' && role !== 'ALL') {
      whereClause.role = role.toUpperCase();
    }

    if (q && typeof q === 'string' && q.trim()) {
      const search = q.trim();
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: true,
        shop: { select: { id: true, name: true, address: true } },
        _count: { select: { orders: true } }
      }
    });

    return res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        walletBalance: u.wallet?.balance || 0,
        walletId: u.wallet?.id,
        shop: u.shop,
        orderCount: u._count.orders
      }))
    });
  } catch (error: any) {
    console.error('[AdminUsersError]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Update User Role
router.put('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['CUSTOMER', 'SHOP', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role }
    });

    return res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: { id: updated.id, role: updated.role }
    });
  } catch (error: any) {
    console.error('[AdminUpdateRoleError]', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// Grant or adjust customer wallet balance
router.put('/users/:id/wallet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, type = 'CREDIT', description = 'Admin Adjustment' } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({ success: false, message: 'A non-zero numeric amount is required' });
    }

    // Ensure wallet exists
    let wallet = await prisma.wallet.findUnique({ where: { userId: id } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId: id, balance: 0.0 }
      });
    }

    const newBalance = type === 'CREDIT' ? wallet.balance + Math.abs(numAmount) : Math.max(0, wallet.balance - Math.abs(numAmount));

    const [updatedWallet, transaction] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      }),
      prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: Math.abs(numAmount),
          type: type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
          description: description || `Admin ${type} adjustment of ₹${Math.abs(numAmount)}`
        }
      })
    ]);

    return res.json({
      success: true,
      message: `Wallet updated: ₹${updatedWallet.balance.toFixed(2)}`,
      wallet: updatedWallet,
      transaction
    });
  } catch (error: any) {
    console.error('[AdminWalletError]', error);
    return res.status(500).json({ success: false, message: 'Failed to adjust wallet balance' });
  }
});

// Toggle user verification
router.put('/users/:id/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: { isVerified: Boolean(isVerified) }
    });

    return res.json({
      success: true,
      message: `User ${updated.email} is now ${updated.isVerified ? 'Verified' : 'Unverified'}`,
      isVerified: updated.isVerified
    });
  } catch (error: any) {
    console.error('[AdminVerifyError]', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle user verification' });
  }
});

// Delete user (Safety: prevent self deletion)
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?.userId === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account!' });
    }

    await prisma.user.delete({ where: { id } });

    return res.json({ success: true, message: 'User account removed successfully' });
  } catch (error: any) {
    console.error('[AdminDeleteUserError]', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

// ==========================================
// 3. SHOP MANAGEMENT
// ==========================================
router.get('/shops', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isVerified: true } },
        printers: true,
        _count: { select: { orders: true } }
      }
    });

    return res.json({
      success: true,
      shops: shops.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        phone: s.phone,
        latitude: s.latitude,
        longitude: s.longitude,
        upiId: s.upiId,
        upiName: s.upiName,
        bwSingleRate: s.bwSingleRate,
        bwDuplexRate: s.bwDuplexRate,
        colorSingleRate: s.colorSingleRate,
        colorDuplexRate: s.colorDuplexRate,
        autoConvert: s.autoConvert,
        owner: s.user,
        printersCount: s.printers.length,
        printers: s.printers,
        totalOrders: s._count.orders,
        createdAt: s.createdAt
      }))
    });
  } catch (error: any) {
    console.error('[AdminShopsError]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shops' });
  }
});

// Update Shop Print Rates
router.put('/shops/:id/rates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { bwSingleRate, bwDuplexRate, colorSingleRate, colorDuplexRate } = req.body;

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        ...(bwSingleRate !== undefined && { bwSingleRate: parseFloat(bwSingleRate) }),
        ...(bwDuplexRate !== undefined && { bwDuplexRate: parseFloat(bwDuplexRate) }),
        ...(colorSingleRate !== undefined && { colorSingleRate: parseFloat(colorSingleRate) }),
        ...(colorDuplexRate !== undefined && { colorDuplexRate: parseFloat(colorDuplexRate) })
      }
    });

    return res.json({
      success: true,
      message: `Print rates updated for ${updated.name}`,
      shop: updated
    });
  } catch (error: any) {
    console.error('[AdminShopRatesError]', error);
    return res.status(500).json({ success: false, message: 'Failed to update shop rates' });
  }
});

// Update Shop Details & Geolocation
router.put('/shops/:id/details', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, address, phone, upiId, upiName, latitude, longitude } = req.body;

    const updated = await prisma.shop.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(address && { address: address.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(upiId && { upiId: upiId.trim() }),
        ...(upiName && { upiName: upiName.trim() }),
        ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
        ...(longitude !== undefined && { longitude: parseFloat(longitude) })
      }
    });

    return res.json({
      success: true,
      message: `Shop details updated successfully for ${updated.name}`,
      shop: updated
    });
  } catch (error: any) {
    console.error('[AdminShopDetailsError]', error);
    return res.status(500).json({ success: false, message: 'Failed to update shop details' });
  }
});

// Remove / Delete Shop
router.delete('/shops/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingShop = await prisma.shop.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!existingShop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    // Safely remove associated records in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete order items for this shop's orders
      await tx.orderItem.deleteMany({
        where: { order: { shopId: id } }
      });

      // 2. Delete orders
      await tx.order.deleteMany({
        where: { shopId: id }
      });

      // 3. Delete printers
      await tx.printer.deleteMany({
        where: { shopId: id }
      });

      // 4. Delete the shop itself
      await tx.shop.delete({
        where: { id }
      });

      // 5. If the owner user still exists and role is SHOP, switch to CUSTOMER
      if (existingShop.userId) {
        await tx.user.updateMany({
          where: { id: existingShop.userId, role: 'SHOP' },
          data: { role: 'CUSTOMER' }
        });
      }
    });

    return res.json({
      success: true,
      message: `Shop "${existingShop.name}" was successfully removed.`
    });
  } catch (error: any) {
    console.error('[AdminDeleteShopError]', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to remove shop' });
  }
});

// ==========================================
// 4. GLOBAL ORDERS AUDIT & OVERRIDE
// ==========================================
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, shopId, q } = req.query;

    const whereClause: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status.toUpperCase();
    }

    if (shopId && typeof shopId === 'string' && shopId !== 'ALL') {
      whereClause.shopId = shopId;
    }

    if (q && typeof q === 'string' && q.trim()) {
      const search = q.trim();
      whereClause.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100, // Top 100 latest
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        shop: { select: { id: true, name: true, phone: true, address: true } },
        items: true
      }
    });

    return res.json({
      success: true,
      orders
    });
  } catch (error: any) {
    console.error('[AdminOrdersError]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch global orders' });
  }
});

// Override Order Status
router.put('/orders/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus })
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        shop: { select: { id: true, name: true } }
      }
    });

    return res.json({
      success: true,
      message: `Order #${updated.orderNumber} status changed to ${updated.status}`,
      order: updated
    });
  } catch (error: any) {
    console.error('[AdminOrderStatusError]', error);
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// ==========================================
// 5. SYSTEM CONFIGURATION & CONTROLS
// ==========================================
router.get('/config', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const cfg = getPlatformConfig();
    return res.json({ success: true, config: cfg });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to load platform config' });
  }
});

router.put('/config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { maintenanceMode, announcement, signupBonus, platformCommissionPercent, allowNewRegistrations, emergencyNotice } = req.body;

    const updated = updatePlatformConfig({
      ...(maintenanceMode !== undefined && { maintenanceMode: Boolean(maintenanceMode) }),
      ...(announcement !== undefined && { announcement: String(announcement).trim() }),
      ...(signupBonus !== undefined && { signupBonus: Number(signupBonus) }),
      ...(platformCommissionPercent !== undefined && { platformCommissionPercent: Number(platformCommissionPercent) }),
      ...(allowNewRegistrations !== undefined && { allowNewRegistrations: Boolean(allowNewRegistrations) }),
      ...(emergencyNotice !== undefined && { emergencyNotice: String(emergencyNotice).trim() })
    });

    return res.json({
      success: true,
      message: 'Platform settings saved successfully',
      config: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update platform config' });
  }
});

export default router;
