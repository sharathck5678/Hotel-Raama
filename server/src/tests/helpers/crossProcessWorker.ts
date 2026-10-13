import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { AdminController } from '../../controllers/adminController';
import { Booking } from '../../models/Booking';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';
const JWT_SECRET = process.env.JWT_SECRET || 'raama_super_secret_jwt_key_2026_production';

async function main() {
  const [,, bookingId, targetRoomId] = process.argv;
  if (!bookingId || !targetRoomId) {
    console.error(JSON.stringify({ error: 'Missing bookingId or targetRoomId' }));
    process.exit(2);
  }

  await mongoose.connect(MONGODB_URI);

  const testAdmin = {
    id: new Types.ObjectId().toString(),
    email: 'childprocess@hotelraama.com',
    role: 'ADMIN',
  };

  const req: any = {
    body: { targetRoomId },
    params: { id: bookingId },
    admin: testAdmin,
    headers: {},
    ip: '127.0.0.1',
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: any) {
      responseData = payload;
      return this;
    },
  };

  try {
    await AdminController.reassignBookingRoom(req, res);
    console.log(JSON.stringify({ statusCode, success: responseData?.success, message: responseData?.message }));
  } catch (err: any) {
    console.error(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
