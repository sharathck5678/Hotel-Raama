import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama');
    const res = await RoomType.updateMany(
      { $or: [{ code: 'TRIPLE_EXEC' }, { code: 'TRIPLE_PREM' }, { name: { $regex: /Triple/i } }] },
      { $set: { images: ['/triple-occupancy-ac.png'] } }
    );
    console.log('Updated Triple Occupancy Rooms in MongoDB:', res);
    const items = await RoomType.find({ code: { $in: ['TRIPLE_EXEC', 'TRIPLE_PREM'] } });
    console.log('Current DB items:', items.map(i => ({ code: i.code, name: i.name, images: i.images })));
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error updating room type image:', e);
  }
})();
