import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { calculateItemPrice } from '../utils/pricing.js';
import { routePrintJob } from '../services/printerRouting.service.js';
import { sseService } from '../services/sse.service.js';

const router = Router();

router.use(authenticate);

// 1. CREATE ORDER (from Cart, supports SHOP_UPI_QR, WALLET, RAZORPAY)
router.post('/', requireRole(['CUSTOMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { shopId, items, paymentMethod, upiTransactionRef, razorpayPaymentId, paymentScreenshot, notes } = req.body;
    const customerId = req.user!.userId;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Shop ID and at least one item are required.' });
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: { printers: true }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Selected shop does not exist.' });
    }

    let totalOrderAmount = 0;
    const validatedItems: any[] = [];

    const rates = {
      bwSingleRate: shop.bwSingleRate,
      bwDuplexRate: shop.bwDuplexRate,
      colorSingleRate: shop.colorSingleRate,
      colorDuplexRate: shop.colorDuplexRate
    };

    for (const item of items) {
      const colorMode = item.colorMode === 'COLOR' ? 'COLOR' : 'BW';
      const duplexMode =
        item.duplexMode === 'DUPLEX_SHORT'
          ? 'DUPLEX_SHORT'
          : item.duplexMode === 'DUPLEX_LONG' || item.duplexMode === 'DUPLEX'
          ? 'DUPLEX_LONG'
          : 'SINGLE';

      if (colorMode === 'COLOR') {
        const hasColor = shop.printers.some((p) => p.type === 'COLOR' && p.isOnline);
        if (!hasColor) {
          return res.status(400).json({
            success: false,
            message: `This shop does not support Color printing for file '${item.originalFileName}'.`
          });
        }
      }

      const pricing = calculateItemPrice({
        colorMode,
        duplexMode,
        totalPages: item.pageCount || 1,
        pageRange: item.pageRange || 'ALL',
        pageSubset: item.pageSubset || 'ALL',
        copies: item.copies || 1,
        rates
      });

      totalOrderAmount += pricing.totalPrice;

      validatedItems.push({
        originalFileName: item.originalFileName,
        storedFileName: item.storedFileName,
        fileType: item.fileType || 'pdf',
        fileSize: item.fileSize || 0,
        pageCount: item.pageCount || 1,
        calculatedPages: pricing.effectivePages,
        copies: pricing.copies,
        colorMode,
        duplexMode,
        orientation: item.orientation || 'PORTRAIT',
        paperSize: item.paperSize || 'A4',
        quality: item.quality || 'NORMAL',
        pageRange: item.pageRange || 'ALL',
        pageSubset: item.pageSubset || 'ALL',
        scaling: item.scaling || 'FIT',
        collate: item.collate !== undefined ? Boolean(item.collate) : true,
        itemPrice: pricing.totalPrice,
        status: 'PENDING'
      });
    }

    totalOrderAmount = Math.round((totalOrderAmount + Number.EPSILON) * 100) / 100;

    const orderNumber = `PH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedPaymentMethod = paymentMethod === 'WALLET' ? 'WALLET' : paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'SHOP_UPI_QR';

    const createdOrder = await prisma.$transaction(
      async (tx) => {
        if (selectedPaymentMethod === 'WALLET') {
          const wallet = await tx.wallet.findUnique({
            where: { userId: customerId }
          });

          if (!wallet || wallet.balance < totalOrderAmount) {
            throw new Error(
              `Insufficient wallet balance (₹${wallet?.balance.toFixed(2) || '0.00'}). Required: ₹${totalOrderAmount.toFixed(2)}`
            );
          }

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance - totalOrderAmount }
          });

          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              amount: totalOrderAmount,
              type: 'DEBIT',
              description: `Print Order ${orderNumber}`,
              orderId: orderNumber
            }
          });
        }

        // Create Order in DB
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            shopId,
            status: 'PENDING',
            totalAmount: totalOrderAmount,
            paymentMethod: selectedPaymentMethod,
            paymentStatus: 'PAID',
            upiTransactionRef: upiTransactionRef ? String(upiTransactionRef).trim() : null,
            razorpayPaymentId: razorpayPaymentId || null,
            paymentScreenshot: paymentScreenshot || null,
            notes: notes || null,
            items: {
              create: validatedItems
            }
          },
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true }
            },
            shop: {
              select: { id: true, name: true, address: true, phone: true, upiId: true }
            },
            items: true
          }
        });

        // Credit Shop Owner's Wallet with Order Revenue
        let shopWallet = await tx.wallet.findUnique({
          where: { userId: shop.userId }
        });

        if (!shopWallet) {
          shopWallet = await tx.wallet.create({
            data: {
              userId: shop.userId,
              balance: 0.0
            }
          });
        }

        await tx.wallet.update({
          where: { id: shopWallet.id },
          data: { balance: { increment: totalOrderAmount } }
        });

        await tx.transaction.create({
          data: {
            walletId: shopWallet.id,
            amount: totalOrderAmount,
            type: 'CREDIT',
            description: `Revenue from Order #${orderNumber} (${selectedPaymentMethod})`,
            orderId: orderNumber
          }
        });

        return order;
      },
      {
        maxWait: 15000,
        timeout: 30000
      }
    );

    // Notify Shop via SSE
    sseService.notifyShop(shopId, 'new_order', {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      totalAmount: createdOrder.totalAmount,
      customerName: createdOrder.customer.name,
      itemsCount: createdOrder.items.length,
      paymentMethod: createdOrder.paymentMethod,
      upiRef: createdOrder.upiTransactionRef
    });

    // Notify Customer via SSE
    sseService.notifyUser(customerId, 'order_created', {
      orderId: createdOrder.id,
      orderNumber: createdOrder.orderNumber,
      status: createdOrder.status
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: createdOrder
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to place order' });
  }
});

