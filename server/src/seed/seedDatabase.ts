import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Admin } from '../models/Admin';
import { HotelSetting } from '../models/HotelSetting';
import { MealPlan } from '../models/MealPlan';
import { Coupon } from '../models/Coupon';
import { Attraction } from '../models/Attraction';
import { RoomType } from '../models/RoomType';
import { Room } from '../models/Room';
import { MenuCategory } from '../models/MenuCategory';
import { MenuItem } from '../models/MenuItem';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_raama';

const generateQrToken = (roomNum: string) => {
  const hash = crypto.createHash('sha256').update(`hotel_raama_room_${roomNum}_${Date.now()}_${Math.random()}`).digest('hex');
  return hash.substring(0, 16);
};

export const seed = async () => {
  try {
    console.log('Connecting to MongoDB for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!');

    // 1. Clear existing data
    console.log('Clearing existing collections...');
    await Admin.deleteMany({});
    await HotelSetting.deleteMany({});
    await MealPlan.deleteMany({});
    await Coupon.deleteMany({});
    await Attraction.deleteMany({});
    await RoomType.deleteMany({});
    await Room.deleteMany({});
    await MenuCategory.deleteMany({});
    await MenuItem.deleteMany({});

    // 2. Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@hotelraama.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminRaama@2026';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    await Admin.create({
      email: adminEmail,
      passwordHash,
      name: 'Hotel Raama Admin',
      role: 'ADMIN',
    });
    console.log(`✓ Admin user created: ${adminEmail}`);

    // 3. Hotel Settings
    await HotelSetting.create({
      hotelName: 'Hotel Raama',
      tagline: 'Hospitality That Feels Like Home',
      address: 'B.M. Road, Thanneeruhalla, Opposite S.D.M. Ayurvedic Hospital & College',
      city: 'Hassan',
      state: 'Karnataka',
      pincode: '573201',
      phone: '081722 57001',
      email: 'reservations@hotelraama.com',
      receptionWhatsapp: '918172257001',
      notificationEmail: 'admin@hotelraama.com',
      taxPercentage: 12,
      bookingHoldMinutes: 15,
    });
    console.log('✓ Hotel settings created');

    // 4. Meal Plans
    await MealPlan.create([
      { name: 'Buffet Breakfast', type: 'BREAKFAST', pricePerPersonPerNight: 150, description: 'Fresh South Indian & Continental breakfast spread' },
      { name: 'Executive Lunch', type: 'LUNCH', pricePerPersonPerNight: 250, description: 'Traditional South/North Indian Thali lunch' },
      { name: 'Royal Dinner', type: 'DINNER', pricePerPersonPerNight: 300, description: 'Gourmet dinner buffet at Swaad restaurant' },
    ]);
    console.log('✓ Meal plans created');

    // 5. Coupons
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    await Coupon.create([
      { code: 'RAAMA5', discountType: 'PERCENTAGE', discountValue: 5, minBookingAmount: 0, startDate: now, endDate: nextYear, maxUsage: 1000 },
    ]);
    console.log('✓ Initial coupons created');

    // 6. Attractions
    await Attraction.create([
      { name: 'Chennakeshava Temple, Belur', category: 'Hoysala Heritage', distance: '38 km', image: '/chennakeshava-temple-belur.png', description: 'Famous 12th-century Hoysala temple renowned for intricate stone carvings and architecture.', sortOrder: 1 },
      { name: 'Hoysaleswara Temple, Halebidu', category: 'Hoysala Heritage', distance: '31 km', image: '/hoysaleswara-temple-halebidu.png', description: 'Twin-temple complex dedicated to Shiva, showcasing breathtaking stone sculptures.', sortOrder: 2 },
      { name: 'Shravanabelagola (Gommateshwara)', category: 'Pilgrimage', distance: '52 km', image: '/shravanabelagola.png', description: 'Home to the magnificent 57-foot monolithic statue of Lord Bahubali atop Vindhyagiri Hill.', sortOrder: 3 },
      { name: 'Manjarabad Fort, Sakleshpur', category: 'History & Forts', distance: '40 km', image: '/manjarabad-fort.jpg', description: 'Star-shaped fort built by Tipu Sultan offering panoramic views of the Western Ghats.', sortOrder: 4 },
      { name: 'Shettihalli Rosary Church', category: 'Historic Ruins', distance: '22 km', image: '/shettihalli-church.png', description: 'Submerged Gothic church ruins built in 1860, famous for its surreal monsoon landscape.', sortOrder: 5 },
      { name: 'Bisle Ghat Viewpoint', category: 'Nature & Trekking', distance: '85 km', image: '/bisle-ghat.png', description: 'Spectacular mountain outlook providing sweeping vistas of three mountain ranges.', sortOrder: 6 },
    ]);
    console.log('✓ Hassan attractions created');

    // 7. Room Types & 40 Rooms (1 to 40) + 1 Sambhrama Party Hall
    const roomTypesData = [
      { name: 'Premium Single Non A/C', code: 'PREM_SGL_NONAC', description: 'Comfortable single occupancy non-A/C room with queen bed, Wi-Fi, and city views.', basePrice: 1200, cpPrice: 1350, maxOccupancy: 1, isAc: false, amenities: ['Free Wi-Fi', 'TV', 'Hot Water', 'Work Desk'], images: ['/single-occupancy-room.png', '/hotel-corridor.jpg', '/single-room-angle.jpg'] },
      { name: 'Premium Double Non A/C', code: 'PREM_DBL_NONAC', description: 'Spacious double occupancy non-A/C room with plush bedding and modern bathroom.', basePrice: 1600, cpPrice: 1800, maxOccupancy: 2, isAc: false, amenities: ['Free Wi-Fi', 'LED TV', '24/7 Hot Water', 'Daily Housekeeping'], images: ['/double-occupancy-room.png', '/hotel-corridor.jpg', '/double-room-angle.png'] },
      { name: 'Executive Single A/C', code: 'EXEC_SGL_AC', description: 'Elegant single room with climate control A/C, ergonomic desk, and premium bath accessories.', basePrice: 1800, cpPrice: 2000, maxOccupancy: 1, isAc: true, amenities: ['Air Conditioning', 'High Speed Wi-Fi', 'Smart TV', 'Room Service'], images: ['/single-occupancy-room.png', '/hotel-corridor.jpg', '/single-room-angle.jpg'] },
      { name: 'Executive Double A/C', code: 'EXEC_DBL_AC', description: 'Luxurious double A/C room equipped with king-size bed, seating area, and room dining.', basePrice: 2200, cpPrice: 2500, maxOccupancy: 2, isAc: true, amenities: ['Air Conditioning', 'King Bed', 'Tea/Coffee Maker', 'Minibar', 'Smart TV'], images: ['/double-occupancy-room.png', '/hotel-corridor.jpg', '/double-room-angle.png'] },
      { name: 'Triple Occupancy Premium', code: 'TRIPLE_PREM', description: 'Generous room designed for families or small groups with 3 comfortable single beds.', basePrice: 2400, cpPrice: 2750, maxOccupancy: 3, isAc: false, amenities: ['3 Single Beds', 'Free Wi-Fi', 'Spacious Wardrobe', 'Bottled Water'], images: ['/triple-occupancy-ac.png', '/hotel-corridor.jpg', '/triple-room-angle.png'] },
      { name: 'Triple Occupancy Executive A/C', code: 'TRIPLE_EXEC', description: 'Air-conditioned family room featuring premium bedding, extra seating, and deluxe amenities.', basePrice: 2800, cpPrice: 3200, maxOccupancy: 3, isAc: true, amenities: ['Air Conditioning', '3 Beds', 'Smart TV', 'Tea/Coffee Station'], images: ['/triple-occupancy-ac.png', '/hotel-corridor.jpg', '/triple-room-angle.png'] },
      { name: 'Suite Room', code: 'SUITE_ROOM', description: 'Presidential suite with separate living lounge, master bedroom, luxury bathtub, and VIP service.', basePrice: 3500, cpPrice: 4000, maxOccupancy: 4, isAc: true, amenities: ['Living Room Lounge', 'Jacuzzi / Bathtub', 'Fruit Basket', 'Express Check-in', 'Premium A/C'], images: ['/suite-room.png', '/hotel-corridor.jpg', '/suite-room-angle.png'] },
    ];

    const createdRoomTypes = await RoomType.create(roomTypesData);
    console.log(`✓ ${createdRoomTypes.length} room types created`);

    // Create 40 rooms (numbered 1 to 40) + 1 Sambhrama Party Hall
    const roomsToSeed = [];
    const rtMap = new Map(createdRoomTypes.map(rt => [rt.code, rt._id]));
    const typeCodes = ['PREM_SGL_NONAC', 'PREM_DBL_NONAC', 'EXEC_SGL_AC', 'EXEC_DBL_AC', 'TRIPLE_PREM', 'TRIPLE_EXEC', 'SUITE_ROOM'];

    for (let i = 1; i <= 40; i++) {
      const roomNum = `${i}`;
      const code = typeCodes[(i - 1) % typeCodes.length];
      const floor = i <= 20 ? 1 : 2;
      roomsToSeed.push({
        roomNumber: roomNum,
        roomTypeId: rtMap.get(code),
        floor,
        status: 'AVAILABLE',
        qrToken: generateQrToken(roomNum),
      });
    }

    // Add Sambhrama Party Hall QR
    roomsToSeed.push({
      roomNumber: 'Sambhrama Party Hall',
      roomTypeId: rtMap.get('SUITE_ROOM'),
      floor: 1,
      status: 'AVAILABLE',
      qrToken: generateQrToken('SambhramaPartyHall'),
    });

    // Add Board Room QR
    roomsToSeed.push({
      roomNumber: 'Board Room',
      roomTypeId: rtMap.get('EXEC_DBL_AC') || rtMap.get('SUITE_ROOM'),
      floor: 1,
      status: 'AVAILABLE',
      qrToken: generateQrToken('BoardRoom'),
    });

    const createdRooms = await Room.create(roomsToSeed);
    console.log(`✓ ${createdRooms.length} rooms created (40 rooms numbered 1-40 + Sambhrama Party Hall + Board Room with unique QR tokens)`);


    // 8. Menu Categories & Items
    // --- SWAAD VEG RESTAURANT (Pure Vegetarian with English & Kannada names) ---
    const catSouth = await MenuCategory.create({ name: 'South Indian Dishes (ದಕ್ಷಿಣ ಭಾರತೀಯ ತಿನಿಸುಗಳು)', section: 'SWAAD', description: 'Timings: 7:00 AM to 11:30 AM', sortOrder: 1 });
    const catDosa = await MenuCategory.create({ name: 'Dosa Specialities (ದೋಸೆ ಸ್ಪೆಷಲ್)', section: 'SWAAD', description: 'Timings: 7:00 AM to 11:30 AM & 3:30 PM to 8:30 PM', sortOrder: 2 });
    const catMeals = await MenuCategory.create({ name: 'Meals (ಮೀಲ್ಸ್)', section: 'SWAAD', description: 'South Indian & North Indian Meals', sortOrder: 3 });
    const catNorth = await MenuCategory.create({ name: 'North Pulav & Biriyani (ನಾರ್ತ್ ಪಲಾವ್ & ಬಿರಿಯಾನಿ)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 4 });
    const catStarters = await MenuCategory.create({ name: 'Starters (ಸ್ಟಾರ್ಟರ್ಸ್)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 5 });
    const catSoups = await MenuCategory.create({ name: 'Soups (ಸೂಪ್)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 6 });
    const catSalad = await MenuCategory.create({ name: 'Salad (ಸಲಾಡ್)', section: 'SWAAD', sortOrder: 7 });
    const catBreads = await MenuCategory.create({ name: 'Tandoor Bread (ತಂದೂರ್ ಬ್ರೆಡ್)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 8 });
    const catCurry = await MenuCategory.create({ name: 'Vegetable Curry (ವೆಜಿಟೆಬಲ್ ಕರಿ)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 9 });
    const catKadai = await MenuCategory.create({ name: 'Kadai Special (ಕಡೈ ಸ್ಪೆಷಲ್)', section: 'SWAAD', sortOrder: 10 });
    const catKofta = await MenuCategory.create({ name: 'Kofta & Stuffed (ಕೋಫ್ತಾ & ಸ್ಟಫ್ಡ್)', section: 'SWAAD', sortOrder: 11 });
    const catDalPalak = await MenuCategory.create({ name: 'Dal & Palak (ದಾಲ್ ಪಾಲಕ್)', section: 'SWAAD', sortOrder: 12 });
    const catChinese = await MenuCategory.create({ name: 'Chinese Rice & Noodles (ಚೈನೀಸ್ ರೈಸ್ & ನೂಡಲ್ಸ್)', section: 'SWAAD', description: 'Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM', sortOrder: 13 });
    const catSandwich = await MenuCategory.create({ name: 'Sandwich & Grilled (ಸ್ಯಾಂಡ್‌ವಿಚ್ & ಗ್ರಿಲ್ಡ್)', section: 'SWAAD', sortOrder: 14 });
    const catSweets = await MenuCategory.create({ name: 'Sweet Special (ಸ್ವೀಟ್ ಸ್ಪೆಷಲ್)', section: 'SWAAD', sortOrder: 15 });
    const catJuice = await MenuCategory.create({ name: 'Fresh Fruit Juice (ಫ್ರೆಶ್ ಫ್ರೂಟ್ ಜ್ಯೂಸ್)', section: 'SWAAD', description: 'Timings: 11:30 AM to 10:00 PM', sortOrder: 16 });
    const catShakes = await MenuCategory.create({ name: 'Milkshakes & Lassi (ಮಿಲ್ಕ್ ಶೇಕ್ & ಲಸಿ)', section: 'SWAAD', sortOrder: 17 });
    const catFruitSalad = await MenuCategory.create({ name: 'Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)', section: 'SWAAD', sortOrder: 18 });
    const catIceCream = await MenuCategory.create({ name: 'Ice Cream Scoop & Cone (ಐಸ್ ಕ್ರೀಮ್ ಸ್ಕೂಪ್ & ಕೋನ್)', section: 'SWAAD', sortOrder: 19 });
    const catSplIceCream = await MenuCategory.create({ name: 'Special Ice Cream (ಸ್ಪೆಷಲ್ ಐಸ್ ಕ್ರೀಮ್)', section: 'SWAAD', sortOrder: 20 });
    const catHotBev = await MenuCategory.create({ name: 'Hot Beverages (ಬಿಸಿಯಾದ ಪಾನೀಯ)', section: 'SWAAD', sortOrder: 21 });

    const swaadItems = [
      // 1. South Indian Dishes
      { name: 'Idly Vada (ಇಡ್ಲಿ ಉದ್ದಿನವಡೆ - 2 Idly 1 Vada)', categoryId: catSouth._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Single Idly Vada (ಸಿಂಗಲ್ ಇಡ್ಲಿ ಉದ್ದಿನವಡೆ)', categoryId: catSouth._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Rice Idly (ಇಡ್ಲಿ - 2 Nos.)', categoryId: catSouth._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'Uddina Vada (ಉದ್ದಿನವಡೆ)', categoryId: catSouth._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'Kesari Bath (ಕೇಸರಿಬಾತ್)', categoryId: catSouth._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Khara Bath (ಖಾರಾಬಾತ್)', categoryId: catSouth._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Chow Chow Bath (ಚೌಚೌ ಬಾತ್)', categoryId: catSouth._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Rava Idly (ರವೆ ಇಡ್ಲಿ - 1 No.)', categoryId: catSouth._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Poori (ಪೂರಿ - 3 Nos.)', categoryId: catSouth._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Curd Vada (ಮೊಸರು ವಡೆ)', categoryId: catSouth._id, section: 'SWAAD', price: 55, isVeg: true },
      { name: 'Rice Bath (ರೈಸ್ ಬಾತ್ - Day Special)', categoryId: catSouth._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Bonda Soup (ಬೋಂಡಾ ಸೂಪ್)', categoryId: catSouth._id, section: 'SWAAD', price: 55, isVeg: true },

      // 2. Dosa Specialities
      { name: 'Open Butter Masala Dosa (ಓಪನ್ ಬಟರ್ ಮಸಾಲ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 75, isVeg: true, featured: true },
      { name: 'Masala Dosa (ಮಸಾಲ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Set Dosa (ಸೆಟ್ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Onion Dosa (ಈರುಳ್ಳಿ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Plain Dosa (ಪ್ಲೇನ್ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Rava Dosa (ರವಾ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Rava Masala Dosa (ರವಾ ಮಸಾಲ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 90, isVeg: true },
      { name: 'Rava Onion Dosa (ರವಾ ಈರುಳ್ಳಿ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 90, isVeg: true },
      { name: 'Rava Onion Masala Dosa (ರವಾ ಈರುಳ್ಳಿ ಮಸಾಲ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 100, isVeg: true },
      { name: 'Paper Plain Dosa (ಪೇಪರ್ ಪ್ಲೇನ್ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 90, isVeg: true },
      { name: 'Paper Masala Dosa (ಪೇಪರ್ ಮಸಾಲ ದೋಸೆ)', categoryId: catDosa._id, section: 'SWAAD', price: 100, isVeg: true },
      { name: 'Neer Dosa (ನೀರ್ ದೋಸೆ - Sat & Sun Only)', categoryId: catDosa._id, section: 'SWAAD', price: 90, description: 'Only Saturday & Sunday 7:00 AM to 11:30 AM', isVeg: true },

      // 3. Meals
      { name: 'South Indian Meals (ಸೌತ್ ಇಂಡಿಯನ್ ಮೀಲ್ಸ್)', categoryId: catMeals._id, section: 'SWAAD', price: 125, description: 'Timings: 12:00 PM to 3:30 PM', isVeg: true, featured: true },
      { name: 'North Indian Meals (ನಾರ್ತ್ ಇಂಡಿಯನ್ ಮೀಲ್)', categoryId: catMeals._id, section: 'SWAAD', price: 160, description: 'Timings: 12:00 PM to 3:30 PM & 7:00 PM to 10:00 PM', isVeg: true, featured: true },

      // 4. North Pulav & Biriyani
      { name: 'Mugalai Biryani (ಮುಗಲೈ ಬಿರಿಯಾನಿ)', categoryId: catNorth._id, section: 'SWAAD', price: 170, isVeg: true, featured: true },
      { name: 'Veg. Biryani (ವೆಜ್ ಬಿರಿಯಾನಿ)', categoryId: catNorth._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Veg. Pulav (ವೆಜ್ ಪಲಾವ್)', categoryId: catNorth._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Peas Pulav (ಪೀಸ್ ಪಲಾವ್)', categoryId: catNorth._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Veg Handi Biryani (ವೆಜ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)', categoryId: catNorth._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Special Curd Rice (ಸ್ಪೆಷಲ್ ಕರ್ಡ್ ರೈಸ್)', categoryId: catNorth._id, section: 'SWAAD', price: 90, isVeg: true },
      { name: 'Veg. Hydrabadhi Biryani (ವೆಜ್ ಹೈದರಾಬಾದಿ ಬಿರಿಯಾನಿ)', categoryId: catNorth._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Dal Kichadi (ದಾಲ್ ಕಿಚಡಿ)', categoryId: catNorth._id, section: 'SWAAD', price: 130, isVeg: true },
      { name: 'Basamathi Steam / Hot Rice (ಬಾಸುಮತಿ ಸ್ಟೀಮ್ / ಬಿಸಿ ರೈಸ್)', categoryId: catNorth._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Plain Rice & Rasam (ಪ್ಲೇನ್ ರೈಸ್ & ರಸಂ)', categoryId: catNorth._id, section: 'SWAAD', price: 60, isVeg: true },
      { name: 'Palak Rice (ಪಾಲಕ್ ರೈಸ್)', categoryId: catNorth._id, section: 'SWAAD', price: 140, isVeg: true },

      // 5. Starters
      { name: 'Paneer Manchurian (ಪನ್ನೀರ್ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Veg. Ball Manchurian (ವೆಜ್ ಬಾಲ್ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Mushroom Manchurian (ಮಶ್ರೂಮ್ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Baby - Corn Manchurian (ಬೇಬಿ ಕಾರ್ನ್ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Gobi Manchurian (ಗೋಬಿ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Spanish Manchurian (ಸ್ಪ್ಯಾನಿಶ್ ಮಂಚೂರಿಯನ್)', categoryId: catStarters._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Harabara Kabab (ಹರಬರ ಕಬಾಬ್)', categoryId: catStarters._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'French Fries (ಫ್ರೆಂಚ್ ಫ್ರೈಸ್)', categoryId: catStarters._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Papad (ಪಾಪಡ್)', categoryId: catStarters._id, section: 'SWAAD', price: 30, isVeg: true },
      { name: 'Masala Papad (ಮಸಾಲ ಪಾಪಡ್)', categoryId: catStarters._id, section: 'SWAAD', price: 55, isVeg: true },
      { name: 'Paneer Tikka (ಪನ್ನೀರ್ ಟಿಕ್ಕ)', categoryId: catStarters._id, section: 'SWAAD', price: 195, isVeg: true, featured: true },
      { name: 'Baby Corn Chilli (ಬೇಬಿ ಕಾರ್ನ್ ಚಿಲ್ಲಿ)', categoryId: catStarters._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Gobi Chilli (ಗೋಬಿ ಚಿಲ್ಲಿ)', categoryId: catStarters._id, section: 'SWAAD', price: 165, isVeg: true },
      { name: 'Mushroom Chilli (ಮಶ್ರೂಮ್ ಚಿಲ್ಲಿ)', categoryId: catStarters._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Paneer Chilli (ಪನ್ನೀರ್ ಚಿಲ್ಲಿ)', categoryId: catStarters._id, section: 'SWAAD', price: 195, isVeg: true },
      { name: 'Baby - Corn Pepper Dry (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catStarters._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Mushroom Pepper Dry (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catStarters._id, section: 'SWAAD', price: 180, isVeg: true },

      // 6. Soups
      { name: 'Tomato Soup (ಟೊಮೊಟೊ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Sweet - Corn Soup (ಸ್ವೀಟ್ ಕಾರ್ನ್ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Sweet - Corn Veg Soup (ಸ್ವೀಟ್ ಕಾರ್ನ್ ವೆಜ್ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Veg. Clear Soup (ವೆಜ್ ಕ್ಲಿಯರ್ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Hot & Sour Soup (ಹಾಟ್ & ಸೋರ್ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Veg. Manchow Soup (ವೆಜ್ ಮಾಂಚೋ ಸೂಪ್)', categoryId: catSoups._id, section: 'SWAAD', price: 95, isVeg: true },

      // 7. Salad
      { name: 'Green Salad (ಗ್ರೀನ್ ಸಲಾಡ್)', categoryId: catSalad._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Tomato Salad (ಟೊಮೊಟೊ ಸಲಾಡ್)', categoryId: catSalad._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Cucumber Salad (ಕುಕುಂಬರ್ ಸಲಾಡ್)', categoryId: catSalad._id, section: 'SWAAD', price: 65, isVeg: true },

      // 8. Tandoor Bread
      { name: 'Roti (ರೋಟಿ)', categoryId: catBreads._id, section: 'SWAAD', price: 35, isVeg: true },
      { name: 'Butter Roti (ಬಟರ್ ರೋಟಿ)', categoryId: catBreads._id, section: 'SWAAD', price: 40, isVeg: true },
      { name: 'Methi Roti (ಮೇಥಿ ರೋಟಿ)', categoryId: catBreads._id, section: 'SWAAD', price: 40, isVeg: true },
      { name: 'Palak Roti (ಪಾಲಕ್ ರೋಟಿ)', categoryId: catBreads._id, section: 'SWAAD', price: 40, isVeg: true },
      { name: 'Pudina Roti (ಪುದಿನ ರೋಟಿ)', categoryId: catBreads._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'Naan (ನಾನ್)', categoryId: catBreads._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'Butter Naan (ಬಟರ್ ನಾನ್)', categoryId: catBreads._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Garlic Naan (ಗಾರ್ಲಿಕ್ ನಾನ್)', categoryId: catBreads._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Kashmiri Naan (ಕಾಶ್ಮೀರಿ ನಾನ್)', categoryId: catBreads._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Kulcha (ಕುಲ್ಚಾ)', categoryId: catBreads._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'Butter Kulcha (ಬಟರ್ ಕುಲ್ಚಾ)', categoryId: catBreads._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Stuffed Kulcha (ಸ್ಟಫ್ಡ್ ಕುಲ್ಚಾ)', categoryId: catBreads._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Parota (ಪರೋಟ)', categoryId: catBreads._id, section: 'SWAAD', price: 50, isVeg: true },
      { name: 'Butter Parota (ಬಟರ್ ಪರೋಟ)', categoryId: catBreads._id, section: 'SWAAD', price: 55, isVeg: true },
      { name: 'Stuffed Parota (ಸ್ಟಫ್ಡ್ ಪರೋಟ)', categoryId: catBreads._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Alu Parota (ಆಲೂ ಪರೋಟ)', categoryId: catBreads._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'ROTI BASKET with Butter (ರೋಟಿ ಬಾಸ್ಕೇಟ್)', categoryId: catBreads._id, section: 'SWAAD', price: 165, isVeg: true, featured: true },

      // 9. Vegetable Curry
      { name: 'Paneer Butter Masala (ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 185, isVeg: true, featured: true },
      { name: 'Channa Masala (ಚನ್ನ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Gobi Masala (ಗೋಬಿ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Veg. Makhanwala (ವೆಜ್ ಮಕ್ಕನ್‌ವಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Green Peas Masala (ಗ್ರೀನ್ ಪೀಸ್ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Mix Veg. curry (ಮಿಕ್ಸ್ ವೆಜ್ ಕರಿ)', categoryId: catCurry._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Mushroom Masala (ಮಶ್ರೂಮ್ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Veg. Do Piaza (ವೆಜ್ ದೋ ಪ್ಯಾವಾ)', categoryId: catCurry._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Veg. Kurma (ವೆಜ್ ಕುರ್ಮಾ)', categoryId: catCurry._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Paneer Burji/Guchi (ಪನ್ನೀರ್ ಬುರ್ಜಿ / ಗುಚಿ)', categoryId: catCurry._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Veg. Hydrabadi (ವೆಜ್ ಹೈದರಾಬಾದಿ)', categoryId: catCurry._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Paneer Tikka Masala (ಪನ್ನೀರ್ ಟಿಕ್ಕ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 200, isVeg: true },
      { name: 'Baby corn Masala (ಬೇಬಿ ಕಾರ್ನ್ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Kaju Masala (ಕಾಜು ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 220, isVeg: true },
      { name: 'Kaju Panner (ಕಾಜು ಪನ್ನೀರ್)', categoryId: catCurry._id, section: 'SWAAD', price: 220, isVeg: true },
      { name: 'Alu Gobi Kurma (ಆಲೂ ಗೋಬಿ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Shahi Kurma (ಶಾಹಿ ಕುರ್ಮಾ)', categoryId: catCurry._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Veg. Patiala (ವೆಜ್ ಪಟಿಯಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Swaad Special (ಸ್ವಾದ್ ಸ್ಪೆಷಲ್)', categoryId: catCurry._id, section: 'SWAAD', price: 200, isVeg: true, featured: true },
      { name: 'Veg. Jaipuri (ವೆಜ್ ಜೈಪುರಿ)', categoryId: catCurry._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Veg. Kollapuri (ವೆಜ್ ಕೊಲ್ಹಾಪುರಿ)', categoryId: catCurry._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Navarathna Kurma (ನವರತ್ನ ಕುರ್ಮಾ)', categoryId: catCurry._id, section: 'SWAAD', price: 200, isVeg: true },
      { name: 'Capsicum Masala (ಕ್ಯಾಪ್ಸಿಕಮ್ ಮಸಾಲ)', categoryId: catCurry._id, section: 'SWAAD', price: 150, isVeg: true },

      // 10. Kadai Special
      { name: 'Kadai Paneer (ಕಡೈ ಪನ್ನೀರ್)', categoryId: catKadai._id, section: 'SWAAD', price: 185, isVeg: true, featured: true },
      { name: 'Kadai Mushroom (ಕಡೈ ಮಶ್ರೂಮ್)', categoryId: catKadai._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Kadai Gobi Mutter (ಕಡೈ ಗೋಬಿ ಮಟರ್)', categoryId: catKadai._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Kadai Mix veg. (ಕಡೈ ಮಿಕ್ಸ್ ವೆಜ್)', categoryId: catKadai._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Kadai Veg. Kolhapuri (ಕಡೈ ವೆಜ್ ಕೊಲ್ಹಾಪುರಿ)', categoryId: catKadai._id, section: 'SWAAD', price: 185, isVeg: true },

      // 11. Kofta & Stuffed
      { name: 'Paneer Kofta (ಪನ್ನೀರ್ ಕೋಫ್ತಾ)', categoryId: catKofta._id, section: 'SWAAD', price: 185, isVeg: true },
      { name: 'Malai Kofta (ಮಲೈ ಕೋಫ್ತಾ)', categoryId: catKofta._id, section: 'SWAAD', price: 185, isVeg: true, featured: true },
      { name: 'Veg. Kofta (ವೆಜ್ ಕೋಫ್ತಾ)', categoryId: catKofta._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Stuffed Tomoto (ಸ್ಟಫ್ಡ್ ಟೊಮೊಟೊ)', categoryId: catKofta._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Stuffed Capsicum (ಸ್ಟಫ್ಡ್ ಕ್ಯಾಪ್ಸಿಕಮ್)', categoryId: catKofta._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Nargis Kofta (ನರ್ಗಿಸ್ ಕೋಫ್ತಾ)', categoryId: catKofta._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Stuffed Alu (ಸ್ಟಫ್ಡ್ ಆಲೂ)', categoryId: catKofta._id, section: 'SWAAD', price: 160, isVeg: true },

      // 12. Dal & Palak
      { name: 'Dal Fry (ದಾಲ್ ಫ್ರೈ)', categoryId: catDalPalak._id, section: 'SWAAD', price: 120, isVeg: true },
      { name: 'Dal Punjabi (ದಾಲ್ ಪಂಜಾಬಿ)', categoryId: catDalPalak._id, section: 'SWAAD', price: 130, isVeg: true },
      { name: 'Dal Tadka (ದಾಲ್ ತಡ್ಕಾ)', categoryId: catDalPalak._id, section: 'SWAAD', price: 130, isVeg: true },
      { name: 'Dal Palak (ದಾಲ್ ಪಾಲಕ್)', categoryId: catDalPalak._id, section: 'SWAAD', price: 130, isVeg: true },
      { name: 'Paneer Palak (ಪನ್ನೀರ್ ಪಾಲಕ್)', categoryId: catDalPalak._id, section: 'SWAAD', price: 180, isVeg: true },
      { name: 'Plain Palak (ಪ್ಲೇನ್ ಪಾಲಕ್)', categoryId: catDalPalak._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Alu Palak (ಆಲೂ ಪಾಲಕ್)', categoryId: catDalPalak._id, section: 'SWAAD', price: 150, isVeg: true },

      // 13. Chinese Rice & Noodles
      { name: 'Veg. Fried Rice (ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 145, isVeg: true },
      { name: 'Veg. Noodles (ವೆಜ್ ನೂಡಲ್ಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 145, isVeg: true },
      { name: 'Veg. Hakka Noodles (ವೆಜ್ ಹಕ್ಕಾ ನೂಡಲ್ಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Veg. Schezwan Fried Rice (ವೆಜ್ ಶೇಜ್ವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Veg. Schezwan Noodles (ವೆಜ್ ಶೇಜ್ವಾನ್ ನೂಡಲ್ಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 165, isVeg: true },
      { name: 'Paneer Fried Rice (ಪನ್ನೀರ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Mushroom Fried Rice (ಮಶ್ರೂಮ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Mushroom Noodles (ಮಶ್ರೂಮ್ ನೂಡಲ್ಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 170, isVeg: true },
      { name: 'Corn Fried Rice (ಕಾರ್ನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Singapore Fried Rice (ಸಿಂಗಾಪುರ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Singapore Noodles (ಸಿಂಗಾಪುರ್ ನೂಡಲ್ಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Jeera Fried Rice (ಜೀರಾ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Ghee Rice (ಘೀ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Jeera Rice (ಜೀರಾ ರೈಸ್)', categoryId: catChinese._id, section: 'SWAAD', price: 150, isVeg: true },

      // 14. Sandwich & Grilled
      { name: 'Veg Sandwich (ವೆಜ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Veg. Paneer / Cheese Grilled (ವೆಜ್ ಪನ್ನೀರ್ / ಚೀಸ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Veg. Grilled Sandwich (ವೆಜ್ ಗ್ರಿಲ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Veg. Cheese Grilled Sandwich (ವೆಜ್ ಚೀಸ್ ಗ್ರಿಲ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Aloo Chease Grilled (ಆಲೂ ಚೀಸ್ ಗ್ರಿಲ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Onion Paneer / Cheese Grilled (ಈರುಳ್ಳಿ ಪನ್ನೀರ್ / ಚೀಸ್ ಗ್ರಿಲ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Tomoto Paneer / Cheese Grilled (ಟೊಮಾಟೊ ಪನ್ನೀರ್ ಚೀಸ್ ಗ್ರಿಲ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Bread Butter / Jam (ಬ್ರೆಡ್ ಬಟರ್ / ಜಾಮ್)', categoryId: catSandwich._id, section: 'SWAAD', price: 55, isVeg: true },

      // 15. Sweet Special
      { name: 'Rasmalai (ರಸ್‌ಮಲೈ)', categoryId: catSweets._id, section: 'SWAAD', price: 35, isVeg: true },
      { name: 'Gulab Jamoon (ಗುಲಾಬ್ ಜಾಮೂನು)', categoryId: catSweets._id, section: 'SWAAD', price: 30, isVeg: true },
      { name: 'Malai Sandwich (ಮಲೈ ಸ್ಯಾಂಡ್‌ವಿಚ್)', categoryId: catSweets._id, section: 'SWAAD', price: 35, isVeg: true },
      { name: 'Carrot Halwa (ಕ್ಯಾರಟ್ ಹಲ್ವ)', categoryId: catSweets._id, section: 'SWAAD', price: 40, isVeg: true },

      // 16. Fresh Fruit Juice
      { name: 'Musambi Juice (Seasonal) (ಮೂಸಂಬಿ ಜ್ಯೂಸ್)', categoryId: catJuice._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Orange Juice (Seasonal) (ಆರೆಂಜ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)', categoryId: catJuice._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Grape Juice (Seasonal) (ಗ್ರೇಪ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)', categoryId: catJuice._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Pineapple Juice (Seasonal) (ಪೈನಾಪಲ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)', categoryId: catJuice._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Mango Juice (Seasonal) (ಮ್ಯಾಂಗೋ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)', categoryId: catJuice._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Water Melon (Seasonal) (ವಾಟರ್ ಮೆಲನ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)', categoryId: catJuice._id, section: 'SWAAD', price: 65, isVeg: true },
      { name: 'Fresh Lime Juice (ಫ್ರೆಶ್ ಲೈಮ್ ಜ್ಯೂಸ್)', categoryId: catJuice._id, section: 'SWAAD', price: 55, isVeg: true },
      { name: 'Fresh Lime soda (ಫ್ರೆಶ್ ಲೈಮ್ ಸೋಡ)', categoryId: catJuice._id, section: 'SWAAD', price: 65, isVeg: true },

      // 17. Milkshakes & Lassi
      { name: 'Chikku Milk Shake (ಚಿಕ್ಕು ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 90, isVeg: true },
      { name: 'Mango Milk Shake (ಮ್ಯಾಂಗೋ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Straberry Milk Shake (ಸ್ಟ್ರಾಬರಿ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Apple Milk Shake (ಆಪಲ್ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 100, isVeg: true },
      { name: 'Vanilla Milk Shake (ವೆನಿಲ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Chacolate Milk Shake (ಚಾಕೋಲೇಟ್ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Pista Milk Shake (ಪಿಸ್ತಾ ಮಿಲ್ಕ್ ಶೇಕ್)', categoryId: catShakes._id, section: 'SWAAD', price: 95, isVeg: true },
      { name: 'Sweet Lassi / Salt Lassi (ಸ್ವೀಟ್ ಲಸ್ಸಿ / ಸಾಲ್ಟ್ ಲಸ್ಸಿ)', categoryId: catShakes._id, section: 'SWAAD', price: 65, isVeg: true },

      // 18. Fruit Salad
      { name: 'Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)', categoryId: catFruitSalad._id, section: 'SWAAD', price: 100, isVeg: true },
      { name: 'Fruit Salad with Ice cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಐಸ್ ಕ್ರೀಂ)', categoryId: catFruitSalad._id, section: 'SWAAD', price: 110, isVeg: true },
      { name: 'Fruit Salad Jelly & Ice cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ಜೆಲ್ಲಿ & ಐಸ್ ಕ್ರೀಂ)', categoryId: catFruitSalad._id, section: 'SWAAD', price: 120, isVeg: true },

      // 19. Ice Cream Scoop & Cone
      { name: 'Chacolate Ice Cream (ಚಾಕೋಲೇಟ್ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Pista Ice Cream (ಪಿಸ್ತಾ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Vanila Ice Cream (ವೆನಿಲ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Mango Ice Cream (ಮ್ಯಾಂಗೋ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 75, isVeg: true },
      { name: 'Dry Fruit Ice Cream (ಡ್ರೈ ಫ್ರೂಟ್ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 85, isVeg: true },
      { name: 'Black Current Ice Cream (ಬ್ಲಾಕ್ ಕರೆಂಟ್ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 80, isVeg: true },
      { name: 'Straberry Ice Cream (ಸ್ಟ್ರಾಬರಿ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 70, isVeg: true },
      { name: 'Butter scoth Ice Cream (ಬಟರ್ ಸ್ಕಾಚ್ ಐಸ್ ಕ್ರೀಮ್)', categoryId: catIceCream._id, section: 'SWAAD', price: 80, isVeg: true },

      // 20. Special Ice Cream
      { name: 'Raja Rani (ರಾಜಾರಾಣಿ)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 145, isVeg: true },
      { name: 'My Darling (ಡಾರ್ಲಿಂಗ್)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Golden Cherry (ಗೋಲ್ಡನ್ ಚೆರ್ರಿ)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Nuts Sunday (ನಟ್ಸ್ ಸಂಡೇ)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 150, isVeg: true },
      { name: 'Honeymoon Special (ಹನಿಮೂನ್ ಸ್ಪೆಷಲ್)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 160, isVeg: true },
      { name: 'Gudbad (ಗಡ್‌ಬಡ್)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 150, isVeg: true, featured: true },
      { name: 'Swaad Special (ಸ್ವಾದ್ ಸ್ಪೆಷಲ್)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 170, isVeg: true, featured: true },
      { name: 'My Dream (ಮೈ ಡ್ರೀಂ)', categoryId: catSplIceCream._id, section: 'SWAAD', price: 150, isVeg: true },

      // 21. Hot Beverages
      { name: 'COFFEE / TEA / MILK (ಕಾಫಿ /ಟೀ/ಹಾಲು)', categoryId: catHotBev._id, section: 'SWAAD', price: 38, isVeg: true },
      { name: 'HOT BADAM MILK (ಬಿಸಿ ಬಾದಾಮ್ ಹಾಲು)', categoryId: catHotBev._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'BOURNAVITA (ಬೋರ್ನ್‌ವಿಟ)', categoryId: catHotBev._id, section: 'SWAAD', price: 45, isVeg: true },
      { name: 'HORLICKS (ಹಾರ್ಲಿಕ್ಸ್)', categoryId: catHotBev._id, section: 'SWAAD', price: 45, isVeg: true },
    ];

    await MenuItem.create(swaadItems);
    console.log(`✓ ${swaadItems.length} Swaad Veg Restaurant menu items created`);

    // --- LIQUID LOUNGE BAR (LLB - Beverages & Cocktails with English & Kannada names) ---
    const catLlbWhisky = await MenuCategory.create({ name: 'Premium Whisky (ಪ್ರೀಮಿಯಂ ವಿಸ್ಕಿ)', section: 'LIQUID_LOUNGE', sortOrder: 1 });
    const catLlbBrandy = await MenuCategory.create({ name: 'Brandy (ಬ್ರಾಂಡಿ)', section: 'LIQUID_LOUNGE', sortOrder: 2 });
    const catLlbRum = await MenuCategory.create({ name: 'Rum (ರಮ್)', section: 'LIQUID_LOUNGE', sortOrder: 3 });
    const catLlbVodka = await MenuCategory.create({ name: 'Vodka (ವೋಡ್ಕಾ)', section: 'LIQUID_LOUNGE', sortOrder: 4 });
    const catLlbScotch = await MenuCategory.create({ name: 'Scotch & Single Malt (ಸ್ಕಾಚ್ & ಸಿಂಗಲ್ ಮಾಲ್ಟ್ ವಿಸ್ಕಿ)', section: 'LIQUID_LOUNGE', sortOrder: 5 });
    const catLlbWine = await MenuCategory.create({ name: 'Wine (ವೈನ್)', section: 'LIQUID_LOUNGE', sortOrder: 6 });
    const catLlbTequila = await MenuCategory.create({ name: 'Tequila (ಟೆಕಿಲಾ)', section: 'LIQUID_LOUNGE', sortOrder: 7 });
    const catLlbBeer = await MenuCategory.create({ name: 'Beer (ಬೀರ್)', section: 'LIQUID_LOUNGE', sortOrder: 8 });
    const catLlbBreezer = await MenuCategory.create({ name: 'Breezer (ಬ್ರೀಜರ್)', section: 'LIQUID_LOUNGE', sortOrder: 9 });
    const catLlbMocktail = await MenuCategory.create({ name: 'Mocktails (ಮಾಕ್‌ಟೇಲ್)', section: 'LIQUID_LOUNGE', sortOrder: 10 });
    const catLlbCocktail = await MenuCategory.create({ name: 'Cocktails (ಕಾಕ್‌ಟೇಲ್)', section: 'LIQUID_LOUNGE', sortOrder: 11 });
    const catLlbBeverages = await MenuCategory.create({ name: 'Water & Soft Drinks (ನೀರು ಮತ್ತು ತಂಪು ಪಾನೀಯಗಳು)', section: 'LIQUID_LOUNGE', sortOrder: 12 });

    const llbItems = [
      // 1. Premium Whisky (30ML / 60ML)
      { name: 'Imperial Blue (ಇಂಪೀರಿಯಲ್ ಬ್ಲೂ)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 90, price60ml: 160, isVeg: true },
      { name: 'Mc Dowells Whiskey (ಎಂ ಸಿ ಡೊವೆಲ್ಸ್ ವಿಸ್ಕಿ)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 90, price60ml: 160, isVeg: true },
      { name: 'Royal Stag (ರಾಯಲ್ ಸ್ಟ್ಯಾಗ್)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 125, price60ml: 210, isVeg: true },
      { name: 'Signature Rare (ಸಿಗ್ನೇಚರ್ ರೇರ್)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 150, price60ml: 285, isVeg: true },
      { name: 'Antiquity Blue (ಆಂಟಿಕುಟಿ ಬ್ಲೂ)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 150, price60ml: 285, isVeg: true },
      { name: 'Blenders Pride (ಬ್ಲೆಂಡರ್ಸ್ ಪ್ರೈಡ್)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 150, price60ml: 285, isVeg: true, featured: true },
      { name: 'Signature Premium (ಸಿಗ್ನೇಚರ್ ಪ್ರೀಮಿಯಂ)', categoryId: catLlbWhisky._id, section: 'LIQUID_LOUNGE', price: 160, price60ml: 300, isVeg: true },

      // 2. Brandy (30ML / 60ML)
      { name: 'M C Dowels Brandy (ಮೆಕ್‌ಡೊವೆಲ್ಸ್ ಬ್ರಾಂಡಿ)', categoryId: catLlbBrandy._id, section: 'LIQUID_LOUNGE', price: 85, price60ml: 150, isVeg: true },
      { name: 'Mansion House Brandy (ಮ್ಯಾನ್ಶನ್ ಹೌಸ್ ಬ್ರಾಂಡಿ)', categoryId: catLlbBrandy._id, section: 'LIQUID_LOUNGE', price: 85, price60ml: 150, isVeg: true },
      { name: 'Morpheus Brandy Blue (ಮಾರ್ಫಿಯಸ್ ಬ್ರಾಂಡಿ ಬ್ಲೂ)', categoryId: catLlbBrandy._id, section: 'LIQUID_LOUNGE', price: 175, price60ml: 350, isVeg: true, featured: true },
      { name: 'Morpheus Brandy (ಮಾರ್ಫಿಯಸ್ ಬ್ರಾಂಡಿ)', categoryId: catLlbBrandy._id, section: 'LIQUID_LOUNGE', price: 150, price60ml: 250, isVeg: true },

      // 3. Rum (30ML / 60ML)
      { name: 'Bacardi White Rum (ಬಕಾರ್ಡಿ ವೈಟ್ ರಮ್)', categoryId: catLlbRum._id, section: 'LIQUID_LOUNGE', price: 125, price60ml: 250, isVeg: true },
      { name: 'Old Monk Gold Reserve 12 Years (ಓಲ್ಡ್ ಮಂಕ್ ಗೋಲ್ಡ್ ರಿಸರ್ವ್ 12 ಇಯರ್ಸ್)', categoryId: catLlbRum._id, section: 'LIQUID_LOUNGE', price: 90, price60ml: 165, isVeg: true, featured: true },

      // 4. Vodka (30ML / 60ML)
      { name: 'Smirnoff Orange (ಸ್ಮಿರ್ನಾಫ್ ಆರೆಂಜ್)', categoryId: catLlbVodka._id, section: 'LIQUID_LOUNGE', price: 130, price60ml: 250, isVeg: true },
      { name: 'Smirnoff Plain (ಸ್ಮಿರ್ನಾಫ್ ಪ್ಲೇನ್)', categoryId: catLlbVodka._id, section: 'LIQUID_LOUNGE', price: 130, price60ml: 250, isVeg: true },
      { name: 'Bacardi Apple (ಬಕಾರ್ಡಿ ಆಪಲ್)', categoryId: catLlbVodka._id, section: 'LIQUID_LOUNGE', price: 130, price60ml: 250, isVeg: true },
      { name: 'Smirnoff Apple (ಸ್ಮಿರ್ನಾಫ್ ಆಪಲ್)', categoryId: catLlbVodka._id, section: 'LIQUID_LOUNGE', price: 130, price60ml: 250, isVeg: true },

      // 5. Scotch & Single Malt (30ML / 60ML)
      { name: 'Black Dog Regular (ಬ್ಲಾಕ್ ಡಾಗ್ ರೆಗ್ಯುಲರ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 185, price60ml: 350, isVeg: true },
      { name: 'VAT 69 (ವ್ಯಾಟ್ 69)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 185, price60ml: 350, isVeg: true },
      { name: 'Black Dog 12 Years (ಬ್ಲಾಕ್ ಡಾಗ್ 12 ಇಯರ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 185, price60ml: 350, isVeg: true },
      { name: 'Teachers Highland (ಟೀಚರ್ಸ್ ಹೈಲ್ಯಾಂಡ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 185, price60ml: 350, isVeg: true },
      { name: 'Teachers 50 (ಟೀಚರ್ಸ್ 50)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 300, price60ml: 550, isVeg: true },
      { name: 'Something Special (ಸಮ್‌ಥಿಂಗ್ ಸ್ಪೆಷಲ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 300, price60ml: 550, isVeg: true },
      { name: '100 Pipers Regular (100 ಪೈಪರ್ಸ್ ರೆಗ್ಯುಲರ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 200, price60ml: 385, isVeg: true },
      { name: 'Black & White (ಬ್ಲಾಕ್ ಅಂಡ್ ವೈಟ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 200, price60ml: 385, isVeg: true },
      { name: 'Passport (ಪಾಸ್‌ಪೋರ್ಟ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 200, price60ml: 385, isVeg: true },
      { name: 'Johnnie Walker Red Label (ಜಾನಿ ವಾಕರ್ ರೆಡ್ ಲೇಬಲ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 285, price60ml: 550, isVeg: true },
      { name: 'Johnnie Walker Black Label (ಜಾನಿ ವಾಕರ್ ಬ್ಲಾಕ್ ಲೇಬಲ್)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 475, price60ml: 900, isVeg: true, featured: true },
      { name: 'Amrut Indian Single Malt Whisky (ಅಮೃತ್ ಇಂಡಿಯನ್ ಸಿಂಗಲ್ ಮಾಲ್ಟ್ ವಿಸ್ಕಿ)', categoryId: catLlbScotch._id, section: 'LIQUID_LOUNGE', price: 285, price60ml: 550, isVeg: true, featured: true },

      // 6. Wine (90ML)
      { name: 'Sula Red Wine (ಸೂಲ ರೆಡ್ ವೈನ್ - 90ml)', categoryId: catLlbWine._id, section: 'LIQUID_LOUNGE', price: 250, description: '90 ML Single Serve Glass', isVeg: true },
      { name: 'Fretel White Wine (ಫ್ರೆಟೆಲ್ ವೈಟ್ ವೈನ್ - 90ml)', categoryId: catLlbWine._id, section: 'LIQUID_LOUNGE', price: 250, description: '90 ML Single Serve Glass', isVeg: true },
      { name: 'Sula White Wine (ಸೂಲ ವೈಟ್ ವೈನ್ - 90ml)', categoryId: catLlbWine._id, section: 'LIQUID_LOUNGE', price: 215, description: '90 ML Single Serve Glass', isVeg: true },
      { name: 'Fretel Red Wine (ಫ್ರೆಟೆಲ್ ರೆಡ್ ವೈನ್ - 90ml)', categoryId: catLlbWine._id, section: 'LIQUID_LOUNGE', price: 215, description: '90 ML Single Serve Glass', isVeg: true },

      // 7. Tequila
      { name: 'Souza Tequila (ಸೌಜಾ ಟೆಕಿಲಾ)', categoryId: catLlbTequila._id, section: 'LIQUID_LOUNGE', price: 385, isVeg: true },

      // 8. Beer (650ml / Pint)
      { name: 'Max Ultra (ಮ್ಯಾಕ್ಸ್ ಅಲ್ಟ್ರಾ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 320, isVeg: true },
      { name: 'Budweiser Magnum (ಬಡ್‌ವೈಸರ್ ಮ್ಯಾಗ್ನಂ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 320, isVeg: true },
      { name: 'Carlsberg Strong / Premium (ಕಾರ್ಲ್ಸ್‌ಬರ್ಗ್ ಸ್ಟ್ರಾಂಗ್ / ಪ್ರೀಮಿಯಂ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 320, isVeg: true },
      { name: 'Kingfisher Ultra (ಕಿಂಗ್‌ಫಿಶರ್ ಅಲ್ಟ್ರಾ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 300, isVeg: true, featured: true },
      { name: 'Budweiser Premium (ಬಡ್‌ವೈಸರ್ ಪ್ರೀಮಿಯಂ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 300, isVeg: true },
      { name: 'Tuborg Strong / Green (ಟ್ಯೂಬರ್ಗ್ ಸ್ಟ್ರಾಂಗ್ / ಗ್ರೀನ್ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 300, isVeg: true },
      { name: 'Kingfisher Strong / Premium (ಕಿಂಗ್‌ಫಿಶರ್ ಸ್ಟ್ರಾಂಗ್ / ಪ್ರೀಮಿಯಂ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 300, isVeg: true },
      { name: 'Kingfisher Premium (ಕಿಂಗ್‌ಫಿಶರ್ ಪ್ರೀಮಿಯಂ - 650ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 300, isVeg: true },
      { name: 'Kingfisher Premium / Strong Pint (ಕಿಂಗ್‌ಫಿಶರ್ ಪ್ರೀಮಿಯಂ / ಸ್ಟ್ರಾಂಗ್ ಪಿಂಟ್ - 330ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 160, isVeg: true },
      { name: 'UB Pint (ಯು ಬಿ ಪಿಂಟ್ - 330ml)', categoryId: catLlbBeer._id, section: 'LIQUID_LOUNGE', price: 115, isVeg: true },

      // 9. Breezer
      { name: 'Bacardi Cranberry / Orange (ಬಕಾರ್ಡಿ ಕ್ಯಾನ್‌ಬರಿ / ಆರೆಂಜ್)', categoryId: catLlbBreezer._id, section: 'LIQUID_LOUNGE', price: 185, isVeg: true },
      { name: 'Breezer Orange / Cranberry (ಬ್ರೀಝರ್ ಆರೆಂಜ್ / ಕ್ಯಾನ್ಬರಿ)', categoryId: catLlbBreezer._id, section: 'LIQUID_LOUNGE', price: 225, isVeg: true },

      // 10. Mocktails
      { name: 'Fruit Punch (ಫ್ರೂಟ್ ಪಂಚ್)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 180, description: 'Blend of tropical fruit juices with cream', isVeg: true },
      { name: 'Virgin Mojito (ವರ್ಜಿನ್ ಮೊಜಿತೋ)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 200, description: 'Fresh mint, lime, sugar syrup and sparkling soda', isVeg: true },
      { name: 'Water Melon Mojito (ವಾಟರ್ ಮೆಲನ್ ಮೊಜಿತೋ)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 200, isVeg: true },
      { name: 'Blue Mojito (ಬ್ಲೂ ಮೊಜಿತೋ)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 200, isVeg: true },
      { name: 'Passion Mocktail (ಪ್ಯಾಶನ್ ಮಾಕ್‌ಟೇಲ್)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 200, isVeg: true },
      { name: 'Strawberry Mojito (ಸ್ಟ್ರಾಬೆರಿ ಮೊಜಿತೋ)', categoryId: catLlbMocktail._id, section: 'LIQUID_LOUNGE', price: 200, isVeg: true },

      // 11. Cocktails
      { name: 'Mojito - Rum Based (ಮೊಜಿತೋ - 30ml ರಮ್ ಬೇಸ್)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 325, description: '30ml Rum based refreshing cocktail with mint and lime', isVeg: true, featured: true },
      { name: 'Blue Lagoon (ಬ್ಲೂ ಲೆಗೂನ್)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 325, description: 'Vodka, blue curacao and lemonade', isVeg: true },
      { name: 'Passiontini (ಪ್ಯಾಶಂಟಿನಿ)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 325, isVeg: true },
      { name: 'Chocotini (ಚಾಕೋಟಿನಿ)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 325, isVeg: true },
      { name: 'Screw Driver - Vodka Based (ಸ್ಕ್ರೂ ಡ್ರೈವರ್ - 30ml ವೋಡ್ಕಾ ಬೇಸ್)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 325, description: '30ml Vodka based classic cocktail with orange', isVeg: true },
      { name: 'LLB Shot (ಎಲ್.ಎಲ್.ಬಿ. ಶಾಟ್)', categoryId: catLlbCocktail._id, section: 'LIQUID_LOUNGE', price: 180, isVeg: true },

      // 12. Water & Soft Drinks
      { name: 'Mineral Water 1L (ಮಿನರಲ್ ವಾಟರ್ 1 ಲೀಟರ್)', categoryId: catLlbBeverages._id, section: 'LIQUID_LOUNGE', price: 20, isVeg: true },
      { name: 'Soft Drinks (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್)', categoryId: catLlbBeverages._id, section: 'LIQUID_LOUNGE', price: 25, isVeg: true },
    ];

    await MenuItem.create(llbItems);
    console.log(`✓ ${llbItems.length} Liquid Lounge Bar menu items created`);

    // --- HOTEL RAAMA MENU (Separate Section with Unique Categories & Item IDs) ---
    const catHrEgg = await MenuCategory.create({ name: 'Egg Specialities (ಎಗ್ / ಮೊಟ್ಟೆ ತಿನಿಸುಗಳು)', section: 'HOTEL_RAAMA', sortOrder: 1 });
    const catHrLittleBite = await MenuCategory.create({ name: 'Little Bite (ಲಿಟಲ್ ಬೈಟ್ / ತಿಂಡಿಗಳು)', section: 'HOTEL_RAAMA', sortOrder: 2 });
    const catHrVegs = await MenuCategory.create({ name: 'Vegetables (ವೆಜಿಟೇಬಲ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 3 });
    const catHrNonVegSoup = await MenuCategory.create({ name: 'Non Veg Soup (ನಾನ್‌ವೆಜ್ ಸೂಪ್)', section: 'HOTEL_RAAMA', sortOrder: 4 });
    const catHrSizzler = await MenuCategory.create({ name: 'Sizzler Special (ಸಿಜ್ಲರ್ ಸ್ಪೆಷಲ್)', section: 'HOTEL_RAAMA', sortOrder: 5 });
    const catHrVegSoup = await MenuCategory.create({ name: 'Veg Soups (ವೆಜ್ ಸೂಪ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 6 });
    const catHrTandooriNonVeg = await MenuCategory.create({ name: 'Tandoori Non Veg (ತಂದೂರಿ ನಾನ್‌ವೆಜ್)', section: 'HOTEL_RAAMA', sortOrder: 7 });
    const catHrChickenCurry = await MenuCategory.create({ name: 'Chicken Special Curry (ಚಿಕನ್ ಸ್ಪೆಷಲ್ ಕರಿ)', section: 'HOTEL_RAAMA', sortOrder: 8 });
    const catHrChineseBites = await MenuCategory.create({ name: 'Chinese & Indian Bites (ಚೈನೀಸ್ & ಇಂಡಿಯನ್ ಬೈಟ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 9 });
    const catHrMuttonSpecial = await MenuCategory.create({ name: 'Mutton Special (ಮಟನ್ ಸ್ಪೆಷಲ್)', section: 'HOTEL_RAAMA', sortOrder: 10 });
    const catHrMuttonMain = await MenuCategory.create({ name: 'Mutton Main Course (ಮಟನ್ ಮೇನ್ ಕೋರ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 11 });
    const catHrBiriyani = await MenuCategory.create({ name: 'Biriyani (ಬಿರಿಯಾನಿ)', section: 'HOTEL_RAAMA', sortOrder: 12 });
    const catHrRiceNonVeg = await MenuCategory.create({ name: 'Rice & Noodles (Non-Veg) (ರೈಸ್ & ನೂಡಲ್ಸ್ - ನಾನ್‌ವೆಜ್)', section: 'HOTEL_RAAMA', sortOrder: 13 });
    const catHrRiceVeg = await MenuCategory.create({ name: 'Rice & Noodles (Veg) (ರೈಸ್ & ನೂಡಲ್ಸ್ - ವೆಜ್)', section: 'HOTEL_RAAMA', sortOrder: 14 });
    const catHrTandooriVeg = await MenuCategory.create({ name: 'Tandoori (Veg) (ತಂದೂರಿ ವೆಜ್)', section: 'HOTEL_RAAMA', sortOrder: 15 });
    const catHrVegStarters = await MenuCategory.create({ name: 'Veg Starters (ವೆಜ್ ಸ್ಟಾರ್ಟರ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 16 });
    const catHrVegCurry = await MenuCategory.create({ name: 'Vegetable Curry (ವೆಜಿಟೇಬಲ್ ಕರಿ)', section: 'HOTEL_RAAMA', sortOrder: 17 });
    const catHrIndianBreads = await MenuCategory.create({ name: 'Indian Breads (ಇಂಡಿಯನ್ ಬ್ರೆಡ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 18 });
    const catHrKadai = await MenuCategory.create({ name: 'Kadai Special (ಕಡಾಯಿ ಸ್ಪೆಷಲ್)', section: 'HOTEL_RAAMA', sortOrder: 19 });
    const catHrSeaFood = await MenuCategory.create({ name: 'Sea Food Seasonal (ಸೀ ಫುಡ್ ಸೀಸನಲ್)', section: 'HOTEL_RAAMA', sortOrder: 20 });
    const catHrSoftDrinks = await MenuCategory.create({ name: 'Soft Drinks and More (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್ ಮತ್ತು ಇತರೆ)', section: 'HOTEL_RAAMA', sortOrder: 21 });
    const catHrDal = await MenuCategory.create({ name: 'Dal Special (ದಾಲ್ ಸ್ಪೆಷಲ್)', section: 'HOTEL_RAAMA', sortOrder: 22 });
    const catHrKofta = await MenuCategory.create({ name: 'Kofta & Stuffed (ಕೋಫ್ತಾ ಮತ್ತು ಸ್ಟಫ್ಡ್)', section: 'HOTEL_RAAMA', sortOrder: 23 });
    const catHrJuices = await MenuCategory.create({ name: 'Fresh Fruit Juices & Shakes (ಫ್ರೆಶ್ ಫ್ರೂಟ್ ಜ್ಯೂಸ್ & ಮಿಲ್ಕ್ ಶೇಕ್ಸ್)', section: 'HOTEL_RAAMA', sortOrder: 24 });
    const catHrFrozen = await MenuCategory.create({ name: 'Frozen Treat (ಫ್ರೋಜನ್ ಟ್ರೀಟ್)', section: 'HOTEL_RAAMA', sortOrder: 25 });
    const catHrIceCream = await MenuCategory.create({ name: 'Ice Creams Scoop (ಐಸ್ ಕ್ರೀಮ್ಸ್ ಸ್ಕೂಪ್)', section: 'HOTEL_RAAMA', sortOrder: 26 });

    const hotelRaamaItems = [
      // 1. Egg Specialities
      { name: 'Egg Burji (ಎಗ್ ಬುರ್ಜಿ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 85, isVeg: false },
      { name: 'Egg Pakoda (ಎಗ್ ಪಕೋಡ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Egg Schezwan Fried Rice (ಎಗ್ ಸೆಜುವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 165, isVeg: false },
      { name: 'Egg Manchurian (ಎಗ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 145, isVeg: false },
      { name: 'Egg Chilly (ಎಗ್ ಚಿಲ್ಲಿ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 145, isVeg: false },
      { name: 'Egg Masala (ಎಗ್ ಮಸಾಲಾ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 145, isVeg: false },
      { name: 'Egg Pepper Dry (ಎಗ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 145, isVeg: false },
      { name: 'Egg Mughlai Curry (ಎಗ್ ಮೊಗಲಾಯ್ ಕರಿ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 175, isVeg: false },
      { name: 'Egg Ghee Roast (ಎಗ್ ಘೀ ರೋಸ್ಟ್)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 175, isVeg: false },
      { name: 'Egg Kheema Masala (ಎಗ್ ಖೀಮಾ ಮಸಾಲಾ)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 175, isVeg: false },
      { name: 'Egg Half Fry (ಎಗ್ ಹಾಫ್ ಫ್ರೈ - 2 Eggs)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 75, isVeg: false },
      { name: 'Egg Full Fry (ಎಗ್ ಫುಲ್ ಫ್ರೈ - 2 Eggs)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 75, isVeg: false },
      { name: 'Omelette (ಆಮ್ಲೆಟ್ - 2 Eggs)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 75, isVeg: false },
      { name: 'Boiled Egg (ಬಾಯಿಲ್ಡ್ - 2 Eggs)', categoryId: catHrEgg._id, section: 'HOTEL_RAAMA', price: 75, isVeg: false },

      // 2. Little Bite
      { name: 'Cashew Fry (ಕ್ಯಾಶ್ಯು ಫ್ರೈ)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 220, isVeg: true },
      { name: 'Raja Special (ರಾಜಾ ಸ್ಪೇಷಲ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Peanut Plain (ಪೀನಟ್ ಪ್ಲೇನ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 80, isVeg: true },
      { name: 'Finger Chips (ಫಿಂಗರ್ ಚಿಪ್ಸ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },
      { name: 'Green Salad (ಗ್ರೀನ್ ಸಲಾಡ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 65, isVeg: true },
      { name: 'Papad Fried (ಪಾಪಡ್ ಫ್ರೈಡ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 30, isVeg: true },
      { name: 'Papad Roasted (ಪಾಪಡ್ ರೋಸ್ಟೆಡ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 30, isVeg: true },
      { name: 'Masala Papad (ಮಸಾಲಾ ಪಾಪಡ್)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 50, isVeg: true },
      { name: 'Corn Fry (ಕಾರ್ನ್ ಫ್ರೈ)', categoryId: catHrLittleBite._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },

      // 3. Vegetables
      { name: 'Boiled Vegetable (ಬಾಯಿಲ್ಡ್ ವೆಜಿಟೇಬಲ್)', categoryId: catHrVegs._id, section: 'HOTEL_RAAMA', price: 125, isVeg: true },
      { name: 'Vegetable Ghee Roast (ವೆಜಿಟೇಬಲ್ ಘೀ ರೋಸ್ಟ್)', categoryId: catHrVegs._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Crispy Vegetable (ಕ್ರಿಸ್ಪಿ ವೆಜಿಟೇಬಲ್)', categoryId: catHrVegs._id, section: 'HOTEL_RAAMA', price: 130, isVeg: true },

      // 4. Non Veg Soup
      { name: 'Cream of Chicken (ಕ್ರೀಮ್ ಆಫ್ ಚಿಕನ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Sweet Corn Chicken (ಸ್ವೀಟ್ ಕಾರ್ನ್ ಚಿಕನ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Hot N Sour Chicken (ಹಾಟ್ ಎನ್ ಸೋರ್ ಚಿಕನ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Chicken Coriander (ಚಿಕನ್ ಕೋರಿಯಾಂಡರ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Chicken Manchow Soup (ಚಿಕನ್ ಮ್ಯಾನ್ ಚೌ ಸೂಪ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Chicken Clear Soup (ಚಿಕನ್ ಕ್ಲಿಯರ್ ಸೂಪ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 125, isVeg: false },
      { name: 'Mutton Clear Soup (ಮಟನ್ ಕ್ಲಿಯರ್ ಸೂಪ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 140, isVeg: false },
      { name: 'Mutton Manchow (ಮಟನ್ ಮ್ಯಾನ್ ಚೌ)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 140, isVeg: false },
      { name: 'Mutton Hot N Sour (ಮಟನ್ ಹಾಟ್ ಎನ್ ಸೋರ್)', categoryId: catHrNonVegSoup._id, section: 'HOTEL_RAAMA', price: 140, isVeg: false },

      // 5. Sizzler Special
      { name: 'Chicken Slice Sizzler (ಚಿಕನ್ ಸ್ಲೈಸ್ ಸಿಜ್ಲರ್)', categoryId: catHrSizzler._id, section: 'HOTEL_RAAMA', price: 325, isVeg: false, featured: true },
      { name: 'Vegetable Sizzler (ವೆಜಿಟಬಲ್ ಸಿಜ್ಲರ್)', categoryId: catHrSizzler._id, section: 'HOTEL_RAAMA', price: 285, isVeg: true },

      // 6. Veg Soups
      { name: 'Cream of Tomato (ಕ್ರೀಮ್ ಆಫ್ ಟೊಮೆಟೋ)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Veg Sweet Corn Soup (ವೆಜ್ ಸ್ವೀಟ್ ಕಾರ್ನ್ ಸೂಪ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Veg Manchow (ವೆಜ್ ಮ್ಯಾನ್ ಚೌ)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Veg Clear Soup (ವೆಜ್ ಕ್ಲಿಯರ್ ಸೂಪ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Veg Hot N Sour (ವೆಜ್ ಹಾಟ್ ಎನ್ ಸೋರ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Mushroom Soup (ಮಶ್ರೂಮ್ ಸೂಪ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Coriander Soup (ಕೋರಿಯಾಂಡರ್ ಸೂಪ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Tomato Soup (ಟೊಮೆಟೋ ಸೂಪ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Cream of Mushroom (ಕ್ರೀಮ್ ಆಫ್ ಮಶ್ರೂಮ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Bamboo Shoot (ಬ್ಯಾಂಬೂ ಶೂಟ್)', categoryId: catHrVegSoup._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },

      // 7. Tandoori Non Veg
      { name: 'Chicken Achari Tikka (ಚಿಕನ್ ಆಚಾರಿ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Steak (ಚಿಕನ್ ಸ್ಟೀಕ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 280, isVeg: false },
      { name: 'Chicken Tikka (ಚಿಕನ್ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Hariyali Tikka (ಚಿಕನ್ ಹರಿಯಾಲಿ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Kalmi One Piece (ಕಲ್ಮಿ ಒನ್ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 110, isVeg: false },
      { name: 'Kalmi Two Piece (ಕಲ್ಮಿ ಟೂ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Tangadi Kabab One Piece (ತಂಗಡಿ ಕಬಾಬ್ ಒನ್ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 130, isVeg: false },
      { name: 'Tangadi Kabab Two Piece (ತಂಗಡಿ ಕಬಾಬ್ ಟೂ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 230, isVeg: false },
      { name: 'Chicken Simhapoori One Piece (ಚಿಕನ್ ಸಿಂಹಪುರಿ ಒನ್ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 155, isVeg: false },
      { name: 'Chicken Simhapoori Two Piece (ಚಿಕನ್ ಸಿಂಹಪುರಿ ಟೂ ಪೀಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 285, isVeg: false },
      { name: 'Chicken Tandoori Full (ತಂದೂರಿ ಚಿಕನ್ ಫುಲ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 440, isVeg: false, featured: true },
      { name: 'Chicken Seekh Kabab (ಚಿಕನ್ ಸೀಕ್ ಕಬಾಬ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Non Veg Platters Tandoori (ನಾನ್ ವೆಜ್ ಪ್ಲಾಟರ್ಸ್ ತಂದೂರಿ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 999, isVeg: false, featured: true },
      { name: 'Veg Platters (ವೆಜ್ ಪ್ಲಾಟರ್ಸ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 449, isVeg: true },
      { name: 'Punjabi Tikka (ಪಂಜಾಬಿ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Nawabi Tikka (ಚಿಕನ್ ನವಾಬಿ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Malai Tikka (ಚಿಕನ್ ಮಲಾಯ್ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Reshmi Kabab (ಚಿಕನ್ ರೇಷ್ಮಿ ಕಬಾಬ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Tandoori Lollipop (ಚಿಕನ್ ತಂದೂರಿ ಲಾಲಿಪಾಪ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Chicken Tandoori Kabab (ಚಿಕನ್ ತಂದೂರಿ ಕಬಾಬ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Tandoori Chicken Half (ತಂದೂರಿ ಚಿಕನ್ ಹಾಫ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },
      { name: 'Sholay Kabab (ಶೋಲೇ ಕಬಾಬ್)', categoryId: catHrTandooriNonVeg._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false },

      // 8. Chicken Special Curry
      { name: 'Chicken Saagwala Full (ಚಿಕನ್ ಸಾಗ್‌ವಾಲಾ ಫುಲ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 360, isVeg: false },
      { name: 'Chicken Green Full (ಚಿಕನ್ ಗ್ರೀನ್ ಫುಲ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 360, isVeg: false },
      { name: 'Chicken Peshawari Full (ಚಿಕನ್ ಪೇಶಾವಾರಿ ಫುಲ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 360, isVeg: false },
      { name: 'Butter Chicken Full Bone Less (ಬಟರ್ ಚಿಕನ್ ಫುಲ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 360, isVeg: false, featured: true },
      { name: 'Murgh Masala Full (ಮುರ್ಗ್ ಮಸಾಲಾ ಫುಲ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 360, isVeg: false },
      { name: 'Chicken Green Half (ಚಿಕನ್ ಗ್ರೀನ್ ಹಾಫ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Peshawari Half (ಚಿಕನ್ ಪೇಶಾವಾರಿ ಹಾಫ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Handi (ಚಿಕನ್ ಹಂಡಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Kadai (ಚಿಕನ್ ಕಡಾಯಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Masala (ಚಿಕನ್ ಮಸಾಲಾ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Butter Chicken Half Bone Less (ಬಟರ್ ಚಿಕನ್ ಹಾಫ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Murgh Masala Half (ಮುರ್ಗ್ ಮಸಾಲಾ ಹಾಫ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Saagwala Half (ಚಿಕನ್ ಸಾಗ್‌ವಾಲಾ ಹಾಫ್)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Bharta (ಚಿಕನ್ ಭರ್ತಾ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Dopyaza (ಚಿಕನ್ ದೋ ಪ್ಯಾವಾ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Kalimirchi (ಚಿಕನ್ ಕಾಲಿಮಿರ್ಚಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Hyderabadi (ಚಿಕನ್ ಹೈದ್ರಾಬಾದಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Kolhapuri (ಚಿಕನ್ ಕೊಲ್ಲಾಪೂರಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Tikka Masala (ಚಿಕನ್ ಟಿಕ್ಕಾ ಮಸಾಲಾ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Mangalore Curry (ಚಿಕನ್ ಮಂಗಳೂರು ಕರಿ)', categoryId: catHrChickenCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },

      // 9. Chinese & Indian Bites
      { name: 'Kalmi Ghee Roast [Two Pcs] (ಕಲ್ಮಿ ಘೀ ರೋಸ್ಟ್ ಟೂ ಪೀಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Drums of Heaven (ಡ್ರಮ್ಸ್ ಆಫ್ ಹೆವನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 260, isVeg: false, featured: true },
      { name: 'Kalmi Ghee Roast (One Pcs) (ಕಲ್ಮಿ ಘೀ ರೋಸ್ಟ್ ಒನ್ ಪೀಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 130, isVeg: false },
      { name: 'Chicken Pepper Nati [Dry Bone Less] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 260, isVeg: false },
      { name: 'Chicken Lollipop (ಚಿಕನ್ ಲಾಲಿಪಾಪ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false, featured: true },
      { name: 'Chicken Ghee Roast (ಚಿಕನ್ ಘೀ ರೋಸ್ಟ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken 65(Bone Less) (ಚಿಕನ್ 65 ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Chilly(Bone Less) (ಚಿಕನ್ ಚಿಲ್ಲಿ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Manchurian (Bone Less) (ಚಿಕನ್ ಮಂಚೂರಿಯನ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Schezwan Chicken (Bone Less) (ಸೆಜುವಾನ್ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken (Palak or Pudina)Dry (ಚಿಕನ್ ಪಾಲಕ್ / ಪುದಿನಾ ಡ್ರೈ)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Lemon Chicken (ಲೆಮನ್ ಚಿಕನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Garlic Chicken (ಗಾರ್ಲಿಕ್ ಚಿಕನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Ginger Chicken (ಜಿಂಜರ್ ಚಿಕನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Pepper Dry (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Spring Roll (ಚಿಕನ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Guntur Chicken {Bone Less} (ಗುಂಟೂರ್ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Andhra Style Chilly Chicken [Bone Less] (ಆಂಧ್ರ ಸ್ಟೈಲ್ ಚಿಲ್ಲಿ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Sukka (ಚಿಕನ್ ಸುಕ್ಕಾ)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Nellore (ಚಿಕನ್ ನೆಲ್ಲೂರ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Pepper Dry [With Bone] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ವಿತ್ ಬೋನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Kabab 8 (ಚಿಕನ್ ಕಬಾಬ್ 8)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Guntur Chicken (ಗುಂಟೂರ್ ಚಿಕನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Varuval (With Bone) (ಚಿಕನ್ ಓರವಲ್ ವಿತ್ ಬೋನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Khsatriya Chicken (ಕ್ಷತ್ರಿಯಾ ಚಿಕನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Andhra Style Chilly Chicken [Bone] (ಆಂಧ್ರ ಸ್ಟೈಲ್ ಚಿಲ್ಲಿ ಚಿಕನ್ ಬೋನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Curry Leaves Dry (ಚಿಕನ್ ಕರೀ ಲೀವ್ಸ್ ಡ್ರೈ)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Pepper Dry Nati [With Bone] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ ವಿತ್ ಬೋನ್)', categoryId: catHrChineseBites._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },

      // 10. Mutton Special
      { name: 'Mutton Sukka (ಮಟನ್ ಸುಕ್ಕಾ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Pepper Dry Nati (ಮಟನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Pepper Dry (ಮಟನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Chops (ಮಟನ್ ಚಾಪ್ಸ್)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Chilly (ಮಟನ್ ಚಿಲ್ಲಿ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Nellur (ಮಟನ್ ನೆಲ್ಲೂರ್)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Guntur (ಮಟನ್ ಗುಂಟೂರ್)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Ghee Roast (ಮಟನ್ ಘೀ ರೋಸ್ಟ್)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema Ball (ಮಟನ್ ಕೀಮಾ ಬಾಲ್)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Chilly Fry (ಮಟನ್ ಚಿಲ್ಲಿ ಫ್ರೈ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Schezwan Dry (ಮಟನ್ ಸೆಝವಾನ್ ಡ್ರೈ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema Chilly Fry (ಮಟನ್ ಕೀಮಾ ಚಿಲ್ಲಿ ಫ್ರೈ)', categoryId: catHrMuttonSpecial._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },

      // 11. Mutton Main Course
      { name: 'Mutton Masala (ಮಟನ್ ಮಸಾಲಾ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema Hyderabadi (ಮಟನ್ ಕೀಮಾ ಹೈದ್ರಾಬಾದಿ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema with Egg (ಮಟನ್ ಕೀಮಾ ವಿತ್ ಎಗ್)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kadai (ಮಟನ್ ಕಡಾಯಿ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Rogangosh (ಮಟನ್ ರೋಗನ್ ಘೋಷ್)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Saagwala (ಮಟನ್ ಸಾಗ್ ವಾಲಾ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kolhapuri (ಮಟನ್ ಕೊಲ್ಲಾಪುರಿ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Hyderabadi (ಮಟನ್ ಹೈದ್ರಾಬಾದಿ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema Masala (ಮಟನ್ ಕೀಮಾ ಮಸಾಲಾ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Kheema with Mutter (ಮಟನ್ ಕೀಮಾ ವಿತ್ ಮಟರ್)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Mangalorean Curry (ಮಟನ್ ಮಂಗಳೂರಿಯನ್ ಕರಿ)', categoryId: catHrMuttonMain._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },

      // 12. Biriyani
      { name: 'Chicken Biryani (ಚಿಕನ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 240, isVeg: false, featured: true },
      { name: 'Biryani Rice (ಬಿರಿಯಾನಿ ರೈಸ್)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 125, isVeg: true },
      { name: 'Egg Biryani (ಎಗ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 175, isVeg: false },
      { name: 'Veg Biryani (ವೆಜ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 160, isVeg: true },
      { name: 'Mutton Biryani (ಮಟನ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 280, isVeg: false, featured: true },
      { name: 'Mutton Mughlai Biryani (ಮಟನ್ ಮುಗಲಾಯ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mushroom Tikka Biryani (ಮಶ್ರೂಮ್ ಟಿಕ್ಕಾ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 225, isVeg: true },
      { name: 'Chicken Hyderabadi Biryani (ಚಿಕನ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Handi Biryani (ಚಿಕನ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Mughlai Biryani (ಚಿಕನ್ ಮುಗಲ್ಲಾಯ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Tikka Biryani (ಚಿಕನ್ ಟಿಕ್ಕಾ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Mutton Hyderabadi Biryani (ಮಟನ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Mutton Handi Biryani (ಮಟನ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Veg Handi Biryani (ವೆಜ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },
      { name: 'Veg Hyderabadi Biryani (ವೆಜ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },
      { name: 'Veg Mughlai Biryani (ವೆಜ್ ಮುಗಲಾಯ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },
      { name: 'Mushroom Biryani (ಮಶ್ರೂಮ್ ಬಿರಿಯಾನಿ)', categoryId: catHrBiriyani._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },

      // 13. Rice & Noodles (Non-Veg)
      { name: 'Egg Noodles (ಎಗ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: false },
      { name: 'Chicken Chowmein (ಚಿಕನ್ ಚೌಮೆನ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Egg Fried Rice (ಎಗ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: false },
      { name: 'Singapore Chicken Noodles (ಸಿಂಗಾಪೂರ್ ಚಿಕನ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Hakka Noodles (ಚಿಕನ್ ಹಕ್ಕಾ ನೂಡಲ್ಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Fried Rice (ಚಿಕನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 200, isVeg: false },
      { name: 'Chicken Triple Noodles (ಚಿಕನ್ ಟ್ರಿಪಲ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken American Chopsuey (ಚಿಕನ್ ಅಮೆರಿಕನ್ ಚೋಪ್ಸಿ)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Schezwan Fried Rice (ಚಿಕನ್ ಸೆಜುವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Garlic Fried Rice (ಚಿಕನ್ ಗಾರ್ಲಿಕ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Mutton Fried Rice (ಮಟನ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Chicken Schezwan Noodles (ಚಿಕನ್ ಸೆಜುವಾನ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Mix Non Veg Fried Rice (ಮಿಕ್ಸ್ ನಾನ್ ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },
      { name: 'Chicken Triple Fried Rice (ಚಿಕನ್ ಟ್ರಿಪಲ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceNonVeg._id, section: 'HOTEL_RAAMA', price: 250, isVeg: false },

      // 14. Rice & Noodles (Veg)
      { name: 'Veg Chowmein (ವೆಜ್ ಚೌಮೆನ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Palak Rice (ಪಾಲಕ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Basmathi Steamed Rice (ಬಾಸುಮತಿ ಸ್ಟೀಮ್ಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 95, isVeg: true },
      { name: 'Plain Rice (ಪ್ಲೇನ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 55, isVeg: true },
      { name: 'Curd Rice (ಕರ್ಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },
      { name: 'Lemon Rice (ಲೆಮನ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },
      { name: 'Schezwan Veg Fried Rice (ಸೆಜುವಾನ್ ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 160, isVeg: true },
      { name: 'Veg Triple Fried Rice (ವೆಜ್ ಟ್ರಿಪಲ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 160, isVeg: true },
      { name: 'Schezwan Veg Noodles (ಸೆಜುವಾನ್ ವೆಜ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Hakka Noodles Veg (ಹಕ್ಕಾ ನೂಡಲ್ಸ್ ವೆಜ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Veg Fried Rice (ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Veg Triple Noodles (ವೆಜ್ ಟ್ರಿಪಲ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg American Chopsuey (ಚೌಮೆನ್ ಅಮೆರಿಕನ್ ಚೋಪ್ಸಿ)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Garlic Fried Rice (ಗಾರ್ಲಿಕ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Paneer Fried Rice (ಪನ್ನೀರ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mushroom Fried Rice (ಮಶ್ರೂಮ್ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Pulav (ವೆಜ್ ಪುಲಾವ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Peas Pulav (ಪೀಸ್ ಪುಲಾವ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Singapore Rice (ಸಿಂಗಾಪೂರ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Veg Singapore Noodles (ವೆಜ್ ಸಿಂಗಾಪೂರ್ ನೂಡಲ್ಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Jeera Fried Rice (ಜೀರಾ ಫ್ರೈಡ್ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Dal Khichadi (ದಾಲ್ ಕಿಚಡಿ)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Ghee Rice (ಘೀ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Jeera Rice (ಜೀರಾ ರೈಸ್)', categoryId: catHrRiceVeg._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },

      // 15. Tandoori (Veg)
      { name: 'Mushroom Tikka (ಮಶ್ರೂಮ್ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Paneer Tikka (ಪನ್ನೀರ್ ಟಿಕ್ಕಾ)', categoryId: catHrTandooriVeg._id, section: 'HOTEL_RAAMA', price: 220, isVeg: true, featured: true },
      { name: 'Tandoori Babycorn (ತಂದೂರಿ ಬೇಬಿ ಕಾರ್ನ್)', categoryId: catHrTandooriVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Tandoori Mushroom (ತಂದೂರಿ ಮಶ್ರೂಮ್)', categoryId: catHrTandooriVeg._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },

      // 16. Veg Starters
      { name: 'Paneer Manchurian (ಪನ್ನೀರ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Paneer Chilly (ಪನ್ನೀರ್ ಚಿಲ್ಲಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Lemon Paneer (ಲೆಮನ್ ಪನ್ನೀರ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Guntur Paneer (ಗುಂಟೂರ್ ಪನ್ನೀರ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Paneer Pepper Dry (ಪನ್ನೀರ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Paneer Ghee Roast (ಪನ್ನೀರ್ ಘೀ ರೋಸ್ಟ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Spanish Manchurian (ಸ್ಪ್ಯಾನಿಶ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Mushroom Pepper Dry Naati (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Babycorn Pepper Dry Naati (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Gobi Pepper Dry Naati (ಗೋಬಿ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Harabara Kabab (ಹರಬರ ಕಬಾಬ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Gobi Chilly (ಗೋಬಿ ಚಿಲ್ಲಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Gobi Pepper Dry (ಗೋಬಿ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Onion Pakoda (ಆನಿಯನ್ ಪಕೋಡ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },
      { name: 'Capsicum Pakoda (ಕ್ಯಾಪ್ಸಿಕಮ್ ಪಕೋಡ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },
      { name: 'Paneer Satay (ಪನ್ನೀರ್ ಸಾಟೆ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 240, isVeg: true },
      { name: 'Onion Rings (ಆನಿಯನ್ ರಿಂಗ್ಸ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Gobi Manchurian (ಗೋಬಿ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Babycorn - 65 (ಬೇಬಿ ಕಾರ್ನ್ 65)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Spring Roll (ವೆಜ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Ball Manchurian (ವೆಜ್ ಬಾಲ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mushroom Chilly (ಮಶ್ರೂಮ್ ಚಿಲ್ಲಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mushroom Manchurian (ಮಶ್ರೂಮ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mushroom Pepper Dry (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Baby Corn Chilly (ಬೇಬಿ ಕಾರ್ನ್ ಚಿಲ್ಲಿ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Baby Corn Pepper Dry (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Baby Corn Manchurian (ಬೇಬಿ ಕಾರ್ನ್ ಮಂಚೂರಿಯನ್)', categoryId: catHrVegStarters._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },

      // 17. Vegetable Curry
      { name: 'Gobi Masala (ಗೋಬಿ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Tomato Masala (ಟೊಮೆಟೋ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Kaju Masala (ಕಾಜು ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 240, isVeg: true },
      { name: 'Kaju Paneer Masala (ಕಾಜು ಪನ್ನೀರ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 240, isVeg: true },
      { name: 'Aloo Gobi Kurma (ಆಲು ಗೋಬಿ ಕುರ್ಮಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Plain Palak (ಪ್ಲೇನ್ ಪಾಲಕ್)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Veg Makhan Wala (ವೆಜ್ ಮಾಖನ್ ವಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Green Peas Masala (ಗ್ರೀನ್ ಪೀಸ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mix Veg Curry (ಮಿಕ್ಸ್ ವೆಜ್ ಕರಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Kurma (ವೆಜ್ ಕುರ್ಮಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Hyderabadi (ವೆಜ್ ಹೈದೆರಾಬಾದಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Baby Corn Masala (ಬೇಬಿ ಕಾರ್ನ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Jaipuri (ವೆಜ್ ಜೈಪುರಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Veg Kolhapuri (ವೆಜ್ ಕೊಲ್ಲಾಪುರಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Capsicum Masala (ಕ್ಯಾಪ್ಸಿಕಮ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Aloo Palak (ಆಲೂ ಪಾಲಕ್)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Mushroom Masala (ಮಶ್ರೂಮ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Paneer Burji (ಪನ್ನೀರ್ ಬುರ್ಜಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: true },
      { name: 'Paneer Guchi (ಪನ್ನೀರ್ ಗುಚ್ಚಿ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: true },
      { name: 'Paneer Tikka Masala (ಪನ್ನೀರ್ ಟಿಕ್ಕಾ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 220, isVeg: true },
      { name: 'Paneer Butter Masala (ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Navratna Kurma (ನವರತ್ನ ಕುರ್ಮಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Paneer Palak (ಪನ್ನೀರ್ ಪಾಲಕ್)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Veg Dopayza (ವೆಜ್ ದೋಪ್ಯಾಝ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },
      { name: 'Shahi Kurma (ಶಾಹಿ ಕುರ್ಮಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },
      { name: 'Veg Patiyala (ವೆಜ್ ಪಟಿಯಾಲಾ)', categoryId: catHrVegCurry._id, section: 'HOTEL_RAAMA', price: 185, isVeg: true },

      // 18. Indian Breads
      { name: 'Roti (ರೋಟಿ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 35, isVeg: true },
      { name: 'Butter Naan (ಬಟರ್ ನಾನ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 50, isVeg: true },
      { name: 'Garlic Naan (ಗಾರ್ಲಿಕ್ ನಾನ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 65, isVeg: true },
      { name: 'Aloo Parota (ಆಲೂ ಪರೋಟ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 70, isVeg: true },
      { name: 'Roti Basket (ರೋಟಿ ಬ್ಯಾಸ್ಕೆಟ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 165, isVeg: true },
      { name: 'Roti Basket Butter (ರೋಟಿ ಬ್ಯಾಸ್ಕೆಟ್ ಬಟರ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Butter Roti (ಬಟರ್ ರೋಟಿ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 40, isVeg: true },
      { name: 'Methi Roti (ಮೇಥಿ ರೋಟಿ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 40, isVeg: true },
      { name: 'Pudina Roti (ಪುದಿನಾ ರೋಟಿ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 40, isVeg: true },
      { name: 'Kulcha (ಕುಲ್ಚಾ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 40, isVeg: true },
      { name: 'Butter Garlic Naan (ಬಟರ್ ಗಾರ್ಲಿಕ್ ನಾನ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 75, isVeg: true },
      { name: 'Kashmiri Naan (ಕಾಶ್ಮೀರಿ ನಾನ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 75, isVeg: true },
      { name: 'Naan (ನಾನ್)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 45, isVeg: true },
      { name: 'Butter Kulcha (ಬಟರ್ ಕುಲ್ಚಾ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 45, isVeg: true },
      { name: 'Parota (ಪರೋಟ)', categoryId: catHrIndianBreads._id, section: 'HOTEL_RAAMA', price: 45, isVeg: true },

      // 19. Kadai Special
      { name: 'Paneer Kadai (ಪನ್ನೀರ್ ಕಡಾಯ್)', categoryId: catHrKadai._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Kadai Mushroom (ಕಡಾಯ್ ಮಶ್ರೂಮ್)', categoryId: catHrKadai._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Kadai Gobi Mutter (ಕಡಾಯ್ ಗೋಬಿ ಮಟರ್)', categoryId: catHrKadai._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Kadai Mix Veg (ಕಡಾಯ್ ಮಿಕ್ಸ್ ವೆಜ್)', categoryId: catHrKadai._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Kadai Veg Kollapori (ಕಡಾಯ್ ವೆಜ್ ಕೊಲ್ಲಾಪುರಿ)', categoryId: catHrKadai._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },

      // 20. Sea Food Seasonal
      { name: 'Pomfret Masala (ಪ್ರೋಂಫ್ರೆಟ್ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 320, isVeg: false },
      { name: 'Pomfret Tawa (ಪ್ರೋಂಫ್ರೆಟ್ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 320, isVeg: false },
      { name: 'Pomfret Rava (ಪ್ರೋಂಫ್ರೆಟ್ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 320, isVeg: false },
      { name: 'Pomfret Naget Fry (ಪ್ರೋಂಫ್ರೆಟ್ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 320, isVeg: false },
      { name: 'Bangda Masala (ಬಾಂಗ್ಡಾ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Bangda Tawa (ಬಾಂಗ್ಡಾ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Bangda Rava (ಬಾಂಗ್ಡಾ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Bangda Naget Fry (ಬಾಂಗ್ಡಾ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 220, isVeg: false },
      { name: 'Badshah Masala (ಬಾದ್‌ಶಾ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Badshah Tawa (ಬಾದ್‌ಶಾ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Badshah Rava (ಬಾದ್‌ಶಾ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Badshah Naget Fry (ಬಾದ್‌ಶಾ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Prawns Masala (ಪ್ರಾನ್ಸ್ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Prawns Tawa (ಪ್ರಾನ್ಸ್ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Prawns Rava (ಪ್ರಾನ್ಸ್ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Prawns Naget Fry (ಪ್ರಾನ್ಸ್ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 300, isVeg: false },
      { name: 'Anjal Masala (ಅಂಜಾಲ್ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 340, isVeg: false },
      { name: 'Anjal Tawa (ಅಂಜಾಲ್ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 340, isVeg: false },
      { name: 'Anjal Rava (ಅಂಜಾಲ್ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 340, isVeg: false },
      { name: 'Anjal Naget Fry (ಅಂಜಾಲ್ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 340, isVeg: false },
      { name: 'Tiger Prawns Masala (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ಮಸಾಲಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 380, isVeg: false },
      { name: 'Tiger Prawns Tawa (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ತವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 380, isVeg: false },
      { name: 'Tiger Prawns Rava (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ರವಾ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 380, isVeg: false },
      { name: 'Tiger Prawns Naget Fry (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ನಗೆಟ್ ಫ್ರೈ)', categoryId: catHrSeaFood._id, section: 'HOTEL_RAAMA', price: 380, isVeg: false },

      // 21. Soft Drinks and More
      { name: 'Softdrinks (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 25, isVeg: true },
      { name: 'Plain Curds (ಪ್ಲೇನ್ ಕರ್ಡ್ಸ್)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 35, isVeg: true },
      { name: 'Lassi (ಲಸ್ಸಿ)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 65, isVeg: true },
      { name: 'Butter Milk (ಬಟರ್ ಮಿಲ್ಕ್)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 50, isVeg: true },
      { name: 'Rasam (ರಸಂ)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 35, isVeg: true },
      { name: 'Ice Cubes (ಐಸ್ ಕ್ಯೂಬ್ಸ್)', categoryId: catHrSoftDrinks._id, section: 'HOTEL_RAAMA', price: 50, isVeg: true },

      // 22. Dal Special
      { name: 'Dal Fry (ದಾಲ್ ಫ್ರೈ)', categoryId: catHrDal._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Dal Punjabi (ದಾಲ್ ಪಂಜಾಬಿ)', categoryId: catHrDal._id, section: 'HOTEL_RAAMA', price: 140, isVeg: true },
      { name: 'Dal Tadka (ದಾಲ್ ತಡ್ಕಾ)', categoryId: catHrDal._id, section: 'HOTEL_RAAMA', price: 130, isVeg: true },
      { name: 'Dal Palak (ದಾಲ್ ಪಾಲಕ್)', categoryId: catHrDal._id, section: 'HOTEL_RAAMA', price: 130, isVeg: true },

      // 23. Kofta and Stuffed
      { name: 'Panner Kofta (ಪನ್ನೀರ್ ಕೋಫ್ತಾ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Malai Kofta (ಮಲಾಯ್ ಕೋಫ್ತಾ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Veg Kofta (ವೆಜ್ ಕೋಫ್ತಾ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Stuffed Kofta (ಸ್ಟಫ್ಡ್ ಕೋಫ್ತಾ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 200, isVeg: true },
      { name: 'Stuffed Capsicum (ಸ್ಟಫ್ಡ್ ಕ್ಯಾಪ್ಸಿಕಮ್)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Nargis Kofta (ನರ್ಗೀಸ್ ಕೋಫ್ತಾ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 180, isVeg: true },
      { name: 'Stuffed Aloo (ಸ್ಟಫ್ಡ್ ಆಲೂ)', categoryId: catHrKofta._id, section: 'HOTEL_RAAMA', price: 170, isVeg: true },

      // 24. Fresh Fruit Juices & Shakes
      { name: 'Water Melon (ವಾಟರ್ ಮೆಲನ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Fresh Lime Juice (ಫ್ರೆಶ್ ಲೈಮ್ ಜ್ಯೂಸ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 50, isVeg: true },
      { name: 'Fresh Lime Soda (ಫ್ರೆಶ್ ಲೈಮ್ ಸೋಡ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 80, isVeg: true },
      { name: 'Mint Lime Water (ಮಿಂಟ್ ಲೈಮ್ ವಾಟರ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 60, isVeg: true },
      { name: 'Mint Lime Soda (ಮಿಂಟ್ ಲೈಮ್ ಸೋಡ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 80, isVeg: true },
      { name: 'Milk Shake Mango (ಮಿಲ್ಕ್ ಶೇಕ್ ಮ್ಯಾಂಗೋ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Chikku (ಮಿಲ್ಕ್ ಶೇಕ್ ಚಿಕ್ಕು)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Apple (ಮಿಲ್ಕ್ ಶೇಕ್ ಆಪಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Seasonal (ಮಿಲ್ಕ್ ಶೇಕ್ ಸೀಸೋನಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Vanilla (ಮಿಲ್ಕ್ ಶೇಕ್ ವೆನಿಲಾ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Strawberry (ಮಿಲ್ಕ್ ಶೇಕ್ ಸ್ಟ್ರಾಬೆರಿ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Pista (ಮಿಲ್ಕ್ ಶೇಕ್ ಪಿಸ್ತಾ)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Milk Shake Chocolate (ಮಿಲ್ಕ್ ಶೇಕ್ ಚಾಕೋಲೇಟ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Musambi Seasonal (ಮೂಸಂಬಿ ಸೀಸೋನಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Orange Juice Seasonal (ಆರೆಂಜ್ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Grape Juice Seasonal (ಗ್ರೇಪ್ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Pineapple (ಪೈನಾಪಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Mango Juice Seasonal (ಮ್ಯಾಂಗೋ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)', categoryId: catHrJuices._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },

      // 25. Frozen Treat
      { name: 'Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Fruit Salad with Ice Cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಐಸ್‌ಕ್ರೀಮ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 120, isVeg: true },
      { name: 'Raja Rani (ರಾಜಾ ರಾಣಿ)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'My Darling (ಮೈ ಡಾರ್ಲಿಂಗ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Golden Cherry (ಗೋಲ್ಡನ್ ಚೆರ್ರಿ)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Nut Sunday (ನಟ್ ಸಂಡೆ)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Honey Moon Spl (ಹನಿ ಮೂನ್ ಸ್ಪೇಷಲ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Gudbud (ಘಡ್‌ಬಡ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Vanilla Sunday (ವೆನಿಲಾ ಸಂಡೆ)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'My Dream (ಮೈ ಡ್ರೀಮ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 150, isVeg: true },
      { name: 'Raama Spl (ರಾಮಾ ಸ್ಪೇಷಲ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true, featured: true },
      { name: 'Triple Sunday (ಟ್ರಿಪಲ್ ಸಂಡೆ)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 175, isVeg: true },
      { name: 'Fruit Salad with Jelly & Ice Cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಜೆಲ್ಲಿ ಅಂಡ್ ಐಸ್‌ಕ್ರೀಮ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 130, isVeg: true },
      { name: 'Cut Fruit (ಕಟ್ ಫ್ರೂಟ್)', categoryId: catHrFrozen._id, section: 'HOTEL_RAAMA', price: 110, isVeg: true },

      // 26. Ice Creams Scoop
      { name: 'Dry Fruit (ಡ್ರೈ ಫ್ರೂಟ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Black Currant (ಬ್ಲಾಕ್ ಕರಂಟ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 100, isVeg: true },
      { name: 'Chocolate (ಚಾಕ್ಲೇಟ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Pista (ಪಿಸ್ತಾ)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Vanilla (ವೆನಿಲ್ಲಾ)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Mango (ಮ್ಯಾಂಗೋ)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Strawberry (ಸ್ಟ್ರಾಬೆರಿ)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Butterscotch (ಬಟರ್ ಸ್ಕಾಚ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 85, isVeg: true },
      { name: 'Gulab Jamun (ಗುಲಾಬ್ ಜಾಮೂನ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 35, isVeg: true },
      { name: 'Jamun with Ice Cream (ಜಾಮೂನ್ ವಿತ್ ಐಸ್‌ಕ್ರೀಮ್)', categoryId: catHrIceCream._id, section: 'HOTEL_RAAMA', price: 55, isVeg: true },
    ];

    await MenuItem.create(hotelRaamaItems);
    console.log(`✓ ${hotelRaamaItems.length} Hotel Raama menu items created`);

    // --- SAMBHRAMA PARTY HALL ---
    const partyCategory = await MenuCategory.create({ name: 'Party Packages', section: 'SAMBHRAMA', sortOrder: 1 });
    await MenuItem.create([
      { name: 'Choice of Veg Menu', categoryId: partyCategory._id, section: 'SAMBHRAMA', price: 450, description: 'Welcome drink, Kosambari, Palya, Payasa, 1 Fried item, 1 Poori/Akki Roti/Dosa/Pulao, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)', isVeg: true, featured: true },
      { name: 'Choice of 2 Veg Menu', categoryId: partyCategory._id, section: 'SAMBHRAMA', price: 500, description: 'Welcome drink, Veg Soup, Kosambari, 1 Fried item, 1 Poori/Akki Roti/Dosa, 1 Pulao/Biriyani, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)', isVeg: true, featured: true },
      { name: 'Multiple Cuisine Menu', categoryId: partyCategory._id, section: 'SAMBHRAMA', price: 550, description: 'Welcome drink, Veg Soup, 2 Salads, 1 Veg starter, 1 Main course, 1 Dal, 2 Breads, 1 Pulao/Biriyani, Rice, Sweet, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)', isVeg: true, featured: true },
    ]);
    console.log('✓ Sambhrama Party Hall menu packages created');

    console.log('\n========================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seed();
}
