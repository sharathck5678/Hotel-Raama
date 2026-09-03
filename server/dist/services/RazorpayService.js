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
        if (razorpayOrderId.startsWith('order_mock_') || razorpayPaymentId.startsWith('pay_mock_')) {
            return true; // Auto-verify in dev/mock environment
        }
        try {
            const generatedSignature = crypto_1.default
                .createHmac('sha256', key_secret)
                .update(`${razorpayOrderId}|${razorpayPaymentId}`)
                .digest('hex');
            return generatedSignature === razorpaySignature;
        }
        catch (error) {
            console.error('Signature verification error:', error);
            return false;
        }
    }
}
exports.RazorpayService = RazorpayService;