// 2. GET CUSTOMER ORDERS
router.get('/customer', requireRole(['CUSTOMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    const customerId = req.user!.userId;

    const whereClause: any = {
      customerId
    };

    if (status && status !== 'ALL') {
      whereClause.status = status as string;
    }

    if (search) {
      const searchStr = (search as string).trim();
      whereClause.OR = [
        { orderNumber: { contains: searchStr } },
        { shop: { name: { contains: searchStr } } },
        { items: { some: { originalFileName: { contains: searchStr } } } }
      ];
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        shop: {
          select: { id: true, name: true, address: true, phone: true, upiId: true }
        },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer orders' });
  }
});

// 3. GET SHOP FIFO PRINT QUEUE
router.get('/shop/queue', requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const queueOrders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
        status: { in: ['PENDING', 'PRINTING'] }
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true }
        },
        items: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const historyOrders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
        status: { in: ['PRINTED', 'COLLECTED', 'CANCELLED'] }
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true }
        },
        items: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return res.json({
      success: true,
      queue: queueOrders,
      history: historyOrders
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch print queue' });
  }
});

// 4. GET SINGLE ORDER DETAILS
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true }
        },
        shop: {
          select: { id: true, name: true, address: true, phone: true, upiId: true, bwSingleRate: true, colorSingleRate: true }
        },
        items: true
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isCustomer = order.customerId === req.user!.userId;
    const shop = await prisma.shop.findUnique({ where: { userId: req.user!.userId } });
    const isShopOwner = shop && shop.id === order.shopId;

    if (!isCustomer && !isShopOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({ success: true, order });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
});

// 5. SHOP ACTION: MANUAL PRINT JOB
router.post('/:orderId/items/:itemId/print', requireRole(['SHOP']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId, itemId } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { userId: req.user!.userId },
      include: { printers: true }
    });

    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true }
    });

    if (!order || order.shopId !== shop.id) {
      return res.status(404).json({ success: false, message: 'Order not found for this shop' });
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in this order' });
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: { status: 'PRINTING' }
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PRINTING' }
    });

    sseService.notifyUser(order.customerId, 'order_status_update', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: 'PRINTING',
      message: `File '${item.originalFileName}' is currently printing.`
    });

    const routingResult = await routePrintJob({
      shopId: shop.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      itemId: item.id,
      colorMode: item.colorMode as 'BW' | 'COLOR',
      duplexMode: item.duplexMode as any,
      storedFileName: item.storedFileName,
      originalFileName: item.originalFileName,
      copies: item.copies,
      orientation: item.orientation,
      paperSize: item.paperSize,
      quality: item.quality,
      pageRange: item.pageRange,
      pageSubset: (item as any).pageSubset || 'ALL',
      scaling: item.scaling,
      collate: item.collate
    });

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: 'PRINTED',
        printedAt: new Date()
      }
    });

    const refreshedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    const allPrinted = refreshedOrder?.items.every((i) => i.status === 'PRINTED');
    if (allPrinted) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PRINTED' }
      });
    }

    sseService.notifyUser(order.customerId, 'order_status_update', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: allPrinted ? 'PRINTED' : 'PRINTING',
      message: allPrinted
        ? `Order ${order.orderNumber} is ready for collection!`
        : `Item '${item.originalFileName}' has been printed.`
    });

    sseService.notifyShop(shop.id, 'queue_updated', {
      orderId: order.id,
      itemId: item.id,
      status: allPrinted ? 'PRINTED' : 'PRINTING'
    });

    return res.json({
      success: true,
      message: `Print job sent to ${routingResult.printerName} (Port ${routingResult.port})`,
      result: routingResult
    });
  } catch (error: any) {
    console.error('Print job error:', error);
    if (req.params.itemId) {
      await prisma.orderItem.update({
        where: { id: req.params.itemId },
        data: { status: 'FAILED', errorMessage: error.message }
      }).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to execute print job'
    });
  }
});

