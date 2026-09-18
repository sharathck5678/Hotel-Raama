import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HotelSetting } from '../models/HotelSetting';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

async function updateHotelContact() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected successfully.');

    const updated = await HotelSetting.findOneAndUpdate(
      {},
      {
        $set: {
          phone: '+91 78995 11330',
          email: 'hotelraama.hsn@gmail.com',
          receptionWhatsapp: '917899511330',
        },
      },
      { new: true, upsert: true }
    );

    console.log('[HotelSetting] Updated contact details:', {
      phone: updated.phone,
      email: updated.email,
      receptionWhatsapp: updated.receptionWhatsapp,
    });

    const db = mongoose.connection.db;
    if (db) {
      const roomRes = await db.collection('rooms').updateMany(
        { roomNumber: /sambhrama/i },
        { $set: { roomNumber: 'Sambhrama Banquet Hall' } }
      );
    }

    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected.');
    process.exit(0);
  } catch (err) {
    console.error('[Error] Failed to update hotel contact:', err);
    process.exit(1);
  }
}

updateHotelContact();
