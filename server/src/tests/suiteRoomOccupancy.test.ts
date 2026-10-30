import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app, httpServer } from '../index';
import mongoose from 'mongoose';
import { RoomType } from '../models/RoomType';
import { Coupon } from '../models/Coupon';
import { PricingEngine } from '../services/PricingEngine';
import { validateRoomOccupancy } from '../utils/occupancyValidator';

describe('Suite Room Maximum Occupancy Restriction Tests', () => {
  let server: http.Server;
  let baseUrl: string;
  let suiteRoomTypeId: string;
  let execDblRoomTypeId: string;
  let tripleExecRoomTypeId: string;
  let premSglRoomTypeId: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Ensure database connection ready
    if (mongoose.connection.readyState !== 1) {
      await new Promise<void>((resolve) => {
        mongoose.connection.once('connected', () => resolve());
      });
    }

    // Ensure Suite Room maxOccupancy is 2 in DB
    await RoomType.updateOne({ code: 'SUITE_ROOM' }, { $set: { maxOccupancy: 2 } });

    // Ensure PREMIUM15 has valid dates
    await Coupon.updateOne(
      { code: 'PREMIUM15' },
      { $set: { startDate: new Date('2020-01-01'), endDate: new Date('2030-12-31'), isActive: true } }
    );

    const suiteRt = await RoomType.findOne({ code: 'SUITE_ROOM' });
    if (suiteRt) suiteRoomTypeId = suiteRt._id.toString();

    const execDblRt = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    if (execDblRt) execDblRoomTypeId = execDblRt._id.toString();

    const tripleExecRt = await RoomType.findOne({ code: 'TRIPLE_EXEC' });
    if (tripleExecRt) tripleExecRoomTypeId = tripleExecRt._id.toString();

    const premSglRt = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    if (premSglRt) premSglRoomTypeId = premSglRt._id.toString();
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

  it('1. Suite Room authoritative configuration: maxOccupancy is 2', async () => {
    const suiteRt = await RoomType.findOne({ code: 'SUITE_ROOM' });
    assert.ok(suiteRt, 'Suite Room must exist');
    assert.equal(suiteRt.maxOccupancy, 2, 'Suite Room authoritative maxOccupancy must be 2');
    assert.equal(suiteRt.basePrice, 3500, 'Suite Room basePrice must remain 3500');
    assert.equal(suiteRt.cpPrice, 4000, 'Suite Room cpPrice must remain 4000');
  });

  it('2. Central occupancyValidator utility validates Suite Room guest counts', () => {
    const suiteSpec = { code: 'SUITE_ROOM', name: 'Suite Room', maxOccupancy: 2 };
    assert.equal(validateRoomOccupancy(suiteSpec, 1).isValid, true);
    assert.equal(validateRoomOccupancy(suiteSpec, 2).isValid, true);

    const check3 = validateRoomOccupancy(suiteSpec, 3);
    assert.equal(check3.isValid, false);
    assert.equal(check3.message, 'Suite Room allows a maximum of 2 guests.');

    const check4 = validateRoomOccupancy(suiteSpec, 4);
    assert.equal(check4.isValid, false);
    assert.equal(check4.message, 'Suite Room allows a maximum of 2 guests.');
  });

  it('3. Suite Room with 1 guest: accepted by PricingEngine', async () => {
    const checkIn = new Date('2026-12-15');
    const checkOut = new Date('2026-12-16');
    const result = await PricingEngine.calculateBookingPrice(
      suiteRoomTypeId,
      checkIn,
      checkOut,
      1,
      undefined,
      undefined,
      'NON_CP',
      false
    );
    assert.ok(result, 'Calculation should succeed');
    assert.equal(result.roomPricePerNight, 3300); // Single occupancy: 3500 - 200 = 3300
    assert.equal(result.numNights, 1);
  });

  it('4. Suite Room with 2 guests: accepted by PricingEngine', async () => {
    const checkIn = new Date('2026-12-15');
    const checkOut = new Date('2026-12-16');
    const result = await PricingEngine.calculateBookingPrice(
      suiteRoomTypeId,
      checkIn,
      checkOut,
      2,
      undefined,
      undefined,
      'NON_CP',
      false
    );
    assert.ok(result, 'Calculation should succeed');
    assert.equal(result.roomPricePerNight, 3500); // Double occupancy base: 3500
    assert.equal(result.numNights, 1);
  });

  it('5. Suite Room with 3 guests: rejected by PricingEngine with clear error', async () => {
    const checkIn = new Date('2026-12-15');
    const checkOut = new Date('2026-12-16');
    await assert.rejects(
      async () => {
        await PricingEngine.calculateBookingPrice(
          suiteRoomTypeId,
          checkIn,
          checkOut,
          3,
          undefined,
          undefined,
          'NON_CP',
          false
        );
      },
      {
        name: 'Error',
        message: 'Suite Room allows a maximum of 2 guests.',
      }
    );
  });

  it('6. Suite Room with 4 guests: rejected by PricingEngine with clear error', async () => {
    const checkIn = new Date('2026-12-15');
    const checkOut = new Date('2026-12-16');
    await assert.rejects(
      async () => {
        await PricingEngine.calculateBookingPrice(
          suiteRoomTypeId,
          checkIn,
          checkOut,
          4,
          undefined,
          undefined,
          'NON_CP',
          false
        );
      },
      {
        name: 'Error',
        message: 'Suite Room allows a maximum of 2 guests.',
      }
    );
  });

  it('7. Direct backend API request for Suite Room with 1 guest: accepted (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 1,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.pricing.roomPricePerNight, 3300);
  });

  it('8. Direct backend API request for Suite Room with 2 guests: accepted (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 2,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.pricing.roomPricePerNight, 3500);
  });

  it('9. Direct backend API request for Suite Room with 3 guests: rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 3,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Suite Room allows a maximum of 2 guests.');
  });

  it('10. Direct backend API request for Suite Room with 4 guests: rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 4,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Suite Room allows a maximum of 2 guests.');
  });

  it('11. Direct booking creation request POST /api/bookings for Suite Room with 3 guests: rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: 'Unauthorized Guest Count',
        guestEmail: 'testguest@example.com',
        guestPhone: '9876543210',
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 3,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Suite Room allows a maximum of 2 guests.');
  });

  it('12. Direct coupon validation request POST /api/coupons/validate for Suite Room with 4 guests: rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        couponCode: 'PREMIUM15',
        roomTypeId: suiteRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 4,
      }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as any;
    assert.equal(body.success, false);
    assert.equal(body.message, 'Suite Room allows a maximum of 2 guests.');
  });

  it('13. Other room types retain their original maximum occupancies', async () => {
    const premSgl = await RoomType.findOne({ code: 'PREM_SGL_NONAC' });
    assert.equal(premSgl?.maxOccupancy, 1, 'Premium Single Non A/C must retain maxOccupancy: 1');

    const execSgl = await RoomType.findOne({ code: 'EXEC_SGL_AC' });
    assert.equal(execSgl?.maxOccupancy, 1, 'Executive Single A/C must retain maxOccupancy: 1');

    const premDbl = await RoomType.findOne({ code: 'PREM_DBL_NONAC' });
    assert.equal(premDbl?.maxOccupancy, 2, 'Premium Double Non A/C must retain maxOccupancy: 2');

    const execDbl = await RoomType.findOne({ code: 'EXEC_DBL_AC' });
    assert.equal(execDbl?.maxOccupancy, 2, 'Executive Double A/C must retain maxOccupancy: 2');

    const triplePrem = await RoomType.findOne({ code: 'TRIPLE_PREM' });
    assert.equal(triplePrem?.maxOccupancy, 3, 'Triple Occupancy Premium must retain maxOccupancy: 3');

    const tripleExec = await RoomType.findOne({ code: 'TRIPLE_EXEC' });
    assert.equal(tripleExec?.maxOccupancy, 3, 'Triple Occupancy Executive A/C must retain maxOccupancy: 3');
  });

  it('14. Triple Occupancy room still accepts 3 guests without rejection', async () => {
    const res = await fetch(`${baseUrl}/api/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomTypeId: tripleExecRoomTypeId,
        checkIn: '2026-12-15',
        checkOut: '2026-12-16',
        numGuests: 3,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.success, true);
    assert.equal(body.data.pricing.roomPricePerNight, 2800);
  });

  it('15. Suite Room pricing, CP plan, and GST flows continue working for valid guest counts', async () => {
    const checkIn = new Date('2026-12-15');
    const checkOut = new Date('2026-12-16');
    const cpResult = await PricingEngine.calculateBookingPrice(
      suiteRoomTypeId,
      checkIn,
      checkOut,
      2,
      undefined,
      undefined,
      'CP',
      false
    );
    assert.ok(cpResult);
    assert.equal(cpResult.roomPricePerNight, 4000); // CP plan tariff
    assert.equal(cpResult.taxAmount, 200); // 5% GST on 4000 = 200
    assert.equal(cpResult.totalAmount, 4200); // 4000 + 200 = 4200
  });
});
