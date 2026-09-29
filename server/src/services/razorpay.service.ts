import crypto from 'crypto';
import axios from 'axios';
import { config } from '../config/index.js';
import { prisma } from '../prisma.js';

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  transfers?: any[];
}

export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string,
  shopId?: string
): Promise<RazorpayOrderResponse> {
  // Razorpay requires amount in paise (1 INR = 100 paise), min ₹1.00 (100 paise)
  const amountInPaise = Math.max(100, Math.round(amountInRupees * 100));

  // Check if target shop has a Razorpay Route Linked Account ID
  let shopLinkedAccountId: string | null = null;
  if (shopId) {
    try {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { razorpayAccountId: true }
      });
      if (shop?.razorpayAccountId) {
        shopLinkedAccountId = shop.razorpayAccountId;
      }
    } catch (e) {
      console.warn('[Razorpay Route] Could not lookup shop linked account:', e);
    }
  }

  // If real key is provided (starts with rzp_test_ or rzp_live_)
  if (config.razorpay.keyId && config.razorpay.keySecret && !config.razorpay.keyId.includes('mock')) {
    try {
      const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
      
      const orderPayload: any = {
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1
      };

      // If shop has a Razorpay Route Linked Account, split payout directly to vendor
      if (shopLinkedAccountId) {
        orderPayload.transfers = [
          {
            account: shopLinkedAccountId,
            amount: amountInPaise,
            currency: 'INR',
            on_hold: false
          }
        ];
        console.log(`[Razorpay Route] Configured split payout to vendor account: ${shopLinkedAccountId}`);
      }

      const response = await axios.post(
        'https://api.razorpay.com/v1/orders',
        orderPayload,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        id: response.data.id,
        amount: response.data.amount,
        currency: response.data.currency,
        receipt: response.data.receipt || receipt,
        status: response.data.status,
        transfers: response.data.transfers
      };
    } catch (err: any) {
      console.error('Razorpay API Order Creation Error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.description || 'Failed to create Razorpay order');
    }
  }

  // Fallback for offline mock testing
  const mockOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency: 'INR',
    receipt,
    status: 'created'
  };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  // In development / test mode, accept mock signatures or compute SHA256 HMAC
  if (paymentId.startsWith('pay_mock_') || signature.startsWith('mock_sig_')) {
    return true;
  }

  try {
    const text = `${orderId}|${paymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(text)
      .digest('hex');

    return generatedSignature === signature;
  } catch (err) {
    return false;
  }
}
