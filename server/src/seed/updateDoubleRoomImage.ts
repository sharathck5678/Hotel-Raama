import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama');
    const res = await RoomType.updateMany(
      { $or: [{ code: 'PREM_DBL_NONAC' }, { code: 'EXEC_DBL_AC' }, { name: { $regex: /Double/i } }] },
      { $set: { images: ['/double-occupancy-room.png'] } }
    );
    console.log('Updated Double Occupancy Rooms in MongoDB:', res);
    const items = await RoomType.find({ code: { $in: ['PREM_DBL_NONAC', 'EXEC_DBL_AC'] } });
    console.log('Current DB items:', items.map(i => ({ code: i.code, name: i.name, images: i.images })));
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error updating double room type images:', e);
  }
})();
