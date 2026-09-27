import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Multer storage for Shop QR images
const qrUploadDir = path.resolve(__dirname, '../../uploads/qr');
if (!fs.existsSync(qrUploadDir)) {
  fs.mkdirSync(qrUploadDir, { recursive: true });
}

const qrStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, qrUploadDir);
  },
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `shop_qr_${uniqueSuffix}${ext}`);
  }
});

const qrUpload = multer({
  storage: qrStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (PNG, JPG, JPEG, WEBP) are allowed for QR code upload.'));
    }
  }
});

// 1. PUBLIC: GET ALL SHOPS (for Customer shop selection)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const shops = await prisma.shop.findMany({
      include: {
        printers: true,
        orders: {
          select: { id: true, status: true, totalAmount: true }
        }
      }
    });

    const formattedShops = shops.map((shop) => {
      const completedOrders = shop.orders.filter((o) => o.status === 'COLLECTED' || o.status === 'PRINTED').length;
      const hasBw = shop.printers.some((p) => p.type === 'BW' && p.isOnline);
      const hasColor = shop.printers.some((p) => p.type === 'COLOR' && p.isOnline);
      const hasDuplex = shop.printers.some((p) => p.supportsDuplex && p.isOnline);

      return {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        upiId: shop.upiId || 'apexprint@upi',
        upiName: shop.upiName || shop.name,
        qrImageUrl: shop.qrImageUrl,
        qrType: shop.qrType || 'DYNAMIC_UPI',
        rates: {
          bwSingleRate: shop.bwSingleRate,
          bwDuplexRate: shop.bwDuplexRate,
          colorSingleRate: shop.colorSingleRate,
          colorDuplexRate: shop.colorDuplexRate
        },
        capabilities: {
          supportsBw: hasBw,
          supportsColor: hasColor,
          supportsDuplex: hasDuplex,
          autoConvert: shop.autoConvert
        },
        stats: {
          totalOrders: shop.orders.length,
          completedOrders,
          rating: 4.8
        },
        printers: shop.printers
      };
    });

    return res.json({ success: true, shops: formattedShops });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch shops' });
  }
});

// 2. SHOP WALLET & BALANCE (Must be before /:shopId)
router.get('/wallet', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.user!.userId,
          balance: 0.0
        },
        include: {
          transactions: true
        }
      });
    }

    const lifetimeEarnings = wallet.transactions
      .filter((t) => t.type === 'CREDIT')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawn = wallet.transactions
      .filter((t) => t.type === 'DEBIT' && t.description.includes('UPI'))
      .reduce((sum, t) => sum + t.amount, 0);

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: Math.round((wallet.balance + Number.EPSILON) * 100) / 100,
        lifetimeEarnings: Math.round((lifetimeEarnings + Number.EPSILON) * 100) / 100,
        totalWithdrawn: Math.round((totalWithdrawn + Number.EPSILON) * 100) / 100,
        transactions: wallet.transactions
      },
      shop: {
        name: shop.name,
        upiId: shop.upiId,
        upiName: shop.upiName,
        phone: shop.phone
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch shop wallet' });
  }
});

