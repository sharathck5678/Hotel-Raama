import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Attraction } from '../models/Attraction';

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hotel_raama');
    const res = await Attraction.updateMany(
      { name: { $regex: /Bisle/i } },
      { $set: { image: '/bisle-ghat.png' } }
    );
    console.log('Updated Bisle Ghat in MongoDB:', res);
    const item = await Attraction.findOne({ name: { $regex: /Bisle/i } });
    console.log('Current DB item image:', item?.image);
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error updating attraction:', e);
  }
})();
