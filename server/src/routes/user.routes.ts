import { Router, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// 1. GET WALLET & TRANSACTIONS
router.get('/wallet', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user!.userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 30
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    return res.json({
      success: true,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        transactions: wallet.transactions
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch wallet' });
  }
});

// 2. TOP UP WALLET
router.post('/wallet/topup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount, paymentMethod } = req.body;
    const topupAmount = parseFloat(amount);

    if (isNaN(topupAmount) || topupAmount < 1) {
      return res.status(400).json({ success: false, message: 'Minimum top-up amount is ₹1.00' });
    }

    const updatedWallet = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: req.user!.userId }
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const newBalance = wallet.balance + topupAmount;
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance }
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: topupAmount,
          type: 'CREDIT',
          description: `Wallet Top-Up (${paymentMethod || 'Online'})`
        }
      });

      return updated;
    });

    return res.json({
      success: true,
      message: `₹${topupAmount.toFixed(2)} added to wallet successfully!`,
      wallet: updatedWallet
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Top-up failed' });
  }
});

// 3. UPDATE PROFILE
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        name: name ? name.trim() : undefined,
        phone: phone ? phone.trim() : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true
      }
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

export default router;
