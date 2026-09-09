import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama');
    const res = await RoomType.updateMany(
      { $or: [{ code: 'PREM_SGL_NONAC' }, { code: 'EXEC_SGL_AC' }, { name: { $regex: /Single/i } }] },
      { $set: { images: ['/single-occupancy-room.png', '/hotel-corridor.jpg', '/single-room-angle.jpg'] } }
    );
    console.log('Updated Single Occupancy Rooms in MongoDB:', res);
    const items = await RoomType.find({ code: { $in: ['PREM_SGL_NONAC', 'EXEC_SGL_AC'] } });
    console.log('Current DB items:', items.map(i => ({ code: i.code, name: i.name, images: i.images })));
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error updating single room type images:', e);
  }
})();