// 6. UPDATE ORDER STATUS
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PRINTING', 'PRINTED', 'COLLECTED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        items: status === 'PRINTED' ? {
          updateMany: {
            where: {},
            data: { status: 'PRINTED', printedAt: new Date() }
          }
        } : undefined
      },
      include: { customer: true, shop: true, items: true }
    });

    sseService.notifyUser(updated.customerId, 'order_status_update', {
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      status,
      message: status === 'COLLECTED'
        ? `Order ${updated.orderNumber} collected. Thank you!`
        : `Order status changed to ${status}`
    });

    sseService.notifyShop(updated.shopId, 'queue_updated', {
      orderId: updated.id,
      status
    });

    return res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

// 7. CANCEL ORDER WITH AUTO-REFUND
router.post('/:id/cancel', requireRole(['CUSTOMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.userId;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });

    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['PRINTING', 'PRINTED', 'COLLECTED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order in '${order.status}' state.`
      });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Order is already cancelled' });
    }

    const refundAmount = order.totalAmount;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'REFUNDED'
        }
      });

      const wallet = await tx.wallet.findUnique({
        where: { userId: customerId }
      });

      if (wallet) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: wallet.balance + refundAmount }
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: refundAmount,
            type: 'REFUND',
            description: `Refund for Cancelled Order ${order.orderNumber}`,
            orderId: order.orderNumber
          }
        });
      }

      // Reverse revenue from Shop Owner's Wallet if applicable
      const shopRecord = await tx.shop.findUnique({ where: { id: order.shopId } });
      if (shopRecord) {
        const shopWallet = await tx.wallet.findUnique({ where: { userId: shopRecord.userId } });
        if (shopWallet && shopWallet.balance >= refundAmount) {
          await tx.wallet.update({
            where: { id: shopWallet.id },
            data: { balance: { decrement: refundAmount } }
          });

          await tx.transaction.create({
            data: {
              walletId: shopWallet.id,
              amount: refundAmount,
              type: 'DEBIT',
              description: `Cancellation Reversal for Order #${order.orderNumber}`,
              orderId: order.orderNumber
            }
          });
        }
      }
    }, { maxWait: 15000, timeout: 30000 });

    sseService.notifyShop(order.shopId, 'queue_updated', {
      orderId: order.id,
      status: 'CANCELLED'
    });

    return res.json({
      success: true,
      message: `Order cancelled successfully. ₹${refundAmount.toFixed(2)} refunded to your wallet!`,
      refundAmount
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel order' });
  }
});

// 8. DELETE COMPLETED / CANCELLED ORDER
router.delete('/:id', requireRole(['CUSTOMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.userId;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id }
    });

    if (!order || order.customerId !== customerId) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['COLLECTED', 'CANCELLED'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'Only collected or cancelled orders can be removed from history.' });
    }

    await prisma.order.delete({
      where: { id: order.id }
    });

    return res.json({ success: true, message: 'Order removed from history' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

// 9. CLEAR ALL HISTORY
router.delete('/history/clear-all', requireRole(['CUSTOMER']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.userId;

    const deleteResult = await prisma.order.deleteMany({
      where: {
        customerId,
        status: { in: ['COLLECTED', 'CANCELLED'] }
      }
    });

    return res.json({
      success: true,
      message: `Cleared ${deleteResult.count} completed/cancelled order(s) from history.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to clear history' });
  }
});

export default router;
