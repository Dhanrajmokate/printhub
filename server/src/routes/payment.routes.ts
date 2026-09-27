import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../services/razorpay.service.js';
import { config } from '../config/index.js';

const router = Router();

router.use(authenticate);

// 1. CREATE RAZORPAY ORDER
router.post('/create-order', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum < 1) {
      return res.status(400).json({ success: false, message: 'Minimum transaction amount is ₹1.00' });
    }

    const receipt = `rcpt_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder(amountNum, receipt);

    return res.json({
      success: true,
      order: razorpayOrder,
      keyId: config.razorpay.keyId
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Payment initialization failed' });
  }
});

// 2. VERIFY PAYMENT SIGNATURE
router.post('/verify', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      paymentId: razorpayPaymentId
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

export default router;