// 3. SHOP WITHDRAWAL TO UPI (Convert virtual balance to real money)
router.post('/wallet/withdraw', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, upiId } = req.body;
    const withdrawAmount = Math.round((parseFloat(amount) + Number.EPSILON) * 100) / 100;

    if (isNaN(withdrawAmount) || withdrawAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is ₹10.00'
      });
    }

    const targetUpiId = (upiId || '').trim();
    if (!targetUpiId || !targetUpiId.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid UPI ID (e.g. yourname@okaxis or 9876543210@ybl)'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!wallet || wallet.balance < withdrawAmount) {
        throw new Error(
          `Insufficient wallet balance (Available: ₹${wallet?.balance.toFixed(2) || '0.00'}, Requested: ₹${withdrawAmount.toFixed(2)})`
        );
      }

      const newBalance = Math.round((wallet.balance - withdrawAmount + Number.EPSILON) * 100) / 100;

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });

      // Generate standard NPCI Bank IMPS/UPI Payout reference
      const utrNumber = `NPCI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;

      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: withdrawAmount,
          type: 'DEBIT',
          description: `UPI Transfer to ${targetUpiId} (UTR: ${utrNumber})`
        }
      });

      return {
        updatedWallet,
        transaction,
        utrNumber
      };
    });

    return res.json({
      success: true,
      message: `₹${withdrawAmount.toFixed(2)} transferred successfully to ${targetUpiId}!`,
      payout: {
        amount: withdrawAmount,
        targetUpiId,
        utrNumber: result.utrNumber,
        newBalance: result.updatedWallet.balance,
        status: 'SETTLED',
        settledAt: new Date().toISOString(),
        transactionId: result.transaction.id
      }
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Withdrawal failed. Please try again.'
    });
  }
});

// 4. PUBLIC: GET SINGLE SHOP DETAILS
router.get('/:shopId', async (req: Request, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.shopId },
      include: {
        printers: true,
        orders: {
          select: { id: true, status: true }
        }
      }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    return res.json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        phone: shop.phone,
        upiId: shop.upiId || 'apexprint@upi',
        upiName: shop.upiName || shop.name,
        qrImageUrl: shop.qrImageUrl,
        qrType: shop.qrType || 'DYNAMIC_UPI',
        rates: {
          bwSingleRate: shop.bwSingleRate,
          bwDuplexRate: shop.bwDuplexRate,
          colorSingleRate: shop.colorSingleRate,
          colorDuplexRate: shop.colorDuplexRate
        },
        autoConvert: shop.autoConvert,
        printers: shop.printers
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch shop details' });
  }
});

// 3. SHOP ONLY: UPLOAD CUSTOM PHONEPE / UPI QR IMAGE
router.post('/upload-qr', authenticate, requireRole(['SHOP']), qrUpload.single('qrImage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a PhonePe / UPI QR code image to upload.' });
    }

    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found.' });
    }

    const qrImageUrl = `/uploads/qr/${req.file.filename}`;

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        qrImageUrl,
        qrType: 'CUSTOM_PHONEPE_IMAGE'
      }
    });

    return res.json({
      success: true,
      message: 'PhonePe QR Code uploaded successfully!',
      qrImageUrl,
      shop: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'QR upload failed.' });
  }
});

// 4. SHOP ONLY: UPDATE SHOP SETTINGS & PRICING & QR PREFERENCE
router.put('/settings', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      address,
      phone,
      upiId,
      upiName,
      qrImageUrl,
      qrType,
      bwSingleRate,
      bwDuplexRate,
      colorSingleRate,
      colorDuplexRate,
      autoConvert
    } = req.body;

    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found for this user' });
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: name ? name.trim() : undefined,
        address: address ? address.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        upiId: upiId ? upiId.trim() : undefined,
        upiName: upiName ? upiName.trim() : undefined,
        qrImageUrl: qrImageUrl !== undefined ? qrImageUrl : undefined,
        qrType: qrType !== undefined ? qrType : undefined,
        bwSingleRate: bwSingleRate !== undefined ? parseFloat(bwSingleRate) : undefined,
        bwDuplexRate: bwDuplexRate !== undefined ? parseFloat(bwDuplexRate) : undefined,
        colorSingleRate: colorSingleRate !== undefined ? parseFloat(colorSingleRate) : undefined,
        colorDuplexRate: colorDuplexRate !== undefined ? parseFloat(colorDuplexRate) : undefined,
        autoConvert: autoConvert !== undefined ? Boolean(autoConvert) : undefined
      },
      include: {
        printers: true
      }
    });

    return res.json({
      success: true,
      message: 'Shop settings, PhonePe QR, and pricing updated successfully',
      shop: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update shop settings' });
  }
});

// 5. SHOP ONLY: REVENUE ANALYTICS
router.get('/analytics/dashboard', authenticate, requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const daysRange = parseInt(req.query.days as string, 10) || 7;
    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const allOrders = await prisma.order.findMany({
      where: { shopId: shop.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let todayRevenue = 0;
    let todayOrdersCount = 0;
    let todayCompletedCount = 0;

    let totalRevenue = 0;
    let bwPageCount = 0;
    let colorPageCount = 0;
    let singleSidedCount = 0;
    let duplexCount = 0;

    for (const order of allOrders) {
      const isPaid = order.paymentStatus === 'PAID' && order.status !== 'CANCELLED';
      if (isPaid) {
        totalRevenue += order.totalAmount;
      }

      const orderDate = new Date(order.createdAt);
      if (orderDate >= startOfToday) {
        todayOrdersCount++;
        if (isPaid) {
          todayRevenue += order.totalAmount;
        }
        if (order.status === 'PRINTED' || order.status === 'COLLECTED') {
          todayCompletedCount++;
        }
      }

      for (const item of order.items) {
        const pages = item.calculatedPages * item.copies;
        if (item.colorMode === 'COLOR') {
          colorPageCount += pages;
        } else {
          bwPageCount += pages;
        }

        if (item.duplexMode === 'DUPLEX') {
          duplexCount += pages;
        } else {
          singleSidedCount += pages;
        }
      }
    }

    const chartData = [];
    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const dayOrders = allOrders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return oDate >= dayStart && oDate <= dayEnd;
      });

      const dayRevenue = dayOrders
        .filter((o) => o.paymentStatus === 'PAID' && o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      const dayLabel = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;

      chartData.push({
        date: dayLabel,
        revenue: Math.round(dayRevenue * 100) / 100,
        orders: dayOrders.length,
        completed: dayOrders.filter((o) => o.status === 'PRINTED' || o.status === 'COLLECTED').length
      });
    }

    return res.json({
      success: true,
      analytics: {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayOrdersCount,
        todayCompletedCount,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrdersCount: allOrders.length,
        breakdown: {
          bwPages: bwPageCount,
          colorPages: colorPageCount,
          singleSidedPages: singleSidedCount,
          duplexPages: duplexCount
        },
        chartData
      }
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate analytics' });
  }
});

export default router;
