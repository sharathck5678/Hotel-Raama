import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama');
    const res = await RoomType.updateMany(
      { $or: [{ code: 'SUITE_ROOM' }, { name: { $regex: /Suite/i } }] },
      { $set: { images: ['/suite-room.png'] } }
    );
    console.log('Updated Suite Room in MongoDB:', res);
    const item = await RoomType.findOne({ code: 'SUITE_ROOM' });
    console.log('Current DB item image:', item?.images);
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error updating suite room type image:', e);
  }
})();
