"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RazorpayService = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';
let instance = null;
if (key_id && key_secret) {
    try {
        instance = new razorpay_1.default({
            key_id,
            key_secret,
        });
    }
    catch (e) {
        console.warn('Razorpay SDK initialization notice: running in mock fallback mode.');
    }
}
class RazorpayService {
    /**
     * Create an order in Razorpay (or generate a mock order ID in test mode)
     */
    static async createOrder(amountInRupees, bookingId) {
        const amountInPaise = Math.round(amountInRupees * 100);
        const receipt = `rcpt_${bookingId}_${Date.now().toString().slice(-6)}`;
        if (!key_id || !key_secret || !instance) {
            return {
                id: `order_mock_${crypto_1.default.randomBytes(8).toString('hex')}`,
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
        }
        catch (error) {
            console.warn('Razorpay API error, falling back to mock payment order:', error);
            return {
                id: `order_mock_${crypto_1.default.randomBytes(8).toString('hex')}`,
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
    static verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';
        const isMock = (razorpayOrderId && razorpayOrderId.startsWith('order_mock_')) ||
            (razorpayPaymentId && razorpayPaymentId.startsWith('pay_mock_'));
        if (isMock) {
            if (isProduction) {
                console.warn(`[Security] Rejected mock payment identifier in production environment: order=${razorpayOrderId}, payment=${razorpayPaymentId}`);
                return false;
            }
            // Only permit mock verification in development or test if explicitly allowed
            const allowMock = process.env.ALLOW_MOCK_PAYMENTS === 'true' ||
                process.env.NODE_ENV === 'test' ||
                process.env.NODE_ENV === 'development';
            return allowMock;
        }
        const secret = process.env.RAZORPAY_KEY_SECRET || key_secret;
        if (!secret || !razorpaySignature || !razorpayOrderId || !razorpayPaymentId) {
            return false;
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');
            const genBuf = Buffer.from(generatedSignature, 'utf8');
            const sigBuf = Buffer.from(razorpaySignature, 'utf8');
            if (genBuf.length !== sigBuf.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(genBuf, sigBuf);
        }
        catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
    /**
     * Verify Razorpay webhook signature using HMAC SHA256 over raw request body
     */
    static verifyWebhookSignature(rawBody, signature, secret) {
        const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret || !signature || !rawBody) {
            return false;
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');
            const genBuf = Buffer.from(generatedSignature, 'utf8');
            const sigBuf = Buffer.from(signature, 'utf8');
            if (genBuf.length !== sigBuf.length) {
                return false;
            }
            return crypto_1.default.timingSafeEqual(genBuf, sigBuf);
        }
        catch (error) {
            console.error('[RazorpayService] Webhook signature verification error:', error);
            return false;
        }
    }
}
exports.RazorpayService = RazorpayService;
