import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomType } from '../models/RoomType';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

const NEW_FACILITIES = [
  'Iron/Iron Boarding',
  'Laundry Service',
  '24Hour Hot Water',
  'Free Wifi',
  'Tv',
  'Kettle',
];

async function updateFacilities() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const res = await RoomType.updateMany({}, { $set: { amenities: NEW_FACILITIES } });
  console.log(`Updated ${res.modifiedCount} room types with new facilities.`);

  const allRoomTypes = await RoomType.find({ isActive: true });
  for (const rt of allRoomTypes) {
    console.log(`- ${rt.name}:`, rt.amenities);
  }

  await mongoose.disconnect();
}

updateFacilities().catch((err) => {
  console.error(err);
  process.exit(1);
});
