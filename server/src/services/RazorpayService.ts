import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

let instance: Razorpay | null = null;

if (key_id && key_secret) {
  try {
    instance = new Razorpay({
      key_id,
      key_secret,
    });
  } catch (e) {
    console.warn('Razorpay SDK initialization notice: running in mock fallback mode.');
  }
}

export class RazorpayService {
  /**
   * Create an order in Razorpay (or generate a mock order ID in test mode)
   */
  static async createOrder(amountInRupees: number, bookingId: string) {
    const amountInPaise = Math.round(amountInRupees * 100);
    const receipt = `rcpt_${bookingId}_${Date.now().toString().slice(-6)}`;

    if (!key_id || !key_secret || !instance) {
      return {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        status: 'created',
      };
    }

    try {
      const order = await instance.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: { bookingId },
      });
      return order;
    } catch (error) {
      console.warn('Razorpay API error, falling back to mock payment order:', error);
      return {
        id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        status: 'created',
      };
    }
  }

  /**
   * Verify signature of Razorpay payment
   */
  static verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): boolean {
    const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
    const isMock =
      (razorpayOrderId && razorpayOrderId.startsWith('order_mock_')) ||
      (razorpayPaymentId && razorpayPaymentId.startsWith('pay_mock_'));

    if (isMock) {
      if (isProduction) {
        console.warn(
          `[Security] Rejected mock payment identifier in production environment: order=${razorpayOrderId}, payment=${razorpayPaymentId}`
        );
        return false;
      }
      // Only permit mock verification in development or test if explicitly allowed
      const allowMock =
        process.env.ALLOW_MOCK_PAYMENTS === 'true' ||
        process.env.NODE_ENV === 'test' ||
        process.env.NODE_ENV === 'development';
      return allowMock;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || key_secret;
    if (!secret || !razorpaySignature || !razorpayOrderId || !razorpayPaymentId) {
      return false;
    }

    try {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      const genBuf = Buffer.from(generatedSignature, 'utf8');
      const sigBuf = Buffer.from(razorpaySignature, 'utf8');

      if (genBuf.length !== sigBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(genBuf, sigBuf);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
}
