import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app, httpServer } from '../index';
import mongoose from 'mongoose';
import { RoomType } from '../models/RoomType';

describe('Hotel Raama Coupon HTTP API Authoritative Validation Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let testRoomTypeId: string;
  const validGstin = '22AAAAA0000A1Z5';

  before(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    const rt = (await RoomType.findOne({ code: 'EXEC_DBL_AC' })) || (await RoomType.findOne());
    if (rt) {
      testRoomTypeId = rt._id.toString();
    }
  });

  after(async () => {
    await new Promise((r) => setTimeout(r, 400));
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    await mongoose.connection.close();
    setTimeout(() => process.exit(0), 50);
  });

  it('1. WELCOME10 is strictly rejected by backend (HTTP 400, "Invalid coupon code.")', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME10' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid coupon code.');
  });

  it('2. Direct booking API request with WELCOME10 yields 0 discount', async () => {
    if (!testRoomTypeId) return;
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: testRoomTypeId,
        checkIn: '2026-12-10',
        checkOut: '2026-12-11',
        numGuests: 2,
        couponCode: 'WELCOME10',
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.pricing.couponCode, undefined);
    assert.equal(body.data.pricing.discountAmount, 0);
  });

  it('3. PREMIUM15 succeeds without GSTIN (HTTP 200, 15% discount)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'PREMIUM15' }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'PREMIUM15');
    assert.equal(body.data.discountPercentage, 15);
  });

  it('4. GRAND20 without GSTIN is rejected by backend (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'GSTIN is required to apply this coupon.');
  });

  it('5. GRAND20 with invalid format GSTIN is rejected by backend (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20', gstin: 'INVALID123' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Please enter a valid GSTIN.');
  });

  it('6. GRAND20 with invalid checksum GSTIN is rejected by backend (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20', gstin: '29ABCDE1234F1Z0' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Please enter a valid GSTIN.');
  });

  it('7. GRAND20 with valid GSTIN succeeds (HTTP 200, 20% discount)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'GRAND20', gstin: validGstin }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'GRAND20');
    assert.equal(body.data.discountPercentage, 20);
    assert.equal(body.data.gstin, validGstin);
    assert.equal(body.data.gstinValid, true);
  });

  it('8. MEGA25 without GSTIN is rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'MEGA25' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'GSTIN is required to apply this coupon.');
  });

  it('9. PLATINUM30 without GSTIN is rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'PLATINUM30' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'GSTIN is required to apply this coupon.');
  });

  it('10. MEGA25 with valid GSTIN succeeds (HTTP 200, 25% discount)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'MEGA25', gstin: validGstin }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'MEGA25');
    assert.equal(body.data.discountPercentage, 25);
  });

  it('11. PLATINUM30 with valid GSTIN succeeds (HTTP 200, 30% discount)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'PLATINUM30', gstin: validGstin }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'PLATINUM30');
    assert.equal(body.data.discountPercentage, 30);
  });

  it('12. Inactive WELCOME15 is strictly rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'WELCOME15', gstin: validGstin }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid coupon code.');
  });

  it('13. Arbitrary coupon code is strictly rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'DISCOUNT50', gstin: validGstin }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Invalid coupon code.');
  });

  it('14. Coupon stacking attempt is rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: 'PREMIUM15,GRAND20' }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Only one coupon can be applied per booking.');
  });

  it('15. Case insensitivity and whitespace trimming for GRAND20', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couponCode: '   grand20   ', gstin: `  ${validGstin.toLowerCase()}  ` }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.couponCode, 'GRAND20');
    assert.equal(body.data.discountPercentage, 20);
    assert.equal(body.data.gstin, validGstin);
  });
});
