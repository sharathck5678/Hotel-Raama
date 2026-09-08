import { Schema, model, Document } from 'mongoose';

export interface IHotelSetting extends Document {
  hotelName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  receptionWhatsapp: string;
  notificationEmail: string;
  taxPercentage: number;
  serviceChargePercentage: number;
  checkInTime: string;
  checkOutTime: string;
  bookingHoldMinutes: number;
  googleMapsLink: string;
  googleMapsEmbedUrl: string;
  updatedAt: Date;
}

const HotelSettingSchema = new Schema<IHotelSetting>(
  {
    hotelName: { type: String, required: true, default: 'Hotel Raama' },
    tagline: { type: String, default: 'Hospitality That Feels Like Home' },
    address: { type: String, required: true, default: 'B.M. Road, Thanneeruhalla' },
    city: { type: String, default: 'Hassan' },
    state: { type: String, default: 'Karnataka' },
    pincode: { type: String, default: '573201' },
    phone: { type: String, default: '081722 57001' },
    email: { type: String, default: 'reservations@hotelraama.com' },
    receptionWhatsapp: { type: String, default: '918172257001' },
    notificationEmail: { type: String, default: 'admin@hotelraama.com' },
    taxPercentage: { type: Number, default: 12 },
    serviceChargePercentage: { type: Number, default: 0 },
    checkInTime: { type: String, default: '12:00 PM' },
    checkOutTime: { type: String, default: '12:00 PM' },
    bookingHoldMinutes: { type: Number, default: 15 },
    googleMapsLink: { type: String, default: 'https://maps.app.goo.gl/ytRudLDAau6mBPKH8' },
    googleMapsEmbedUrl: { type: String, default: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3886.99408665792!2d76.0826807!3d12.9950762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba5485458021c3b%3A0x7d0259bdf1eef4f9!2sHotel%20Raama!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin' },
  },
  { timestamps: true }
);

export const HotelSetting = model<IHotelSetting>('HotelSetting', HotelSettingSchema);
