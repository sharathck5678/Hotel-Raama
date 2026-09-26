import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { Booking } from '../models/Booking';
import { Room } from '../models/Room';
import { RoomType } from '../models/RoomType';
import { MenuItem } from '../models/MenuItem';
import { Order } from '../models/Order';
import { RazorpayService } from '../services/RazorpayService';
import { EmailService } from '../services/EmailService';
import { isOriginAllowed } from '../utils/corsConfig';
import { PublicController } from '../controllers/publicController';
import { QrController } from '../controllers/qrController';
import { AdminController } from '../controllers/adminController';
import { runEmailRetryCheck } from '../jobs/EmailRetryJob';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(suite: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ suite, name, passed, details, error });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}${details ? ` -> ${details}` : ''}`);
  if (error) console.error(`       Error: ${error}`);
}

async function runAllTests() {
  console.log('====================================================');
  console.log('HOTEL RAAMA COMPREHENSIVE PRODUCTION VERIFICATION');
  console.log('====================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('[Setup] Connected to MongoDB.\n');

  const roomType = await RoomType.findOne();
  if (!roomType) {
    throw new Error('No RoomType found in DB. Please run seed.');
  }

  // Find or create test room
  let room = await Room.findOne({ roomTypeId: roomType._id });
  if (!room) {
    room = await Room.create({
      roomNumber: 'TEST-101',
      roomTypeId: roomType._id,
      floor: 1,
      status: 'AVAILABLE',
      isActive: true,
      qrToken: 'test_qr_101',
    });
  }

  // =========================================================================
  // 1. PAYMENT VERIFICATION TESTS (A, B, C, D)
  // =========================================================================
  const testSecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_for_suite';
  process.env.RAZORPAY_KEY_SECRET = testSecret;

  // A. Valid payment verification
  try {
    const validBookingId = `HR-TEST-VAL-${Date.now()}`;
    const validOrderId = `order_test_${Date.now()}`;
    const validPaymentId = `pay_test_${Date.now()}`;
    const validSig = crypto
      .createHmac('sha256', testSecret)
      .update(`${validOrderId}|${validPaymentId}`)
      .digest('hex');

    await Booking.create({
      bookingId: validBookingId,
      guestName: 'Arun Sharma',
      guestEmail: 'test.guest@example.com',
      guestPhone: '9876543210',
      roomTypeId: roomType._id,
      assignedRoomId: room._id,
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 172800000),
      numGuests: 2,
      numNights: 1,
      roomPricePerNightSnapshot: 2500,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 300,
      totalAmount: 2800,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      razorpayOrderId: validOrderId,
      trackingToken: `trk_val_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900000),
    });

    let resStatus = 200;
    let resBody: any = null;
    const reqA: any = {
      body: {
        bookingId: validBookingId,
        razorpayOrderId: validOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSig,
      },
    };
    const resA: any = {
      status: (code: number) => { resStatus = code; return resA; },
      json: (data: any) => { resBody = data; return resA; },
    };

    await PublicController.verifyPayment(reqA, resA);
    const updatedA = await Booking.findOne({ bookingId: validBookingId });

    const passedA = resBody?.success === true && updatedA?.bookingStatus === 'CONFIRMED' && updatedA?.paymentStatus === 'PAID';
    record('Payment Verification', 'A. Valid payment verification transitions to CONFIRMED & PAID', passedA, `Status: ${updatedA?.bookingStatus}, Payment: ${updatedA?.paymentStatus}`);
  } catch (err: any) {
    record('Payment Verification', 'A. Valid payment verification', false, undefined, err.message);
  }

  // B. Invalid signature
  try {
    const invBookingId = `HR-TEST-INV-${Date.now()}`;
    const invOrderId = `order_inv_${Date.now()}`;
    const invPaymentId = `pay_inv_${Date.now()}`;
    const badSig = 'tampered_invalid_signature_hex_12345';

    await Booking.create({
      bookingId: invBookingId,
      guestName: 'Fraud Attempter',
      guestEmail: 'fraud@example.com',
      guestPhone: '9876543211',
      roomTypeId: roomType._id,
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 172800000),
      numGuests: 1,
      numNights: 1,
      roomPricePerNightSnapshot: 2500,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 300,
      totalAmount: 2800,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      razorpayOrderId: invOrderId,
      trackingToken: `trk_inv_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900000),
    });

    let resStatusB = 200;
    let resBodyB: any = null;
    const reqB: any = {
      body: {
        bookingId: invBookingId,
        razorpayOrderId: invOrderId,
        razorpayPaymentId: invPaymentId,
        razorpaySignature: badSig,
      },
    };
    const resB: any = {
      status: (code: number) => { resStatusB = code; return resB; },
      json: (data: any) => { resBodyB = data; return resB; },
    };

    await PublicController.verifyPayment(reqB, resB);
    const updatedB = await Booking.findOne({ bookingId: invBookingId });

    const passedB = resStatusB === 400 && resBodyB?.success === false && updatedB?.bookingStatus === 'CANCELLED' && updatedB?.paymentStatus === 'FAILED';
    record('Payment Verification', 'B. Invalid signature rejected with HTTP 400 and cancelled', passedB, `resStatus: ${resStatusB}, BookingStatus: ${updatedB?.bookingStatus}`);
  } catch (err: any) {
    record('Payment Verification', 'B. Invalid signature', false, undefined, err.message);
  }

  // C. Backend unavailable / client error handling simulation
  try {
    const clientApiSource = fs.readFileSync(path.resolve(__dirname, '../../../client/src/services/api.ts'), 'utf8');
    const hasFakeCatch = /catch.*paymentStatus.*=.*['"]PAID['"]/s.test(clientApiSource) || /mock_payment_token/i.test(clientApiSource);
    record('Payment Verification', 'C. Backend unavailable does NOT create fake success in client', !hasFakeCatch, 'Fake success fallback removed from api.ts');
  } catch (err: any) {
    record('Payment Verification', 'C. Backend unavailable test', false, undefined, err.message);
  }

  // D. Malformed payment response
  try {
    let resStatusD = 200;
    let resBodyD: any = null;
    const reqD: any = {
      body: {
        bookingId: 'some_booking',
      },
    };
    const resD: any = {
      status: (code: number) => { resStatusD = code; return resD; },
      json: (data: any) => { resBodyD = data; return resD; },
    };

    await PublicController.verifyPayment(reqD, resD);
    const passedD = resStatusD === 400 && resBodyD?.success === false;
    record('Payment Verification', 'D. Malformed payment request rejected with HTTP 400', passedD, `resStatus: ${resStatusD}`);
  } catch (err: any) {
    record('Payment Verification', 'D. Malformed payment response', false, undefined, err.message);
  }

  // =========================================================================
  // 2. FOOD ORDER PRICE MANIPULATION & INVALID MENU ITEM TESTS
  // =========================================================================
  const menuItem = await MenuItem.findOne({ isAvailable: true });
  if (!menuItem) {
    throw new Error('No available MenuItem found in DB. Please run seed.');
  }

  const realDbPrice = menuItem.price;
  console.log(`[Setup] Testing with MenuItem: "${menuItem.name}" (Real DB price: ₹${realDbPrice})`);

  // Manipulated request with price = 1
  try {
    let resStatusFood = 200;
    let resBodyFood: any = null;
    const reqFood: any = {
      body: {
        roomNumber: '101',
        guestName: 'Test Foodie',
        guestPhone: '9876543210',
        items: [
          {
            menuItemId: menuItem._id.toString(),
            quantity: 2,
            price: 1, // Manipulated
            price60ml: 1, // Manipulated
          },
        ],
        subtotal: 2, // Manipulated
        tax: 0, // Manipulated
        total: 2, // Manipulated
      },
    };
    const resFood: any = {
      status: (code: number) => { resStatusFood = code; return resFood; },
      json: (data: any) => { resBodyFood = data; return resFood; },
    };

    await QrController.createOrder(reqFood, resFood);

    const createdOrder = await Order.findOne({ orderId: resBodyFood?.data?.orderId });
    const expectedSubtotal = realDbPrice * 2;
    const expectedTotal = expectedSubtotal;

    const priceManipIgnored = createdOrder?.totalAmount === expectedTotal && createdOrder?.items[0].price === realDbPrice;
    record(
      'Food Pricing Security',
      'Client price manipulation ignored - 100% server calculated from DB',
      priceManipIgnored,
      `Expected total ₹${expectedTotal}, stored total ₹${createdOrder?.totalAmount}, item line price ₹${createdOrder?.items[0].price}`
    );
  } catch (err: any) {
    record('Food Pricing Security', 'Price manipulation test', false, undefined, err.message);
  }

  // Non-existent menu item request
  try {
    let resStatusNonExistent = 200;
    let resBodyNonExistent: any = null;
    const reqNonExistent: any = {
      body: {
        roomNumber: '101',
        guestName: 'Hacker',
        guestPhone: '9876543210',
        items: [
          {
            menuItemId: new mongoose.Types.ObjectId().toString(), // Non-existent ID
            quantity: 1,
            price: 1,
          },
        ],
      },
    };
    const resNonExistent: any = {
      status: (code: number) => { resStatusNonExistent = code; return resNonExistent; },
      json: (data: any) => { resBodyNonExistent = data; return resNonExistent; },
    };

    await QrController.createOrder(reqNonExistent, resNonExistent);
    const nonExistentRejected = resStatusNonExistent === 400 && resBodyNonExistent?.success === false;
    record(
      'Food Pricing Security',
      'Non-existent menu item rejected with HTTP 400 (no order created)',
      nonExistentRejected,
      `Status: ${resStatusNonExistent}, Message: "${resBodyNonExistent?.message}"`
    );
  } catch (err: any) {
    record('Food Pricing Security', 'Non-existent item test', false, undefined, err.message);
  }

  // =========================================================================
  // 3. THIRD-PARTY DATA RELAYS CHECK
  // =========================================================================
  try {
    const checkFileForRelays = (filePath: string) => {
      const content = fs.readFileSync(filePath, 'utf8');
      return /ws\.postman-echo\.com/i.test(content) || /kvdb\.io/i.test(content) || /CLOUD_SYNC_URL/i.test(content);
    };

    const localStoreRelay = checkFileForRelays(path.resolve(__dirname, '../../../client/src/services/localStore.ts'));
    const cloudRelayServiceRelay = checkFileForRelays(path.resolve(__dirname, '../../../client/src/services/cloudRelayService.ts'));
    const orderTrackingRelay = checkFileForRelays(path.resolve(__dirname, '../../../client/src/pages/OrderTrackingPage.tsx'));

    const allClean = !localStoreRelay && !cloudRelayServiceRelay && !orderTrackingRelay;
    record(
      'Third-Party Relays',
      'Zero production usage of postman-echo, kvdb.io, and CLOUD_SYNC_URL',
      allClean,
      'Verified in localStore, cloudRelayService, and OrderTrackingPage'
    );
  } catch (err: any) {
    record('Third-Party Relays', 'Relay verification', false, undefined, err.message);
  }

  // =========================================================================
  // 4. FRONTEND ADMIN PASSWORD & ADMIN AUTHENTICATION CHECK
  // =========================================================================
  try {
    const clientEnv = fs.existsSync(path.resolve(__dirname, '../../../client/.env'))
      ? fs.readFileSync(path.resolve(__dirname, '../../../client/.env'), 'utf8')
      : '';
    const clientEnvExample = fs.existsSync(path.resolve(__dirname, '../../../client/.env.example'))
      ? fs.readFileSync(path.resolve(__dirname, '../../../client/.env.example'), 'utf8')
      : '';

    const hasAdminPwdInEnv = /VITE_ADMIN_PASSWORD/i.test(clientEnv) || /VITE_ADMIN_PASSWORD/i.test(clientEnvExample);
    record(
      'Frontend Security',
      'No VITE_ADMIN_PASSWORD in client .env or .env.example',
      !hasAdminPwdInEnv,
      'Admin credentials exclusively handled via POST /api/admin/login'
    );

    // Test Admin Login Endpoint
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hotelraama.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminRaama@2026';

    let loginResStatus = 200;
    let loginResBody: any = null;
    const loginReq: any = {
      body: {
        email: adminEmail,
        password: adminPassword,
      },
    };
    const loginRes: any = {
      status: (code: number) => { loginResStatus = code; return loginRes; },
      cookie: () => loginRes,
      json: (data: any) => { loginResBody = data; return loginRes; },
    };

    await AdminController.login(loginReq, loginRes);
    const loginPassed = loginResStatus === 200 && loginResBody?.success === true && !!loginResBody?.data?.token;
    record(
      'Admin Authentication',
      'POST /api/admin/login issues JWT token with valid server-stored credentials',
      loginPassed,
      `Token issued: ${!!loginResBody?.data?.token}, Role: ${loginResBody?.data?.admin?.role}`
    );
  } catch (err: any) {
    record('Admin Authentication', 'Admin login test', false, undefined, err.message);
  }

  // =========================================================================
  // 5. RESTRICTED CORS VERIFICATION
  // =========================================================================
  try {
    const prodAllowedWorkers = isOriginAllowed('https://hotel-raama.hotelraama5.workers.dev');
    const prodAllowedWorkersTrailing = isOriginAllowed('https://hotel-raama.hotelraama5.workers.dev/');
    const devAllowedLocalhost = isOriginAllowed('http://localhost:5173');
    const serverToServerAllowed = isOriginAllowed(undefined);

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prodRejectedAttacker = !isOriginAllowed('https://malicious-attacker-domain.com');
    const prodRejectedLocalhost = !isOriginAllowed('http://localhost:5173');
    process.env.NODE_ENV = prevEnv;

    const corsPassed = prodAllowedWorkers && prodAllowedWorkersTrailing && devAllowedLocalhost && serverToServerAllowed && prodRejectedAttacker && prodRejectedLocalhost;
    record(
      'CORS Restriction',
      'Production CORS restricts strictly to authorized domains while dev permits localhost',
      corsPassed,
      'Workers.dev permitted, arbitrary origins blocked in production'
    );
  } catch (err: any) {
    record('CORS Restriction', 'CORS origin testing', false, undefined, err.message);
  }

  // =========================================================================
  // 6. RAZORPAY WEBHOOK RECONCILIATION & IDEMPOTENCY
  // =========================================================================
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_test_webhook_sec_123';
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  try {
    const whBookingId = `HR-WH-TEST-${Date.now()}`;
    const whOrderId = `order_wh_${Date.now()}`;
    const whPaymentId = `pay_wh_${Date.now()}`;

    await Booking.create({
      bookingId: whBookingId,
      guestName: 'Webhook Guest',
      guestEmail: 'wh.guest@example.com',
      guestPhone: '9876543212',
      roomTypeId: roomType._id,
      assignedRoomId: room._id,
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 172800000),
      numGuests: 2,
      numNights: 1,
      roomPricePerNightSnapshot: 3000,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 360,
      totalAmount: 3360,
      bookingStatus: 'PENDING',
      paymentStatus: 'PENDING',
      razorpayOrderId: whOrderId,
      trackingToken: `trk_wh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 900000),
    });

    const whPayload = {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: whPaymentId,
            order_id: whOrderId,
            amount: 336000,
            status: 'captured',
            notes: { bookingId: whBookingId },
          },
        },
      },
    };

    const rawBodyBuffer = Buffer.from(JSON.stringify(whPayload));
    const validWhSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBodyBuffer)
      .digest('hex');

    // 1. Send valid webhook
    let whResStatus = 200;
    let whResBody: any = null;
    const whReq: any = {
      headers: { 'x-razorpay-signature': validWhSig },
      rawBody: rawBodyBuffer,
      body: whPayload,
    };
    const whRes: any = {
      status: (code: number) => { whResStatus = code; return whRes; },
      json: (data: any) => { whResBody = data; return whRes; },
    };

    await PublicController.handleRazorpayWebhook(whReq, whRes);
    const reconciledBooking = await Booking.findOne({ bookingId: whBookingId });

    const whSuccess = whResStatus === 200 && whResBody?.success === true && reconciledBooking?.bookingStatus === 'CONFIRMED' && reconciledBooking?.paymentStatus === 'PAID';
    record('Razorpay Webhook', 'Valid webhook reconciles PENDING booking to CONFIRMED & PAID', whSuccess, `BookingStatus: ${reconciledBooking?.bookingStatus}`);

    // 2. Test Idempotency (replay exact same webhook)
    let replayResStatus = 200;
    let replayResBody: any = null;
    const replayRes: any = {
      status: (code: number) => { replayResStatus = code; return replayRes; },
      json: (data: any) => { replayResBody = data; return replayRes; },
    };
    await PublicController.handleRazorpayWebhook(whReq, replayRes);
    const replayPassed = replayResStatus === 200 && replayResBody?.message === 'Booking already confirmed.';
    record('Razorpay Webhook', 'Duplicate webhook handled idempotently without error', replayPassed, `Replay response: "${replayResBody?.message}"`);

    // 3. Test Invalid Webhook Signature
    let badWhStatus = 200;
    let badWhBody: any = null;
    const badWhReq: any = {
      headers: { 'x-razorpay-signature': 'bad_fake_sig_123' },
      rawBody: rawBodyBuffer,
      body: whPayload,
    };
    const badWhRes: any = {
      status: (code: number) => { badWhStatus = code; return badWhRes; },
      json: (data: any) => { badWhBody = data; return badWhRes; },
    };
    await PublicController.handleRazorpayWebhook(badWhReq, badWhRes);
    const badSigRejected = badWhStatus === 400 && badWhBody?.success === false;
    record('Razorpay Webhook', 'Invalid webhook signature rejected with HTTP 400', badSigRejected, `Status: ${badWhStatus}`);
  } catch (err: any) {
    record('Razorpay Webhook', 'Webhook reconciliation test', false, undefined, err.message);
  }

  // =========================================================================
  // 7. DATABASE INDEX FOR razorpayOrderId
  // =========================================================================
  try {
    const indexes = await Booking.collection.indexes();
    const hasRazorpayOrderIndex = indexes.some((idx: any) => idx.key?.razorpayOrderId === 1);
    record(
      'Database Indexing',
      'MongoDB index on Booking.razorpayOrderId is active',
      hasRazorpayOrderIndex,
      `Found indexes: ${indexes.map((i: any) => Object.keys(i.key).join('_')).join(', ')}`
    );
  } catch (err: any) {
    record('Database Indexing', 'Index check', false, undefined, err.message);
  }

  // =========================================================================
  // 8. EMAIL DELIVERY, DUPLICATION, AND FAILURE/RETRY TESTS
  // =========================================================================
  try {
    // Live Booking Email Test using configured hotelraama.hsn@gmail.com
    const liveBookingId = `HR-LIVE-${Date.now().toString().slice(-4)}`;
    const liveBooking = await Booking.create({
      bookingId: liveBookingId,
      guestName: 'Sharath Kumar',
      guestEmail: process.env.HOTEL_NOTIFICATION_EMAIL || 'hotelraama.hsn@gmail.com',
      guestPhone: '7899511330',
      roomTypeId: roomType._id,
      assignedRoomId: room._id,
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 172800000),
      numGuests: 2,
      numNights: 1,
      roomPricePerNightSnapshot: 3200,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 384,
      totalAmount: 3584,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      razorpayOrderId: `order_live_${Date.now()}`,
      razorpayPaymentId: `pay_live_${Date.now()}`,
      trackingToken: `trk_live_${Date.now()}`,
    });

    console.log(`[Email Verification] Dispatching live email for ${liveBookingId}...`);
    await EmailService.processBookingEmails(liveBooking._id.toString());

    const updatedLiveBooking = await Booking.findById(liveBooking._id);
    const guestStatus = updatedLiveBooking?.guestConfirmationStatus;
    const hotelStatus = updatedLiveBooking?.hotelNotificationStatus;
    const emailSentAt = updatedLiveBooking?.emailSentAt;
    const initialAttempts = updatedLiveBooking?.notificationAttempts || 0;

    const emailSentSuccess = guestStatus === 'SENT' && hotelStatus === 'SENT' && !!emailSentAt;
    record(
      'Email System',
      'Live customer & hotel email dispatch via Gmail SMTP with PDF attachment',
      emailSentSuccess,
      `Guest status: ${guestStatus}, Hotel status: ${hotelStatus}, SentAt: ${emailSentAt}`
    );

    // Duplication Test: Call processBookingEmails again
    await EmailService.processBookingEmails(liveBooking._id.toString());
    const afterDuplicateBooking = await Booking.findById(liveBooking._id);
    const duplicateAttempts = afterDuplicateBooking?.notificationAttempts || 0;
    const duplicatePrevented =
      duplicateAttempts === initialAttempts &&
      afterDuplicateBooking?.guestConfirmationStatus === 'SENT' &&
      afterDuplicateBooking?.hotelNotificationStatus === 'SENT';
    record(
      'Email System',
      'Duplicate email prevention - repeated processBookingEmails does not re-send',
      duplicatePrevented,
      `Attempts remained unchanged at ${duplicateAttempts}`
    );

    // Failure & Retry Test
    const failBookingId = `HR-RETRY-${Date.now().toString().slice(-4)}`;
    const failBooking = await Booking.create({
      bookingId: failBookingId,
      guestName: 'Retry Candidate',
      guestEmail: process.env.HOTEL_NOTIFICATION_EMAIL || 'hotelraama.hsn@gmail.com',
      guestPhone: '7899511330',
      roomTypeId: roomType._id,
      checkIn: new Date(Date.now() + 86400000),
      checkOut: new Date(Date.now() + 172800000),
      numGuests: 1,
      numNights: 1,
      roomPricePerNightSnapshot: 2000,
      discountAmountSnapshot: 0,
      taxAmountSnapshot: 240,
      totalAmount: 2240,
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      razorpayOrderId: `order_retry_${Date.now()}`,
      razorpayPaymentId: `pay_retry_${Date.now()}`,
      trackingToken: `trk_retry_${Date.now()}`,
      guestConfirmationStatus: 'FAILED',
      guestConfirmationError: 'Simulated SMTP connection drop',
      hotelNotificationStatus: 'SENT',
      notificationAttempts: 1,
    });

    console.log(`[Email Retry] Triggering runEmailRetryCheck() for booking ${failBookingId}...`);
    const recoveredCount = await runEmailRetryCheck();

    const retriedBooking = await Booking.findById(failBooking._id);
    const retrySucceeded = retriedBooking?.guestConfirmationStatus === 'SENT';
    record(
      'Email System',
      'runEmailRetryCheck successfully recovers FAILED email notifications to SENT',
      retrySucceeded,
      `Status after retry: ${retriedBooking?.guestConfirmationStatus}, Attempts: ${retriedBooking?.notificationAttempts}, Recovered count: ${recoveredCount}`
    );
  } catch (err: any) {
    record('Email System', 'Email live delivery and retry test', false, undefined, err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n====================================================');
  console.log('TEST SUMMARY');
  console.log('====================================================');
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passedCount}`);
  console.log(`Failed      : ${failedCount}`);
  console.log('====================================================\n');

  await mongoose.disconnect();
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
