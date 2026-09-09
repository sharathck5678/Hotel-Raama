export const FALLBACK_HOTEL_INFO = {
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
};

export const FALLBACK_ROOM_TYPES = [
  {
    _id: 'rt_1',
    name: 'Premium Single Non A/C',
    code: 'PREM_SGL_NONAC',
    description: 'Comfortable single occupancy non-A/C room with queen bed, Wi-Fi, and city views.',
    basePrice: 1200,
    cpPrice: 1350,
    maxOccupancy: 1,
    isAc: false,
    amenities: ['Free Wi-Fi', 'TV', 'Hot Water', 'Work Desk'],
    images: ['/single-occupancy-room.png', '/hotel-corridor.jpg', '/single-room-angle.jpg'],
  },
  {
    _id: 'rt_2',
    name: 'Premium Double Non A/C',
    code: 'PREM_DBL_NONAC',
    description: 'Spacious double occupancy non-A/C room with plush bedding and modern bathroom.',
    basePrice: 1600,
    cpPrice: 1800,
    maxOccupancy: 2,
    isAc: false,
    amenities: ['Free Wi-Fi', 'LED TV', '24/7 Hot Water', 'Daily Housekeeping'],
    images: ['/double-occupancy-room.png', '/hotel-corridor.jpg', '/double-room-angle.png'],
  },
  {
    _id: 'rt_3',
    name: 'Executive Single A/C',
    code: 'EXEC_SGL_AC',
    description: 'Elegant single room with climate control A/C, ergonomic desk, and premium bath accessories.',
    basePrice: 1800,
    cpPrice: 2000,
    maxOccupancy: 1,
    isAc: true,
    amenities: ['Air Conditioning', 'High Speed Wi-Fi', 'Smart TV', 'Room Service'],
    images: ['/single-occupancy-room.png', '/hotel-corridor.jpg', '/single-room-angle.jpg'],
  },
  {
    _id: 'rt_4',
    name: 'Executive Double A/C',
    code: 'EXEC_DBL_AC',
    description: 'Luxurious double A/C room equipped with king-size bed, seating area, and room dining.',
    basePrice: 2200,
    cpPrice: 2500,
    maxOccupancy: 2,
    isAc: true,
    amenities: ['Air Conditioning', 'King Bed', 'Tea/Coffee Maker', 'Minibar', 'Smart TV'],
    images: ['/double-occupancy-room.png', '/hotel-corridor.jpg', '/double-room-angle.png'],
  },
  {
    _id: 'rt_5',
    name: 'Triple Occupancy Premium',
    code: 'TRIPLE_PREM',
    description: 'Generous room designed for families or small groups with 3 comfortable single beds.',
    basePrice: 2400,
    cpPrice: 2750,
    maxOccupancy: 3,
    isAc: false,
    amenities: ['3 Single Beds', 'Free Wi-Fi', 'Spacious Wardrobe', 'Bottled Water'],
    images: ['/triple-occupancy-ac.png', '/hotel-corridor.jpg', '/triple-room-angle.png'],
  },
  {
    _id: 'rt_6',
    name: 'Triple Occupancy Executive A/C',
    code: 'TRIPLE_EXEC',
    description: 'Air-conditioned family room featuring premium bedding, extra seating, and deluxe amenities.',
    basePrice: 2800,
    cpPrice: 3200,

    maxOccupancy: 3,
    isAc: true,
    amenities: ['Air Conditioning', '3 Beds', 'Smart TV', 'Tea/Coffee Station'],
    images: ['/triple-occupancy-ac.png', '/hotel-corridor.jpg', '/triple-room-angle.png'],
  },
  {
    _id: 'rt_7',
    name: 'Suite Room',
    code: 'SUITE_ROOM',
    description: 'Presidential suite with separate living lounge, master bedroom, luxury bathtub, and VIP service.',
    basePrice: 3500,
    cpPrice: 4000,
    maxOccupancy: 4,
    isAc: true,
    amenities: ['Living Room Lounge', 'Jacuzzi / Bathtub', 'Fruit Basket', 'Express Check-in', 'Premium A/C'],
    images: ['/suite-room.png', '/hotel-corridor.jpg', '/suite-room-angle.png'],
  },
];

// Generate Rooms 1 to 40 + Sambhrama Party Hall + Board Room
export const FALLBACK_ROOMS = (() => {

  const rooms: any[] = [];
  const typeMapping = [
    FALLBACK_ROOM_TYPES[0],
    FALLBACK_ROOM_TYPES[1],
    FALLBACK_ROOM_TYPES[2],
    FALLBACK_ROOM_TYPES[3],
    FALLBACK_ROOM_TYPES[4],
    FALLBACK_ROOM_TYPES[5],
    FALLBACK_ROOM_TYPES[6],
  ];

  for (let i = 1; i <= 40; i++) {
    const typeObj = typeMapping[(i - 1) % typeMapping.length];
    rooms.push({
      _id: `room_${i}`,
      roomNumber: `${i}`,
      floor: i <= 20 ? 1 : 2,
      status: 'AVAILABLE',
      qrToken: `qr_token_room_${i}`,
      roomTypeId: {
        _id: typeObj._id,
        name: typeObj.name,
      },
    });
  }

  rooms.push({
    _id: 'room_party_hall',
    roomNumber: 'Sambhrama Party Hall',
    floor: 1,
    status: 'AVAILABLE',
    qrToken: 'qr_token_party_hall',
    roomTypeId: {
      _id: 'rt_7',
      name: 'Grand Sambhrama Party Hall',
    },
  });

  rooms.push({
    _id: 'room_board_room',
    roomNumber: 'Board Room',
    floor: 1,
    status: 'AVAILABLE',
    qrToken: 'qr_token_board_room',
    roomTypeId: {
      _id: 'rt_4',
      name: 'Executive Board Room',
    },
  });

  return rooms;
})();

export const FALLBACK_MENU_CATEGORIES = [
  {
    "_id": "cat_1",
    "name": "South Indian Dishes (ದಕ್ಷಿಣ ಭಾರತೀಯ ತಿನಿಸುಗಳು)",
    "section": "SWAAD",
    "description": "Timings: 7:00 AM to 11:30 AM",
    "sortOrder": 1
  },
  {
    "_id": "cat_2",
    "name": "Dosa Specialities (ದೋಸೆ ಸ್ಪೆಷಲ್)",
    "section": "SWAAD",
    "description": "Timings: 7:00 AM to 11:30 AM & 3:30 PM to 8:30 PM",
    "sortOrder": 2
  },
  {
    "_id": "cat_3",
    "name": "Meals (ಮೀಲ್ಸ್)",
    "section": "SWAAD",
    "description": "South Indian & North Indian Meals",
    "sortOrder": 3
  },
  {
    "_id": "cat_4",
    "name": "North Pulav & Biriyani (ನಾರ್ತ್ ಪಲಾವ್ & ಬಿರಿಯಾನಿ)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 4
  },
  {
    "_id": "cat_5",
    "name": "Starters (ಸ್ಟಾರ್ಟರ್ಸ್)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 5
  },
  {
    "_id": "cat_6",
    "name": "Soups (ಸೂಪ್)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 6
  },
  {
    "_id": "cat_7",
    "name": "Salad (ಸಲಾಡ್)",
    "section": "SWAAD",
    "sortOrder": 7
  },
  {
    "_id": "cat_8",
    "name": "Tandoor Bread (ತಂದೂರ್ ಬ್ರೆಡ್)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 8
  },
  {
    "_id": "cat_9",
    "name": "Vegetable Curry (ವೆಜಿಟೆಬಲ್ ಕರಿ)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 9
  },
  {
    "_id": "cat_10",
    "name": "Kadai Special (ಕಡೈ ಸ್ಪೆಷಲ್)",
    "section": "SWAAD",
    "sortOrder": 10
  },
  {
    "_id": "cat_11",
    "name": "Kofta & Stuffed (ಕೋಫ್ತಾ & ಸ್ಟಫ್ಡ್)",
    "section": "SWAAD",
    "sortOrder": 11
  },
  {
    "_id": "cat_12",
    "name": "Dal & Palak (ದಾಲ್ ಪಾಲಕ್)",
    "section": "SWAAD",
    "sortOrder": 12
  },
  {
    "_id": "cat_13",
    "name": "Chinese Rice & Noodles (ಚೈನೀಸ್ ರೈಸ್ & ನೂಡಲ್ಸ್)",
    "section": "SWAAD",
    "description": "Timings: 12:00 Noon to 3:30 PM & 7:00 PM to 10:00 PM",
    "sortOrder": 13
  },
  {
    "_id": "cat_14",
    "name": "Sandwich & Grilled (ಸ್ಯಾಂಡ್‌ವಿಚ್ & ಗ್ರಿಲ್ಡ್)",
    "section": "SWAAD",
    "sortOrder": 14
  },
  {
    "_id": "cat_15",
    "name": "Sweet Special (ಸ್ವೀಟ್ ಸ್ಪೆಷಲ್)",
    "section": "SWAAD",
    "sortOrder": 15
  },
  {
    "_id": "cat_16",
    "name": "Fresh Fruit Juice (ಫ್ರೆಶ್ ಫ್ರೂಟ್ ಜ್ಯೂಸ್)",
    "section": "SWAAD",
    "description": "Timings: 11:30 AM to 10:00 PM",
    "sortOrder": 16
  },
  {
    "_id": "cat_17",
    "name": "Milkshakes & Lassi (ಮಿಲ್ಕ್ ಶೇಕ್ & ಲಸಿ)",
    "section": "SWAAD",
    "sortOrder": 17
  },
  {
    "_id": "cat_18",
    "name": "Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)",
    "section": "SWAAD",
    "sortOrder": 18
  },
  {
    "_id": "cat_19",
    "name": "Ice Cream Scoop & Cone (ಐಸ್ ಕ್ರೀಮ್ ಸ್ಕೂಪ್ & ಕೋನ್)",
    "section": "SWAAD",
    "sortOrder": 19
  },
  {
    "_id": "cat_20",
    "name": "Special Ice Cream (ಸ್ಪೆಷಲ್ ಐಸ್ ಕ್ರೀಮ್)",
    "section": "SWAAD",
    "sortOrder": 20
  },
  {
    "_id": "cat_21",
    "name": "Hot Beverages (ಬಿಸಿಯಾದ ಪಾನೀಯ)",
    "section": "SWAAD",
    "sortOrder": 21
  },
  {
    "_id": "cat_22",
    "name": "Premium Whisky (ಪ್ರೀಮಿಯಂ ವಿಸ್ಕಿ)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 1
  },
  {
    "_id": "cat_23",
    "name": "Brandy (ಬ್ರಾಂಡಿ)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 2
  },
  {
    "_id": "cat_24",
    "name": "Rum (ರಮ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 3
  },
  {
    "_id": "cat_25",
    "name": "Vodka (ವೋಡ್ಕಾ)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 4
  },
  {
    "_id": "cat_26",
    "name": "Scotch & Single Malt (ಸ್ಕಾಚ್ & ಸಿಂಗಲ್ ಮಾಲ್ಟ್ ವಿಸ್ಕಿ)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 5
  },
  {
    "_id": "cat_27",
    "name": "Wine (ವೈನ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 6
  },
  {
    "_id": "cat_28",
    "name": "Tequila (ಟೆಕಿಲಾ)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 7
  },
  {
    "_id": "cat_29",
    "name": "Beer (ಬೀರ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 8
  },
  {
    "_id": "cat_30",
    "name": "Breezer (ಬ್ರೀಜರ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 9
  },
  {
    "_id": "cat_31",
    "name": "Mocktails (ಮಾಕ್‌ಟೇಲ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 10
  },
  {
    "_id": "cat_32",
    "name": "Cocktails (ಕಾಕ್‌ಟೇಲ್)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 11
  },
  {
    "_id": "cat_33",
    "name": "Water & Soft Drinks (ನೀರು ಮತ್ತು ತಂಪು ಪಾನೀಯಗಳು)",
    "section": "LIQUID_LOUNGE",
    "sortOrder": 12
  },
  {
    "_id": "cat_34",
    "name": "Egg Specialities (ಎಗ್ / ಮೊಟ್ಟೆ ತಿನಿಸುಗಳು)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 1
  },
  {
    "_id": "cat_35",
    "name": "Little Bite (ಲಿಟಲ್ ಬೈಟ್ / ತಿಂಡಿಗಳು)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 2
  },
  {
    "_id": "cat_36",
    "name": "Vegetables (ವೆಜಿಟೇಬಲ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 3
  },
  {
    "_id": "cat_37",
    "name": "Non Veg Soup (ನಾನ್‌ವೆಜ್ ಸೂಪ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 4
  },
  {
    "_id": "cat_38",
    "name": "Sizzler Special (ಸಿಜ್ಲರ್ ಸ್ಪೆಷಲ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 5
  },
  {
    "_id": "cat_39",
    "name": "Veg Soups (ವೆಜ್ ಸೂಪ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 6
  },
  {
    "_id": "cat_40",
    "name": "Tandoori Non Veg (ತಂದೂರಿ ನಾನ್‌ವೆಜ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 7
  },
  {
    "_id": "cat_41",
    "name": "Chicken Special Curry (ಚಿಕನ್ ಸ್ಪೆಷಲ್ ಕರಿ)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 8
  },
  {
    "_id": "cat_42",
    "name": "Chinese & Indian Bites (ಚೈನೀಸ್ & ಇಂಡಿಯನ್ ಬೈಟ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 9
  },
  {
    "_id": "cat_43",
    "name": "Mutton Special (ಮಟನ್ ಸ್ಪೆಷಲ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 10
  },
  {
    "_id": "cat_44",
    "name": "Mutton Main Course (ಮಟನ್ ಮೇನ್ ಕೋರ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 11
  },
  {
    "_id": "cat_45",
    "name": "Biriyani (ಬಿರಿಯಾನಿ)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 12
  },
  {
    "_id": "cat_46",
    "name": "Rice & Noodles (Non-Veg) (ರೈಸ್ & ನೂಡಲ್ಸ್ - ನಾನ್‌ವೆಜ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 13
  },
  {
    "_id": "cat_47",
    "name": "Rice & Noodles (Veg) (ರೈಸ್ & ನೂಡಲ್ಸ್ - ವೆಜ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 14
  },
  {
    "_id": "cat_48",
    "name": "Tandoori (Veg) (ತಂದೂರಿ ವೆಜ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 15
  },
  {
    "_id": "cat_49",
    "name": "Veg Starters (ವೆಜ್ ಸ್ಟಾರ್ಟರ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 16
  },
  {
    "_id": "cat_50",
    "name": "Vegetable Curry (ವೆಜಿಟೇಬಲ್ ಕರಿ)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 17
  },
  {
    "_id": "cat_51",
    "name": "Indian Breads (ಇಂಡಿಯನ್ ಬ್ರೆಡ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 18
  },
  {
    "_id": "cat_52",
    "name": "Kadai Special (ಕಡಾಯಿ ಸ್ಪೆಷಲ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 19
  },
  {
    "_id": "cat_53",
    "name": "Sea Food Seasonal (ಸೀ ಫುಡ್ ಸೀಸನಲ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 20
  },
  {
    "_id": "cat_54",
    "name": "Soft Drinks and More (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್ ಮತ್ತು ಇತರೆ)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 21
  },
  {
    "_id": "cat_55",
    "name": "Dal Special (ದಾಲ್ ಸ್ಪೆಷಲ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 22
  },
  {
    "_id": "cat_56",
    "name": "Kofta & Stuffed (ಕೋಫ್ತಾ ಮತ್ತು ಸ್ಟಫ್ಡ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 23
  },
  {
    "_id": "cat_57",
    "name": "Fresh Fruit Juices & Shakes (ಫ್ರೆಶ್ ಫ್ರೂಟ್ ಜ್ಯೂಸ್ & ಮಿಲ್ಕ್ ಶೇಕ್ಸ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 24
  },
  {
    "_id": "cat_58",
    "name": "Frozen Treat (ಫ್ರೋಜನ್ ಟ್ರೀಟ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 25
  },
  {
    "_id": "cat_59",
    "name": "Ice Creams Scoop (ಐಸ್ ಕ್ರೀಮ್ಸ್ ಸ್ಕೂಪ್)",
    "section": "HOTEL_RAAMA",
    "sortOrder": 26
  },
  {
    "_id": "cat_60",
    "name": "Party Packages",
    "section": "SAMBHRAMA",
    "sortOrder": 1
  }
];

export const FALLBACK_MENU_ITEMS = [
  {
    "_id": "item_1",
    "name": "Idly Vada (ಇಡ್ಲಿ ಉದ್ದಿನವಡೆ - 2 Idly 1 Vada)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_2",
    "name": "Single Idly Vada (ಸಿಂಗಲ್ ಇಡ್ಲಿ ಉದ್ದಿನವಡೆ)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_3",
    "name": "Rice Idly (ಇಡ್ಲಿ - 2 Nos.)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_4",
    "name": "Uddina Vada (ಉದ್ದಿನವಡೆ)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_5",
    "name": "Kesari Bath (ಕೇಸರಿಬಾತ್)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_6",
    "name": "Khara Bath (ಖಾರಾಬಾತ್)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_7",
    "name": "Chow Chow Bath (ಚೌಚೌ ಬಾತ್)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_8",
    "name": "Rava Idly (ರವೆ ಇಡ್ಲಿ - 1 No.)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_9",
    "name": "Poori (ಪೂರಿ - 3 Nos.)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_10",
    "name": "Curd Vada (ಮೊಸರು ವಡೆ)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_11",
    "name": "Rice Bath (ರೈಸ್ ಬಾತ್ - Day Special)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_12",
    "name": "Bonda Soup (ಬೋಂಡಾ ಸೂಪ್)",
    "categoryId": "cat_1",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_13",
    "name": "Open Butter Masala Dosa (ಓಪನ್ ಬಟರ್ ಮಸಾಲ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_14",
    "name": "Masala Dosa (ಮಸಾಲ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_15",
    "name": "Set Dosa (ಸೆಟ್ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_16",
    "name": "Onion Dosa (ಈರುಳ್ಳಿ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_17",
    "name": "Plain Dosa (ಪ್ಲೇನ್ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_18",
    "name": "Rava Dosa (ರವಾ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_19",
    "name": "Rava Masala Dosa (ರವಾ ಮಸಾಲ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 90,
    "isVeg": true
  },
  {
    "_id": "item_20",
    "name": "Rava Onion Dosa (ರವಾ ಈರುಳ್ಳಿ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 90,
    "isVeg": true
  },
  {
    "_id": "item_21",
    "name": "Rava Onion Masala Dosa (ರವಾ ಈರುಳ್ಳಿ ಮಸಾಲ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_22",
    "name": "Paper Plain Dosa (ಪೇಪರ್ ಪ್ಲೇನ್ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 90,
    "isVeg": true
  },
  {
    "_id": "item_23",
    "name": "Paper Masala Dosa (ಪೇಪರ್ ಮಸಾಲ ದೋಸೆ)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_24",
    "name": "Neer Dosa (ನೀರ್ ದೋಸೆ - Sat & Sun Only)",
    "categoryId": "cat_2",
    "section": "SWAAD",
    "price": 90,
    "description": "Only Saturday & Sunday 7:00 AM to 11:30 AM",
    "isVeg": true
  },
  {
    "_id": "item_25",
    "name": "South Indian Meals (ಸೌತ್ ಇಂಡಿಯನ್ ಮೀಲ್ಸ್)",
    "categoryId": "cat_3",
    "section": "SWAAD",
    "price": 125,
    "description": "Timings: 12:00 PM to 3:30 PM",
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_26",
    "name": "North Indian Meals (ನಾರ್ತ್ ಇಂಡಿಯನ್ ಮೀಲ್)",
    "categoryId": "cat_3",
    "section": "SWAAD",
    "price": 160,
    "description": "Timings: 12:00 PM to 3:30 PM & 7:00 PM to 10:00 PM",
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_27",
    "name": "Mugalai Biryani (ಮುಗಲೈ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_28",
    "name": "Veg. Biryani (ವೆಜ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_29",
    "name": "Veg. Pulav (ವೆಜ್ ಪಲಾವ್)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_30",
    "name": "Peas Pulav (ಪೀಸ್ ಪಲಾವ್)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_31",
    "name": "Veg Handi Biryani (ವೆಜ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_32",
    "name": "Special Curd Rice (ಸ್ಪೆಷಲ್ ಕರ್ಡ್ ರೈಸ್)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 90,
    "isVeg": true
  },
  {
    "_id": "item_33",
    "name": "Veg. Hydrabadhi Biryani (ವೆಜ್ ಹೈದರಾಬಾದಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_34",
    "name": "Dal Kichadi (ದಾಲ್ ಕಿಚಡಿ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_35",
    "name": "Basamathi Steam / Hot Rice (ಬಾಸುಮತಿ ಸ್ಟೀಮ್ / ಬಿಸಿ ರೈಸ್)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_36",
    "name": "Plain Rice & Rasam (ಪ್ಲೇನ್ ರೈಸ್ & ರಸಂ)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 60,
    "isVeg": true
  },
  {
    "_id": "item_37",
    "name": "Palak Rice (ಪಾಲಕ್ ರೈಸ್)",
    "categoryId": "cat_4",
    "section": "SWAAD",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_38",
    "name": "Paneer Manchurian (ಪನ್ನೀರ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_39",
    "name": "Veg. Ball Manchurian (ವೆಜ್ ಬಾಲ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_40",
    "name": "Mushroom Manchurian (ಮಶ್ರೂಮ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_41",
    "name": "Baby - Corn Manchurian (ಬೇಬಿ ಕಾರ್ನ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_42",
    "name": "Gobi Manchurian (ಗೋಬಿ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_43",
    "name": "Spanish Manchurian (ಸ್ಪ್ಯಾನಿಶ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_44",
    "name": "Harabara Kabab (ಹರಬರ ಕಬಾಬ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_45",
    "name": "French Fries (ಫ್ರೆಂಚ್ ಫ್ರೈಸ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_46",
    "name": "Papad (ಪಾಪಡ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 30,
    "isVeg": true
  },
  {
    "_id": "item_47",
    "name": "Masala Papad (ಮಸಾಲ ಪಾಪಡ್)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_48",
    "name": "Paneer Tikka (ಪನ್ನೀರ್ ಟಿಕ್ಕ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 195,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_49",
    "name": "Baby Corn Chilli (ಬೇಬಿ ಕಾರ್ನ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_50",
    "name": "Gobi Chilli (ಗೋಬಿ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 165,
    "isVeg": true
  },
  {
    "_id": "item_51",
    "name": "Mushroom Chilli (ಮಶ್ರೂಮ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_52",
    "name": "Paneer Chilli (ಪನ್ನೀರ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 195,
    "isVeg": true
  },
  {
    "_id": "item_53",
    "name": "Baby - Corn Pepper Dry (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_54",
    "name": "Mushroom Pepper Dry (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_5",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_55",
    "name": "Tomato Soup (ಟೊಮೊಟೊ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_56",
    "name": "Sweet - Corn Soup (ಸ್ವೀಟ್ ಕಾರ್ನ್ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_57",
    "name": "Sweet - Corn Veg Soup (ಸ್ವೀಟ್ ಕಾರ್ನ್ ವೆಜ್ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_58",
    "name": "Veg. Clear Soup (ವೆಜ್ ಕ್ಲಿಯರ್ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_59",
    "name": "Hot & Sour Soup (ಹಾಟ್ & ಸೋರ್ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_60",
    "name": "Veg. Manchow Soup (ವೆಜ್ ಮಾಂಚೋ ಸೂಪ್)",
    "categoryId": "cat_6",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_61",
    "name": "Green Salad (ಗ್ರೀನ್ ಸಲಾಡ್)",
    "categoryId": "cat_7",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_62",
    "name": "Tomato Salad (ಟೊಮೊಟೊ ಸಲಾಡ್)",
    "categoryId": "cat_7",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_63",
    "name": "Cucumber Salad (ಕುಕುಂಬರ್ ಸಲಾಡ್)",
    "categoryId": "cat_7",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_64",
    "name": "Roti (ರೋಟಿ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_65",
    "name": "Butter Roti (ಬಟರ್ ರೋಟಿ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_66",
    "name": "Methi Roti (ಮೇಥಿ ರೋಟಿ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_67",
    "name": "Palak Roti (ಪಾಲಕ್ ರೋಟಿ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_68",
    "name": "Pudina Roti (ಪುದಿನ ರೋಟಿ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_69",
    "name": "Naan (ನಾನ್)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_70",
    "name": "Butter Naan (ಬಟರ್ ನಾನ್)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_71",
    "name": "Garlic Naan (ಗಾರ್ಲಿಕ್ ನಾನ್)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_72",
    "name": "Kashmiri Naan (ಕಾಶ್ಮೀರಿ ನಾನ್)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_73",
    "name": "Kulcha (ಕುಲ್ಚಾ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_74",
    "name": "Butter Kulcha (ಬಟರ್ ಕುಲ್ಚಾ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_75",
    "name": "Stuffed Kulcha (ಸ್ಟಫ್ಡ್ ಕುಲ್ಚಾ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_76",
    "name": "Parota (ಪರೋಟ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_77",
    "name": "Butter Parota (ಬಟರ್ ಪರೋಟ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_78",
    "name": "Stuffed Parota (ಸ್ಟಫ್ಡ್ ಪರೋಟ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_79",
    "name": "Alu Parota (ಆಲೂ ಪರೋಟ)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_80",
    "name": "ROTI BASKET with Butter (ರೋಟಿ ಬಾಸ್ಕೇಟ್)",
    "categoryId": "cat_8",
    "section": "SWAAD",
    "price": 165,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_81",
    "name": "Paneer Butter Masala (ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_82",
    "name": "Channa Masala (ಚನ್ನ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_83",
    "name": "Gobi Masala (ಗೋಬಿ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_84",
    "name": "Veg. Makhanwala (ವೆಜ್ ಮಕ್ಕನ್‌ವಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_85",
    "name": "Green Peas Masala (ಗ್ರೀನ್ ಪೀಸ್ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_86",
    "name": "Mix Veg. curry (ಮಿಕ್ಸ್ ವೆಜ್ ಕರಿ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_87",
    "name": "Mushroom Masala (ಮಶ್ರೂಮ್ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_88",
    "name": "Veg. Do Piaza (ವೆಜ್ ದೋ ಪ್ಯಾವಾ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_89",
    "name": "Veg. Kurma (ವೆಜ್ ಕುರ್ಮಾ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_90",
    "name": "Paneer Burji/Guchi (ಪನ್ನೀರ್ ಬುರ್ಜಿ / ಗುಚಿ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_91",
    "name": "Veg. Hydrabadi (ವೆಜ್ ಹೈದರಾಬಾದಿ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_92",
    "name": "Paneer Tikka Masala (ಪನ್ನೀರ್ ಟಿಕ್ಕ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_93",
    "name": "Baby corn Masala (ಬೇಬಿ ಕಾರ್ನ್ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_94",
    "name": "Kaju Masala (ಕಾಜು ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_95",
    "name": "Kaju Panner (ಕಾಜು ಪನ್ನೀರ್)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_96",
    "name": "Alu Gobi Kurma (ಆಲೂ ಗೋಬಿ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_97",
    "name": "Shahi Kurma (ಶಾಹಿ ಕುರ್ಮಾ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_98",
    "name": "Veg. Patiala (ವೆಜ್ ಪಟಿಯಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_99",
    "name": "Swaad Special (ಸ್ವಾದ್ ಸ್ಪೆಷಲ್)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 200,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_100",
    "name": "Veg. Jaipuri (ವೆಜ್ ಜೈಪುರಿ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_101",
    "name": "Veg. Kollapuri (ವೆಜ್ ಕೊಲ್ಹಾಪುರಿ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_102",
    "name": "Navarathna Kurma (ನವರತ್ನ ಕುರ್ಮಾ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_103",
    "name": "Capsicum Masala (ಕ್ಯಾಪ್ಸಿಕಮ್ ಮಸಾಲ)",
    "categoryId": "cat_9",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_104",
    "name": "Kadai Paneer (ಕಡೈ ಪನ್ನೀರ್)",
    "categoryId": "cat_10",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_105",
    "name": "Kadai Mushroom (ಕಡೈ ಮಶ್ರೂಮ್)",
    "categoryId": "cat_10",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_106",
    "name": "Kadai Gobi Mutter (ಕಡೈ ಗೋಬಿ ಮಟರ್)",
    "categoryId": "cat_10",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_107",
    "name": "Kadai Mix veg. (ಕಡೈ ಮಿಕ್ಸ್ ವೆಜ್)",
    "categoryId": "cat_10",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_108",
    "name": "Kadai Veg. Kolhapuri (ಕಡೈ ವೆಜ್ ಕೊಲ್ಹಾಪುರಿ)",
    "categoryId": "cat_10",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_109",
    "name": "Paneer Kofta (ಪನ್ನೀರ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_110",
    "name": "Malai Kofta (ಮಲೈ ಕೋಫ್ತಾ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 185,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_111",
    "name": "Veg. Kofta (ವೆಜ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_112",
    "name": "Stuffed Tomoto (ಸ್ಟಫ್ಡ್ ಟೊಮೊಟೊ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_113",
    "name": "Stuffed Capsicum (ಸ್ಟಫ್ಡ್ ಕ್ಯಾಪ್ಸಿಕಮ್)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_114",
    "name": "Nargis Kofta (ನರ್ಗಿಸ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_115",
    "name": "Stuffed Alu (ಸ್ಟಫ್ಡ್ ಆಲೂ)",
    "categoryId": "cat_11",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_116",
    "name": "Dal Fry (ದಾಲ್ ಫ್ರೈ)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_117",
    "name": "Dal Punjabi (ದಾಲ್ ಪಂಜಾಬಿ)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_118",
    "name": "Dal Tadka (ದಾಲ್ ತಡ್ಕಾ)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_119",
    "name": "Dal Palak (ದಾಲ್ ಪಾಲಕ್)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_120",
    "name": "Paneer Palak (ಪನ್ನೀರ್ ಪಾಲಕ್)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_121",
    "name": "Plain Palak (ಪ್ಲೇನ್ ಪಾಲಕ್)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_122",
    "name": "Alu Palak (ಆಲೂ ಪಾಲಕ್)",
    "categoryId": "cat_12",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_123",
    "name": "Veg. Fried Rice (ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 145,
    "isVeg": true
  },
  {
    "_id": "item_124",
    "name": "Veg. Noodles (ವೆಜ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 145,
    "isVeg": true
  },
  {
    "_id": "item_125",
    "name": "Veg. Hakka Noodles (ವೆಜ್ ಹಕ್ಕಾ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_126",
    "name": "Veg. Schezwan Fried Rice (ವೆಜ್ ಶೇಜ್ವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_127",
    "name": "Veg. Schezwan Noodles (ವೆಜ್ ಶೇಜ್ವಾನ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 165,
    "isVeg": true
  },
  {
    "_id": "item_128",
    "name": "Paneer Fried Rice (ಪನ್ನೀರ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_129",
    "name": "Mushroom Fried Rice (ಮಶ್ರೂಮ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_130",
    "name": "Mushroom Noodles (ಮಶ್ರೂಮ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_131",
    "name": "Corn Fried Rice (ಕಾರ್ನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_132",
    "name": "Singapore Fried Rice (ಸಿಂಗಾಪುರ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_133",
    "name": "Singapore Noodles (ಸಿಂಗಾಪುರ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_134",
    "name": "Jeera Fried Rice (ಜೀರಾ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_135",
    "name": "Ghee Rice (ಘೀ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_136",
    "name": "Jeera Rice (ಜೀರಾ ರೈಸ್)",
    "categoryId": "cat_13",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_137",
    "name": "Veg Sandwich (ವೆಜ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_138",
    "name": "Veg. Paneer / Cheese Grilled (ವೆಜ್ ಪನ್ನೀರ್ / ಚೀಸ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_139",
    "name": "Veg. Grilled Sandwich (ವೆಜ್ ಗ್ರಿಲ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_140",
    "name": "Veg. Cheese Grilled Sandwich (ವೆಜ್ ಚೀಸ್ ಗ್ರಿಲ್ ಸ್ಯಾಂಡ್‌ವಿಚ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_141",
    "name": "Aloo Chease Grilled (ಆಲೂ ಚೀಸ್ ಗ್ರಿಲ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_142",
    "name": "Onion Paneer / Cheese Grilled (ಈರುಳ್ಳಿ ಪನ್ನೀರ್ / ಚೀಸ್ ಗ್ರಿಲ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_143",
    "name": "Tomoto Paneer / Cheese Grilled (ಟೊಮಾಟೊ ಪನ್ನೀರ್ ಚೀಸ್ ಗ್ರಿಲ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_144",
    "name": "Bread Butter / Jam (ಬ್ರೆಡ್ ಬಟರ್ / ಜಾಮ್)",
    "categoryId": "cat_14",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_145",
    "name": "Rasmalai (ರಸ್‌ಮಲೈ)",
    "categoryId": "cat_15",
    "section": "SWAAD",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_146",
    "name": "Gulab Jamoon (ಗುಲಾಬ್ ಜಾಮೂನು)",
    "categoryId": "cat_15",
    "section": "SWAAD",
    "price": 30,
    "isVeg": true
  },
  {
    "_id": "item_147",
    "name": "Malai Sandwich (ಮಲೈ ಸ್ಯಾಂಡ್‌ವಿಚ್)",
    "categoryId": "cat_15",
    "section": "SWAAD",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_148",
    "name": "Carrot Halwa (ಕ್ಯಾರಟ್ ಹಲ್ವ)",
    "categoryId": "cat_15",
    "section": "SWAAD",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_149",
    "name": "Musambi Juice (Seasonal) (ಮೂಸಂಬಿ ಜ್ಯೂಸ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_150",
    "name": "Orange Juice (Seasonal) (ಆರೆಂಜ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_151",
    "name": "Grape Juice (Seasonal) (ಗ್ರೇಪ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_152",
    "name": "Pineapple Juice (Seasonal) (ಪೈನಾಪಲ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_153",
    "name": "Mango Juice (Seasonal) (ಮ್ಯಾಂಗೋ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_154",
    "name": "Water Melon (Seasonal) (ವಾಟರ್ ಮೆಲನ್ ಜ್ಯೂಸ್ - ಸೀಸನಲ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_155",
    "name": "Fresh Lime Juice (ಫ್ರೆಶ್ ಲೈಮ್ ಜ್ಯೂಸ್)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_156",
    "name": "Fresh Lime soda (ಫ್ರೆಶ್ ಲೈಮ್ ಸೋಡ)",
    "categoryId": "cat_16",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_157",
    "name": "Chikku Milk Shake (ಚಿಕ್ಕು ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 90,
    "isVeg": true
  },
  {
    "_id": "item_158",
    "name": "Mango Milk Shake (ಮ್ಯಾಂಗೋ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_159",
    "name": "Straberry Milk Shake (ಸ್ಟ್ರಾಬರಿ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_160",
    "name": "Apple Milk Shake (ಆಪಲ್ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_161",
    "name": "Vanilla Milk Shake (ವೆನಿಲ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_162",
    "name": "Chacolate Milk Shake (ಚಾಕೋಲೇಟ್ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_163",
    "name": "Pista Milk Shake (ಪಿಸ್ತಾ ಮಿಲ್ಕ್ ಶೇಕ್)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_164",
    "name": "Sweet Lassi / Salt Lassi (ಸ್ವೀಟ್ ಲಸ್ಸಿ / ಸಾಲ್ಟ್ ಲಸ್ಸಿ)",
    "categoryId": "cat_17",
    "section": "SWAAD",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_165",
    "name": "Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)",
    "categoryId": "cat_18",
    "section": "SWAAD",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_166",
    "name": "Fruit Salad with Ice cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಐಸ್ ಕ್ರೀಂ)",
    "categoryId": "cat_18",
    "section": "SWAAD",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_167",
    "name": "Fruit Salad Jelly & Ice cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ಜೆಲ್ಲಿ & ಐಸ್ ಕ್ರೀಂ)",
    "categoryId": "cat_18",
    "section": "SWAAD",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_168",
    "name": "Chacolate Ice Cream (ಚಾಕೋಲೇಟ್ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_169",
    "name": "Pista Ice Cream (ಪಿಸ್ತಾ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_170",
    "name": "Vanila Ice Cream (ವೆನಿಲ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_171",
    "name": "Mango Ice Cream (ಮ್ಯಾಂಗೋ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_172",
    "name": "Dry Fruit Ice Cream (ಡ್ರೈ ಫ್ರೂಟ್ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_173",
    "name": "Black Current Ice Cream (ಬ್ಲಾಕ್ ಕರೆಂಟ್ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_174",
    "name": "Straberry Ice Cream (ಸ್ಟ್ರಾಬರಿ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_175",
    "name": "Butter scoth Ice Cream (ಬಟರ್ ಸ್ಕಾಚ್ ಐಸ್ ಕ್ರೀಮ್)",
    "categoryId": "cat_19",
    "section": "SWAAD",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_176",
    "name": "Raja Rani (ರಾಜಾರಾಣಿ)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 145,
    "isVeg": true
  },
  {
    "_id": "item_177",
    "name": "My Darling (ಡಾರ್ಲಿಂಗ್)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_178",
    "name": "Golden Cherry (ಗೋಲ್ಡನ್ ಚೆರ್ರಿ)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_179",
    "name": "Nuts Sunday (ನಟ್ಸ್ ಸಂಡೇ)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_180",
    "name": "Honeymoon Special (ಹನಿಮೂನ್ ಸ್ಪೆಷಲ್)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_181",
    "name": "Gudbad (ಗಡ್‌ಬಡ್)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_182",
    "name": "Swaad Special (ಸ್ವಾದ್ ಸ್ಪೆಷಲ್)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 170,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_183",
    "name": "My Dream (ಮೈ ಡ್ರೀಂ)",
    "categoryId": "cat_20",
    "section": "SWAAD",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_184",
    "name": "COFFEE / TEA / MILK (ಕಾಫಿ /ಟೀ/ಹಾಲು)",
    "categoryId": "cat_21",
    "section": "SWAAD",
    "price": 38,
    "isVeg": true
  },
  {
    "_id": "item_185",
    "name": "HOT BADAM MILK (ಬಿಸಿ ಬಾದಾಮ್ ಹಾಲು)",
    "categoryId": "cat_21",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_186",
    "name": "BOURNAVITA (ಬೋರ್ನ್‌ವಿಟ)",
    "categoryId": "cat_21",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_187",
    "name": "HORLICKS (ಹಾರ್ಲಿಕ್ಸ್)",
    "categoryId": "cat_21",
    "section": "SWAAD",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_188",
    "name": "Imperial Blue (ಇಂಪೀರಿಯಲ್ ಬ್ಲೂ)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 90,
    "price60ml": 160,
    "isVeg": true
  },
  {
    "_id": "item_189",
    "name": "Mc Dowells Whiskey (ಎಂ ಸಿ ಡೊವೆಲ್ಸ್ ವಿಸ್ಕಿ)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 90,
    "price60ml": 160,
    "isVeg": true
  },
  {
    "_id": "item_190",
    "name": "Royal Stag (ರಾಯಲ್ ಸ್ಟ್ಯಾಗ್)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 125,
    "price60ml": 210,
    "isVeg": true
  },
  {
    "_id": "item_191",
    "name": "Signature Rare (ಸಿಗ್ನೇಚರ್ ರೇರ್)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 150,
    "price60ml": 285,
    "isVeg": true
  },
  {
    "_id": "item_192",
    "name": "Antiquity Blue (ಆಂಟಿಕುಟಿ ಬ್ಲೂ)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 150,
    "price60ml": 285,
    "isVeg": true
  },
  {
    "_id": "item_193",
    "name": "Blenders Pride (ಬ್ಲೆಂಡರ್ಸ್ ಪ್ರೈಡ್)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 150,
    "price60ml": 285,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_194",
    "name": "Signature Premium (ಸಿಗ್ನೇಚರ್ ಪ್ರೀಮಿಯಂ)",
    "categoryId": "cat_22",
    "section": "LIQUID_LOUNGE",
    "price": 160,
    "price60ml": 300,
    "isVeg": true
  },
  {
    "_id": "item_195",
    "name": "M C Dowels Brandy (ಮೆಕ್‌ಡೊವೆಲ್ಸ್ ಬ್ರಾಂಡಿ)",
    "categoryId": "cat_23",
    "section": "LIQUID_LOUNGE",
    "price": 85,
    "price60ml": 150,
    "isVeg": true
  },
  {
    "_id": "item_196",
    "name": "Mansion House Brandy (ಮ್ಯಾನ್ಶನ್ ಹೌಸ್ ಬ್ರಾಂಡಿ)",
    "categoryId": "cat_23",
    "section": "LIQUID_LOUNGE",
    "price": 85,
    "price60ml": 150,
    "isVeg": true
  },
  {
    "_id": "item_197",
    "name": "Morpheus Brandy Blue (ಮಾರ್ಫಿಯಸ್ ಬ್ರಾಂಡಿ ಬ್ಲೂ)",
    "categoryId": "cat_23",
    "section": "LIQUID_LOUNGE",
    "price": 175,
    "price60ml": 350,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_198",
    "name": "Morpheus Brandy (ಮಾರ್ಫಿಯಸ್ ಬ್ರಾಂಡಿ)",
    "categoryId": "cat_23",
    "section": "LIQUID_LOUNGE",
    "price": 150,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_199",
    "name": "Bacardi White Rum (ಬಕಾರ್ಡಿ ವೈಟ್ ರಮ್)",
    "categoryId": "cat_24",
    "section": "LIQUID_LOUNGE",
    "price": 125,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_200",
    "name": "Old Monk Gold Reserve 12 Years (ಓಲ್ಡ್ ಮಂಕ್ ಗೋಲ್ಡ್ ರಿಸರ್ವ್ 12 ಇಯರ್ಸ್)",
    "categoryId": "cat_24",
    "section": "LIQUID_LOUNGE",
    "price": 90,
    "price60ml": 165,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_201",
    "name": "Smirnoff Orange (ಸ್ಮಿರ್ನಾಫ್ ಆರೆಂಜ್)",
    "categoryId": "cat_25",
    "section": "LIQUID_LOUNGE",
    "price": 130,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_202",
    "name": "Smirnoff Plain (ಸ್ಮಿರ್ನಾಫ್ ಪ್ಲೇನ್)",
    "categoryId": "cat_25",
    "section": "LIQUID_LOUNGE",
    "price": 130,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_203",
    "name": "Bacardi Apple (ಬಕಾರ್ಡಿ ಆಪಲ್)",
    "categoryId": "cat_25",
    "section": "LIQUID_LOUNGE",
    "price": 130,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_204",
    "name": "Smirnoff Apple (ಸ್ಮಿರ್ನಾಫ್ ಆಪಲ್)",
    "categoryId": "cat_25",
    "section": "LIQUID_LOUNGE",
    "price": 130,
    "price60ml": 250,
    "isVeg": true
  },
  {
    "_id": "item_205",
    "name": "Black Dog Regular (ಬ್ಲಾಕ್ ಡಾಗ್ ರೆಗ್ಯುಲರ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 185,
    "price60ml": 350,
    "isVeg": true
  },
  {
    "_id": "item_206",
    "name": "VAT 69 (ವ್ಯಾಟ್ 69)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 185,
    "price60ml": 350,
    "isVeg": true
  },
  {
    "_id": "item_207",
    "name": "Black Dog 12 Years (ಬ್ಲಾಕ್ ಡಾಗ್ 12 ಇಯರ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 185,
    "price60ml": 350,
    "isVeg": true
  },
  {
    "_id": "item_208",
    "name": "Teachers Highland (ಟೀಚರ್ಸ್ ಹೈಲ್ಯಾಂಡ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 185,
    "price60ml": 350,
    "isVeg": true
  },
  {
    "_id": "item_209",
    "name": "Teachers 50 (ಟೀಚರ್ಸ್ 50)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "price60ml": 550,
    "isVeg": true
  },
  {
    "_id": "item_210",
    "name": "Something Special (ಸಮ್‌ಥಿಂಗ್ ಸ್ಪೆಷಲ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "price60ml": 550,
    "isVeg": true
  },
  {
    "_id": "item_211",
    "name": "100 Pipers Regular (100 ಪೈಪರ್ಸ್ ರೆಗ್ಯುಲರ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "price60ml": 385,
    "isVeg": true
  },
  {
    "_id": "item_212",
    "name": "Black & White (ಬ್ಲಾಕ್ ಅಂಡ್ ವೈಟ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "price60ml": 385,
    "isVeg": true
  },
  {
    "_id": "item_213",
    "name": "Passport (ಪಾಸ್‌ಪೋರ್ಟ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "price60ml": 385,
    "isVeg": true
  },
  {
    "_id": "item_214",
    "name": "Johnnie Walker Red Label (ಜಾನಿ ವಾಕರ್ ರೆಡ್ ಲೇಬಲ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 285,
    "price60ml": 550,
    "isVeg": true
  },
  {
    "_id": "item_215",
    "name": "Johnnie Walker Black Label (ಜಾನಿ ವಾಕರ್ ಬ್ಲಾಕ್ ಲೇಬಲ್)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 475,
    "price60ml": 900,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_216",
    "name": "Amrut Indian Single Malt Whisky (ಅಮೃತ್ ಇಂಡಿಯನ್ ಸಿಂಗಲ್ ಮಾಲ್ಟ್ ವಿಸ್ಕಿ)",
    "categoryId": "cat_26",
    "section": "LIQUID_LOUNGE",
    "price": 285,
    "price60ml": 550,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_217",
    "name": "Sula Red Wine (ಸೂಲ ರೆಡ್ ವೈನ್ - 90ml)",
    "categoryId": "cat_27",
    "section": "LIQUID_LOUNGE",
    "price": 250,
    "description": "90 ML Single Serve Glass",
    "isVeg": true
  },
  {
    "_id": "item_218",
    "name": "Fretel White Wine (ಫ್ರೆಟೆಲ್ ವೈಟ್ ವೈನ್ - 90ml)",
    "categoryId": "cat_27",
    "section": "LIQUID_LOUNGE",
    "price": 250,
    "description": "90 ML Single Serve Glass",
    "isVeg": true
  },
  {
    "_id": "item_219",
    "name": "Sula White Wine (ಸೂಲ ವೈಟ್ ವೈನ್ - 90ml)",
    "categoryId": "cat_27",
    "section": "LIQUID_LOUNGE",
    "price": 215,
    "description": "90 ML Single Serve Glass",
    "isVeg": true
  },
  {
    "_id": "item_220",
    "name": "Fretel Red Wine (ಫ್ರೆಟೆಲ್ ರೆಡ್ ವೈನ್ - 90ml)",
    "categoryId": "cat_27",
    "section": "LIQUID_LOUNGE",
    "price": 215,
    "description": "90 ML Single Serve Glass",
    "isVeg": true
  },
  {
    "_id": "item_221",
    "name": "Souza Tequila (ಸೌಜಾ ಟೆಕಿಲಾ)",
    "categoryId": "cat_28",
    "section": "LIQUID_LOUNGE",
    "price": 385,
    "isVeg": true
  },
  {
    "_id": "item_222",
    "name": "Max Ultra (ಮ್ಯಾಕ್ಸ್ ಅಲ್ಟ್ರಾ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 320,
    "isVeg": true
  },
  {
    "_id": "item_223",
    "name": "Budweiser Magnum (ಬಡ್‌ವೈಸರ್ ಮ್ಯಾಗ್ನಂ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 320,
    "isVeg": true
  },
  {
    "_id": "item_224",
    "name": "Carlsberg Strong / Premium (ಕಾರ್ಲ್ಸ್‌ಬರ್ಗ್ ಸ್ಟ್ರಾಂಗ್ / ಪ್ರೀಮಿಯಂ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 320,
    "isVeg": true
  },
  {
    "_id": "item_225",
    "name": "Kingfisher Ultra (ಕಿಂಗ್‌ಫಿಶರ್ ಅಲ್ಟ್ರಾ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_226",
    "name": "Budweiser Premium (ಬಡ್‌ವೈಸರ್ ಪ್ರೀಮಿಯಂ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "isVeg": true
  },
  {
    "_id": "item_227",
    "name": "Tuborg Strong / Green (ಟ್ಯೂಬರ್ಗ್ ಸ್ಟ್ರಾಂಗ್ / ಗ್ರೀನ್ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "isVeg": true
  },
  {
    "_id": "item_228",
    "name": "Kingfisher Strong / Premium (ಕಿಂಗ್‌ಫಿಶರ್ ಸ್ಟ್ರಾಂಗ್ / ಪ್ರೀಮಿಯಂ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "isVeg": true
  },
  {
    "_id": "item_229",
    "name": "Kingfisher Premium (ಕಿಂಗ್‌ಫಿಶರ್ ಪ್ರೀಮಿಯಂ - 650ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 300,
    "isVeg": true
  },
  {
    "_id": "item_230",
    "name": "Kingfisher Premium / Strong Pint (ಕಿಂಗ್‌ಫಿಶರ್ ಪ್ರೀಮಿಯಂ / ಸ್ಟ್ರಾಂಗ್ ಪಿಂಟ್ - 330ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_231",
    "name": "UB Pint (ಯು ಬಿ ಪಿಂಟ್ - 330ml)",
    "categoryId": "cat_29",
    "section": "LIQUID_LOUNGE",
    "price": 115,
    "isVeg": true
  },
  {
    "_id": "item_232",
    "name": "Bacardi Cranberry / Orange (ಬಕಾರ್ಡಿ ಕ್ಯಾನ್‌ಬರಿ / ಆರೆಂಜ್)",
    "categoryId": "cat_30",
    "section": "LIQUID_LOUNGE",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_233",
    "name": "Breezer Orange / Cranberry (ಬ್ರೀಝರ್ ಆರೆಂಜ್ / ಕ್ಯಾನ್ಬರಿ)",
    "categoryId": "cat_30",
    "section": "LIQUID_LOUNGE",
    "price": 225,
    "isVeg": true
  },
  {
    "_id": "item_234",
    "name": "Fruit Punch (ಫ್ರೂಟ್ ಪಂಚ್)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 180,
    "description": "Blend of tropical fruit juices with cream",
    "isVeg": true
  },
  {
    "_id": "item_235",
    "name": "Virgin Mojito (ವರ್ಜಿನ್ ಮೊಜಿತೋ)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "description": "Fresh mint, lime, sugar syrup and sparkling soda",
    "isVeg": true
  },
  {
    "_id": "item_236",
    "name": "Water Melon Mojito (ವಾಟರ್ ಮೆಲನ್ ಮೊಜಿತೋ)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_237",
    "name": "Blue Mojito (ಬ್ಲೂ ಮೊಜಿತೋ)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_238",
    "name": "Passion Mocktail (ಪ್ಯಾಶನ್ ಮಾಕ್‌ಟೇಲ್)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_239",
    "name": "Strawberry Mojito (ಸ್ಟ್ರಾಬೆರಿ ಮೊಜಿತೋ)",
    "categoryId": "cat_31",
    "section": "LIQUID_LOUNGE",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_240",
    "name": "Mojito - Rum Based (ಮೊಜಿತೋ - 30ml ರಮ್ ಬೇಸ್)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 325,
    "description": "30ml Rum based refreshing cocktail with mint and lime",
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_241",
    "name": "Blue Lagoon (ಬ್ಲೂ ಲೆಗೂನ್)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 325,
    "description": "Vodka, blue curacao and lemonade",
    "isVeg": true
  },
  {
    "_id": "item_242",
    "name": "Passiontini (ಪ್ಯಾಶಂಟಿನಿ)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 325,
    "isVeg": true
  },
  {
    "_id": "item_243",
    "name": "Chocotini (ಚಾಕೋಟಿನಿ)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 325,
    "isVeg": true
  },
  {
    "_id": "item_244",
    "name": "Screw Driver - Vodka Based (ಸ್ಕ್ರೂ ಡ್ರೈವರ್ - 30ml ವೋಡ್ಕಾ ಬೇಸ್)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 325,
    "description": "30ml Vodka based classic cocktail with orange",
    "isVeg": true
  },
  {
    "_id": "item_245",
    "name": "LLB Shot (ಎಲ್.ಎಲ್.ಬಿ. ಶಾಟ್)",
    "categoryId": "cat_32",
    "section": "LIQUID_LOUNGE",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_246",
    "name": "Mineral Water 1L (ಮಿನರಲ್ ವಾಟರ್ 1 ಲೀಟರ್)",
    "categoryId": "cat_33",
    "section": "LIQUID_LOUNGE",
    "price": 20,
    "isVeg": true
  },
  {
    "_id": "item_247",
    "name": "Soft Drinks (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್)",
    "categoryId": "cat_33",
    "section": "LIQUID_LOUNGE",
    "price": 25,
    "isVeg": true
  },
  {
    "_id": "item_248",
    "name": "Egg Burji (ಎಗ್ ಬುರ್ಜಿ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": false
  },
  {
    "_id": "item_249",
    "name": "Egg Pakoda (ಎಗ್ ಪಕೋಡ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_250",
    "name": "Egg Schezwan Fried Rice (ಎಗ್ ಸೆಜುವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 165,
    "isVeg": false
  },
  {
    "_id": "item_251",
    "name": "Egg Manchurian (ಎಗ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 145,
    "isVeg": false
  },
  {
    "_id": "item_252",
    "name": "Egg Chilly (ಎಗ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 145,
    "isVeg": false
  },
  {
    "_id": "item_253",
    "name": "Egg Masala (ಎಗ್ ಮಸಾಲಾ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 145,
    "isVeg": false
  },
  {
    "_id": "item_254",
    "name": "Egg Pepper Dry (ಎಗ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 145,
    "isVeg": false
  },
  {
    "_id": "item_255",
    "name": "Egg Mughlai Curry (ಎಗ್ ಮೊಗಲಾಯ್ ಕರಿ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": false
  },
  {
    "_id": "item_256",
    "name": "Egg Ghee Roast (ಎಗ್ ಘೀ ರೋಸ್ಟ್)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": false
  },
  {
    "_id": "item_257",
    "name": "Egg Kheema Masala (ಎಗ್ ಖೀಮಾ ಮಸಾಲಾ)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": false
  },
  {
    "_id": "item_258",
    "name": "Egg Half Fry (ಎಗ್ ಹಾಫ್ ಫ್ರೈ - 2 Eggs)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": false
  },
  {
    "_id": "item_259",
    "name": "Egg Full Fry (ಎಗ್ ಫುಲ್ ಫ್ರೈ - 2 Eggs)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": false
  },
  {
    "_id": "item_260",
    "name": "Omelette (ಆಮ್ಲೆಟ್ - 2 Eggs)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": false
  },
  {
    "_id": "item_261",
    "name": "Boiled Egg (ಬಾಯಿಲ್ಡ್ - 2 Eggs)",
    "categoryId": "cat_34",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": false
  },
  {
    "_id": "item_262",
    "name": "Cashew Fry (ಕ್ಯಾಶ್ಯು ಫ್ರೈ)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_263",
    "name": "Raja Special (ರಾಜಾ ಸ್ಪೇಷಲ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_264",
    "name": "Peanut Plain (ಪೀನಟ್ ಪ್ಲೇನ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_265",
    "name": "Finger Chips (ಫಿಂಗರ್ ಚಿಪ್ಸ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_266",
    "name": "Green Salad (ಗ್ರೀನ್ ಸಲಾಡ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_267",
    "name": "Papad Fried (ಪಾಪಡ್ ಫ್ರೈಡ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 30,
    "isVeg": true
  },
  {
    "_id": "item_268",
    "name": "Papad Roasted (ಪಾಪಡ್ ರೋಸ್ಟೆಡ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 30,
    "isVeg": true
  },
  {
    "_id": "item_269",
    "name": "Masala Papad (ಮಸಾಲಾ ಪಾಪಡ್)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_270",
    "name": "Corn Fry (ಕಾರ್ನ್ ಫ್ರೈ)",
    "categoryId": "cat_35",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_271",
    "name": "Boiled Vegetable (ಬಾಯಿಲ್ಡ್ ವೆಜಿಟೇಬಲ್)",
    "categoryId": "cat_36",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": true
  },
  {
    "_id": "item_272",
    "name": "Vegetable Ghee Roast (ವೆಜಿಟೇಬಲ್ ಘೀ ರೋಸ್ಟ್)",
    "categoryId": "cat_36",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_273",
    "name": "Crispy Vegetable (ಕ್ರಿಸ್ಪಿ ವೆಜಿಟೇಬಲ್)",
    "categoryId": "cat_36",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_274",
    "name": "Cream of Chicken (ಕ್ರೀಮ್ ಆಫ್ ಚಿಕನ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_275",
    "name": "Sweet Corn Chicken (ಸ್ವೀಟ್ ಕಾರ್ನ್ ಚಿಕನ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_276",
    "name": "Hot N Sour Chicken (ಹಾಟ್ ಎನ್ ಸೋರ್ ಚಿಕನ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_277",
    "name": "Chicken Coriander (ಚಿಕನ್ ಕೋರಿಯಾಂಡರ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_278",
    "name": "Chicken Manchow Soup (ಚಿಕನ್ ಮ್ಯಾನ್ ಚೌ ಸೂಪ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_279",
    "name": "Chicken Clear Soup (ಚಿಕನ್ ಕ್ಲಿಯರ್ ಸೂಪ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": false
  },
  {
    "_id": "item_280",
    "name": "Mutton Clear Soup (ಮಟನ್ ಕ್ಲಿಯರ್ ಸೂಪ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": false
  },
  {
    "_id": "item_281",
    "name": "Mutton Manchow (ಮಟನ್ ಮ್ಯಾನ್ ಚೌ)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": false
  },
  {
    "_id": "item_282",
    "name": "Mutton Hot N Sour (ಮಟನ್ ಹಾಟ್ ಎನ್ ಸೋರ್)",
    "categoryId": "cat_37",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": false
  },
  {
    "_id": "item_283",
    "name": "Chicken Slice Sizzler (ಚಿಕನ್ ಸ್ಲೈಸ್ ಸಿಜ್ಲರ್)",
    "categoryId": "cat_38",
    "section": "HOTEL_RAAMA",
    "price": 325,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_284",
    "name": "Vegetable Sizzler (ವೆಜಿಟಬಲ್ ಸಿಜ್ಲರ್)",
    "categoryId": "cat_38",
    "section": "HOTEL_RAAMA",
    "price": 285,
    "isVeg": true
  },
  {
    "_id": "item_285",
    "name": "Cream of Tomato (ಕ್ರೀಮ್ ಆಫ್ ಟೊಮೆಟೋ)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_286",
    "name": "Veg Sweet Corn Soup (ವೆಜ್ ಸ್ವೀಟ್ ಕಾರ್ನ್ ಸೂಪ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_287",
    "name": "Veg Manchow (ವೆಜ್ ಮ್ಯಾನ್ ಚೌ)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_288",
    "name": "Veg Clear Soup (ವೆಜ್ ಕ್ಲಿಯರ್ ಸೂಪ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_289",
    "name": "Veg Hot N Sour (ವೆಜ್ ಹಾಟ್ ಎನ್ ಸೋರ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_290",
    "name": "Mushroom Soup (ಮಶ್ರೂಮ್ ಸೂಪ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_291",
    "name": "Coriander Soup (ಕೋರಿಯಾಂಡರ್ ಸೂಪ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_292",
    "name": "Tomato Soup (ಟೊಮೆಟೋ ಸೂಪ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_293",
    "name": "Cream of Mushroom (ಕ್ರೀಮ್ ಆಫ್ ಮಶ್ರೂಮ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_294",
    "name": "Bamboo Shoot (ಬ್ಯಾಂಬೂ ಶೂಟ್)",
    "categoryId": "cat_39",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_295",
    "name": "Chicken Achari Tikka (ಚಿಕನ್ ಆಚಾರಿ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_296",
    "name": "Chicken Steak (ಚಿಕನ್ ಸ್ಟೀಕ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 280,
    "isVeg": false
  },
  {
    "_id": "item_297",
    "name": "Chicken Tikka (ಚಿಕನ್ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_298",
    "name": "Chicken Hariyali Tikka (ಚಿಕನ್ ಹರಿಯಾಲಿ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_299",
    "name": "Kalmi One Piece (ಕಲ್ಮಿ ಒನ್ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": false
  },
  {
    "_id": "item_300",
    "name": "Kalmi Two Piece (ಕಲ್ಮಿ ಟೂ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_301",
    "name": "Tangadi Kabab One Piece (ತಂಗಡಿ ಕಬಾಬ್ ಒನ್ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": false
  },
  {
    "_id": "item_302",
    "name": "Tangadi Kabab Two Piece (ತಂಗಡಿ ಕಬಾಬ್ ಟೂ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 230,
    "isVeg": false
  },
  {
    "_id": "item_303",
    "name": "Chicken Simhapoori One Piece (ಚಿಕನ್ ಸಿಂಹಪುರಿ ಒನ್ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 155,
    "isVeg": false
  },
  {
    "_id": "item_304",
    "name": "Chicken Simhapoori Two Piece (ಚಿಕನ್ ಸಿಂಹಪುರಿ ಟೂ ಪೀಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 285,
    "isVeg": false
  },
  {
    "_id": "item_305",
    "name": "Chicken Tandoori Full (ತಂದೂರಿ ಚಿಕನ್ ಫುಲ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 440,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_306",
    "name": "Chicken Seekh Kabab (ಚಿಕನ್ ಸೀಕ್ ಕಬಾಬ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_307",
    "name": "Non Veg Platters Tandoori (ನಾನ್ ವೆಜ್ ಪ್ಲಾಟರ್ಸ್ ತಂದೂರಿ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 999,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_308",
    "name": "Veg Platters (ವೆಜ್ ಪ್ಲಾಟರ್ಸ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 449,
    "isVeg": true
  },
  {
    "_id": "item_309",
    "name": "Punjabi Tikka (ಪಂಜಾಬಿ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_310",
    "name": "Chicken Nawabi Tikka (ಚಿಕನ್ ನವಾಬಿ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_311",
    "name": "Chicken Malai Tikka (ಚಿಕನ್ ಮಲಾಯ್ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_312",
    "name": "Chicken Reshmi Kabab (ಚಿಕನ್ ರೇಷ್ಮಿ ಕಬಾಬ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_313",
    "name": "Chicken Tandoori Lollipop (ಚಿಕನ್ ತಂದೂರಿ ಲಾಲಿಪಾಪ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_314",
    "name": "Chicken Tandoori Kabab (ಚಿಕನ್ ತಂದೂರಿ ಕಬಾಬ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_315",
    "name": "Tandoori Chicken Half (ತಂದೂರಿ ಚಿಕನ್ ಹಾಫ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_316",
    "name": "Sholay Kabab (ಶೋಲೇ ಕಬಾಬ್)",
    "categoryId": "cat_40",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false
  },
  {
    "_id": "item_317",
    "name": "Chicken Saagwala Full (ಚಿಕನ್ ಸಾಗ್‌ವಾಲಾ ಫುಲ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 360,
    "isVeg": false
  },
  {
    "_id": "item_318",
    "name": "Chicken Green Full (ಚಿಕನ್ ಗ್ರೀನ್ ಫುಲ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 360,
    "isVeg": false
  },
  {
    "_id": "item_319",
    "name": "Chicken Peshawari Full (ಚಿಕನ್ ಪೇಶಾವಾರಿ ಫುಲ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 360,
    "isVeg": false
  },
  {
    "_id": "item_320",
    "name": "Butter Chicken Full Bone Less (ಬಟರ್ ಚಿಕನ್ ಫುಲ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 360,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_321",
    "name": "Murgh Masala Full (ಮುರ್ಗ್ ಮಸಾಲಾ ಫುಲ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 360,
    "isVeg": false
  },
  {
    "_id": "item_322",
    "name": "Chicken Green Half (ಚಿಕನ್ ಗ್ರೀನ್ ಹಾಫ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_323",
    "name": "Chicken Peshawari Half (ಚಿಕನ್ ಪೇಶಾವಾರಿ ಹಾಫ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_324",
    "name": "Chicken Handi (ಚಿಕನ್ ಹಂಡಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_325",
    "name": "Chicken Kadai (ಚಿಕನ್ ಕಡಾಯಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_326",
    "name": "Chicken Masala (ಚಿಕನ್ ಮಸಾಲಾ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_327",
    "name": "Butter Chicken Half Bone Less (ಬಟರ್ ಚಿಕನ್ ಹಾಫ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_328",
    "name": "Murgh Masala Half (ಮುರ್ಗ್ ಮಸಾಲಾ ಹಾಫ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_329",
    "name": "Chicken Saagwala Half (ಚಿಕನ್ ಸಾಗ್‌ವಾಲಾ ಹಾಫ್)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_330",
    "name": "Chicken Bharta (ಚಿಕನ್ ಭರ್ತಾ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_331",
    "name": "Chicken Dopyaza (ಚಿಕನ್ ದೋ ಪ್ಯಾವಾ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_332",
    "name": "Chicken Kalimirchi (ಚಿಕನ್ ಕಾಲಿಮಿರ್ಚಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_333",
    "name": "Chicken Hyderabadi (ಚಿಕನ್ ಹೈದ್ರಾಬಾದಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_334",
    "name": "Chicken Kolhapuri (ಚಿಕನ್ ಕೊಲ್ಲಾಪೂರಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_335",
    "name": "Chicken Tikka Masala (ಚಿಕನ್ ಟಿಕ್ಕಾ ಮಸಾಲಾ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_336",
    "name": "Chicken Mangalore Curry (ಚಿಕನ್ ಮಂಗಳೂರು ಕರಿ)",
    "categoryId": "cat_41",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_337",
    "name": "Kalmi Ghee Roast [Two Pcs] (ಕಲ್ಮಿ ಘೀ ರೋಸ್ಟ್ ಟೂ ಪೀಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_338",
    "name": "Drums of Heaven (ಡ್ರಮ್ಸ್ ಆಫ್ ಹೆವನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 260,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_339",
    "name": "Kalmi Ghee Roast (One Pcs) (ಕಲ್ಮಿ ಘೀ ರೋಸ್ಟ್ ಒನ್ ಪೀಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": false
  },
  {
    "_id": "item_340",
    "name": "Chicken Pepper Nati [Dry Bone Less] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 260,
    "isVeg": false
  },
  {
    "_id": "item_341",
    "name": "Chicken Lollipop (ಚಿಕನ್ ಲಾಲಿಪಾಪ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_342",
    "name": "Chicken Ghee Roast (ಚಿಕನ್ ಘೀ ರೋಸ್ಟ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_343",
    "name": "Chicken 65(Bone Less) (ಚಿಕನ್ 65 ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_344",
    "name": "Chicken Chilly(Bone Less) (ಚಿಕನ್ ಚಿಲ್ಲಿ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_345",
    "name": "Chicken Manchurian (Bone Less) (ಚಿಕನ್ ಮಂಚೂರಿಯನ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_346",
    "name": "Schezwan Chicken (Bone Less) (ಸೆಜುವಾನ್ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_347",
    "name": "Chicken (Palak or Pudina)Dry (ಚಿಕನ್ ಪಾಲಕ್ / ಪುದಿನಾ ಡ್ರೈ)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_348",
    "name": "Lemon Chicken (ಲೆಮನ್ ಚಿಕನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_349",
    "name": "Garlic Chicken (ಗಾರ್ಲಿಕ್ ಚಿಕನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_350",
    "name": "Ginger Chicken (ಜಿಂಜರ್ ಚಿಕನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_351",
    "name": "Chicken Pepper Dry (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_352",
    "name": "Chicken Spring Roll (ಚಿಕನ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_353",
    "name": "Guntur Chicken {Bone Less} (ಗುಂಟೂರ್ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_354",
    "name": "Andhra Style Chilly Chicken [Bone Less] (ಆಂಧ್ರ ಸ್ಟೈಲ್ ಚಿಲ್ಲಿ ಚಿಕನ್ ಬೋನ್ ಲೆಸ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_355",
    "name": "Chicken Sukka (ಚಿಕನ್ ಸುಕ್ಕಾ)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_356",
    "name": "Chicken Nellore (ಚಿಕನ್ ನೆಲ್ಲೂರ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_357",
    "name": "Chicken Pepper Dry [With Bone] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ವಿತ್ ಬೋನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_358",
    "name": "Chicken Kabab 8 (ಚಿಕನ್ ಕಬಾಬ್ 8)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_359",
    "name": "Guntur Chicken (ಗುಂಟೂರ್ ಚಿಕನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_360",
    "name": "Chicken Varuval (With Bone) (ಚಿಕನ್ ಓರವಲ್ ವಿತ್ ಬೋನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_361",
    "name": "Khsatriya Chicken (ಕ್ಷತ್ರಿಯಾ ಚಿಕನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_362",
    "name": "Andhra Style Chilly Chicken [Bone] (ಆಂಧ್ರ ಸ್ಟೈಲ್ ಚಿಲ್ಲಿ ಚಿಕನ್ ಬೋನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_363",
    "name": "Chicken Curry Leaves Dry (ಚಿಕನ್ ಕರೀ ಲೀವ್ಸ್ ಡ್ರೈ)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_364",
    "name": "Chicken Pepper Dry Nati [With Bone] (ಚಿಕನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ ವಿತ್ ಬೋನ್)",
    "categoryId": "cat_42",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_365",
    "name": "Mutton Sukka (ಮಟನ್ ಸುಕ್ಕಾ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_366",
    "name": "Mutton Pepper Dry Nati (ಮಟನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_367",
    "name": "Mutton Pepper Dry (ಮಟನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_368",
    "name": "Mutton Chops (ಮಟನ್ ಚಾಪ್ಸ್)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_369",
    "name": "Mutton Chilly (ಮಟನ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_370",
    "name": "Mutton Nellur (ಮಟನ್ ನೆಲ್ಲೂರ್)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_371",
    "name": "Mutton Guntur (ಮಟನ್ ಗುಂಟೂರ್)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_372",
    "name": "Mutton Ghee Roast (ಮಟನ್ ಘೀ ರೋಸ್ಟ್)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_373",
    "name": "Mutton Kheema Ball (ಮಟನ್ ಕೀಮಾ ಬಾಲ್)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_374",
    "name": "Mutton Chilly Fry (ಮಟನ್ ಚಿಲ್ಲಿ ಫ್ರೈ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_375",
    "name": "Mutton Schezwan Dry (ಮಟನ್ ಸೆಝವಾನ್ ಡ್ರೈ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_376",
    "name": "Mutton Kheema Chilly Fry (ಮಟನ್ ಕೀಮಾ ಚಿಲ್ಲಿ ಫ್ರೈ)",
    "categoryId": "cat_43",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_377",
    "name": "Mutton Masala (ಮಟನ್ ಮಸಾಲಾ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_378",
    "name": "Mutton Kheema Hyderabadi (ಮಟನ್ ಕೀಮಾ ಹೈದ್ರಾಬಾದಿ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_379",
    "name": "Mutton Kheema with Egg (ಮಟನ್ ಕೀಮಾ ವಿತ್ ಎಗ್)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_380",
    "name": "Mutton Kadai (ಮಟನ್ ಕಡಾಯಿ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_381",
    "name": "Mutton Rogangosh (ಮಟನ್ ರೋಗನ್ ಘೋಷ್)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_382",
    "name": "Mutton Saagwala (ಮಟನ್ ಸಾಗ್ ವಾಲಾ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_383",
    "name": "Mutton Kolhapuri (ಮಟನ್ ಕೊಲ್ಲಾಪುರಿ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_384",
    "name": "Mutton Hyderabadi (ಮಟನ್ ಹೈದ್ರಾಬಾದಿ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_385",
    "name": "Mutton Kheema Masala (ಮಟನ್ ಕೀಮಾ ಮಸಾಲಾ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_386",
    "name": "Mutton Kheema with Mutter (ಮಟನ್ ಕೀಮಾ ವಿತ್ ಮಟರ್)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_387",
    "name": "Mutton Mangalorean Curry (ಮಟನ್ ಮಂಗಳೂರಿಯನ್ ಕರಿ)",
    "categoryId": "cat_44",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_388",
    "name": "Chicken Biryani (ಚಿಕನ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_389",
    "name": "Biryani Rice (ಬಿರಿಯಾನಿ ರೈಸ್)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 125,
    "isVeg": true
  },
  {
    "_id": "item_390",
    "name": "Egg Biryani (ಎಗ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": false
  },
  {
    "_id": "item_391",
    "name": "Veg Biryani (ವೆಜ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_392",
    "name": "Mutton Biryani (ಮಟನ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 280,
    "isVeg": false,
    "featured": true
  },
  {
    "_id": "item_393",
    "name": "Mutton Mughlai Biryani (ಮಟನ್ ಮುಗಲಾಯ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_394",
    "name": "Mushroom Tikka Biryani (ಮಶ್ರೂಮ್ ಟಿಕ್ಕಾ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 225,
    "isVeg": true
  },
  {
    "_id": "item_395",
    "name": "Chicken Hyderabadi Biryani (ಚಿಕನ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_396",
    "name": "Chicken Handi Biryani (ಚಿಕನ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_397",
    "name": "Chicken Mughlai Biryani (ಚಿಕನ್ ಮುಗಲ್ಲಾಯ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_398",
    "name": "Chicken Tikka Biryani (ಚಿಕನ್ ಟಿಕ್ಕಾ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_399",
    "name": "Mutton Hyderabadi Biryani (ಮಟನ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_400",
    "name": "Mutton Handi Biryani (ಮಟನ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_401",
    "name": "Veg Handi Biryani (ವೆಜ್ ಹಂಡಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_402",
    "name": "Veg Hyderabadi Biryani (ವೆಜ್ ಹೈದ್ರಾಬಾದಿ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_403",
    "name": "Veg Mughlai Biryani (ವೆಜ್ ಮುಗಲಾಯ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_404",
    "name": "Mushroom Biryani (ಮಶ್ರೂಮ್ ಬಿರಿಯಾನಿ)",
    "categoryId": "cat_45",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_405",
    "name": "Egg Noodles (ಎಗ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": false
  },
  {
    "_id": "item_406",
    "name": "Chicken Chowmein (ಚಿಕನ್ ಚೌಮೆನ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_407",
    "name": "Egg Fried Rice (ಎಗ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": false
  },
  {
    "_id": "item_408",
    "name": "Singapore Chicken Noodles (ಸಿಂಗಾಪೂರ್ ಚಿಕನ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_409",
    "name": "Chicken Hakka Noodles (ಚಿಕನ್ ಹಕ್ಕಾ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_410",
    "name": "Chicken Fried Rice (ಚಿಕನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": false
  },
  {
    "_id": "item_411",
    "name": "Chicken Triple Noodles (ಚಿಕನ್ ಟ್ರಿಪಲ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_412",
    "name": "Chicken American Chopsuey (ಚಿಕನ್ ಅಮೆರಿಕನ್ ಚೋಪ್ಸಿ)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_413",
    "name": "Chicken Schezwan Fried Rice (ಚಿಕನ್ ಸೆಜುವಾನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_414",
    "name": "Chicken Garlic Fried Rice (ಚಿಕನ್ ಗಾರ್ಲಿಕ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_415",
    "name": "Mutton Fried Rice (ಮಟನ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_416",
    "name": "Chicken Schezwan Noodles (ಚಿಕನ್ ಸೆಜುವಾನ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_417",
    "name": "Mix Non Veg Fried Rice (ಮಿಕ್ಸ್ ನಾನ್ ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_418",
    "name": "Chicken Triple Fried Rice (ಚಿಕನ್ ಟ್ರಿಪಲ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_46",
    "section": "HOTEL_RAAMA",
    "price": 250,
    "isVeg": false
  },
  {
    "_id": "item_419",
    "name": "Veg Chowmein (ವೆಜ್ ಚೌಮೆನ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_420",
    "name": "Palak Rice (ಪಾಲಕ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_421",
    "name": "Basmathi Steamed Rice (ಬಾಸುಮತಿ ಸ್ಟೀಮ್ಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 95,
    "isVeg": true
  },
  {
    "_id": "item_422",
    "name": "Plain Rice (ಪ್ಲೇನ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_423",
    "name": "Curd Rice (ಕರ್ಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_424",
    "name": "Lemon Rice (ಲೆಮನ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_425",
    "name": "Schezwan Veg Fried Rice (ಸೆಜುವಾನ್ ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_426",
    "name": "Veg Triple Fried Rice (ವೆಜ್ ಟ್ರಿಪಲ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 160,
    "isVeg": true
  },
  {
    "_id": "item_427",
    "name": "Schezwan Veg Noodles (ಸೆಜುವಾನ್ ವೆಜ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_428",
    "name": "Hakka Noodles Veg (ಹಕ್ಕಾ ನೂಡಲ್ಸ್ ವೆಜ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_429",
    "name": "Veg Fried Rice (ವೆಜ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_430",
    "name": "Veg Triple Noodles (ವೆಜ್ ಟ್ರಿಪಲ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_431",
    "name": "Veg American Chopsuey (ಚೌಮೆನ್ ಅಮೆರಿಕನ್ ಚೋಪ್ಸಿ)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_432",
    "name": "Garlic Fried Rice (ಗಾರ್ಲಿಕ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_433",
    "name": "Paneer Fried Rice (ಪನ್ನೀರ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_434",
    "name": "Mushroom Fried Rice (ಮಶ್ರೂಮ್ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_435",
    "name": "Veg Pulav (ವೆಜ್ ಪುಲಾವ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_436",
    "name": "Peas Pulav (ಪೀಸ್ ಪುಲಾವ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_437",
    "name": "Singapore Rice (ಸಿಂಗಾಪೂರ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_438",
    "name": "Veg Singapore Noodles (ವೆಜ್ ಸಿಂಗಾಪೂರ್ ನೂಡಲ್ಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_439",
    "name": "Jeera Fried Rice (ಜೀರಾ ಫ್ರೈಡ್ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_440",
    "name": "Dal Khichadi (ದಾಲ್ ಕಿಚಡಿ)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_441",
    "name": "Ghee Rice (ಘೀ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_442",
    "name": "Jeera Rice (ಜೀರಾ ರೈಸ್)",
    "categoryId": "cat_47",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_443",
    "name": "Mushroom Tikka (ಮಶ್ರೂಮ್ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_48",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_444",
    "name": "Paneer Tikka (ಪನ್ನೀರ್ ಟಿಕ್ಕಾ)",
    "categoryId": "cat_48",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_445",
    "name": "Tandoori Babycorn (ತಂದೂರಿ ಬೇಬಿ ಕಾರ್ನ್)",
    "categoryId": "cat_48",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_446",
    "name": "Tandoori Mushroom (ತಂದೂರಿ ಮಶ್ರೂಮ್)",
    "categoryId": "cat_48",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_447",
    "name": "Paneer Manchurian (ಪನ್ನೀರ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_448",
    "name": "Paneer Chilly (ಪನ್ನೀರ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_449",
    "name": "Lemon Paneer (ಲೆಮನ್ ಪನ್ನೀರ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_450",
    "name": "Guntur Paneer (ಗುಂಟೂರ್ ಪನ್ನೀರ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_451",
    "name": "Paneer Pepper Dry (ಪನ್ನೀರ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_452",
    "name": "Paneer Ghee Roast (ಪನ್ನೀರ್ ಘೀ ರೋಸ್ಟ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_453",
    "name": "Spanish Manchurian (ಸ್ಪ್ಯಾನಿಶ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_454",
    "name": "Mushroom Pepper Dry Naati (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_455",
    "name": "Babycorn Pepper Dry Naati (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_456",
    "name": "Gobi Pepper Dry Naati (ಗೋಬಿ ಪೆಪ್ಪರ್ ಡ್ರೈ ನಾಟಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_457",
    "name": "Harabara Kabab (ಹರಬರ ಕಬಾಬ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_458",
    "name": "Gobi Chilly (ಗೋಬಿ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_459",
    "name": "Gobi Pepper Dry (ಗೋಬಿ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_460",
    "name": "Onion Pakoda (ಆನಿಯನ್ ಪಕೋಡ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_461",
    "name": "Capsicum Pakoda (ಕ್ಯಾಪ್ಸಿಕಮ್ ಪಕೋಡ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_462",
    "name": "Paneer Satay (ಪನ್ನೀರ್ ಸಾಟೆ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": true
  },
  {
    "_id": "item_463",
    "name": "Onion Rings (ಆನಿಯನ್ ರಿಂಗ್ಸ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_464",
    "name": "Gobi Manchurian (ಗೋಬಿ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_465",
    "name": "Babycorn - 65 (ಬೇಬಿ ಕಾರ್ನ್ 65)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_466",
    "name": "Veg Spring Roll (ವೆಜ್ ಸ್ಪ್ರಿಂಗ್ ರೋಲ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_467",
    "name": "Veg Ball Manchurian (ವೆಜ್ ಬಾಲ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_468",
    "name": "Mushroom Chilly (ಮಶ್ರೂಮ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_469",
    "name": "Mushroom Manchurian (ಮಶ್ರೂಮ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_470",
    "name": "Mushroom Pepper Dry (ಮಶ್ರೂಮ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_471",
    "name": "Baby Corn Chilly (ಬೇಬಿ ಕಾರ್ನ್ ಚಿಲ್ಲಿ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_472",
    "name": "Baby Corn Pepper Dry (ಬೇಬಿ ಕಾರ್ನ್ ಪೆಪ್ಪರ್ ಡ್ರೈ)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_473",
    "name": "Baby Corn Manchurian (ಬೇಬಿ ಕಾರ್ನ್ ಮಂಚೂರಿಯನ್)",
    "categoryId": "cat_49",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_474",
    "name": "Gobi Masala (ಗೋಬಿ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_475",
    "name": "Tomato Masala (ಟೊಮೆಟೋ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_476",
    "name": "Kaju Masala (ಕಾಜು ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": true
  },
  {
    "_id": "item_477",
    "name": "Kaju Paneer Masala (ಕಾಜು ಪನ್ನೀರ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 240,
    "isVeg": true
  },
  {
    "_id": "item_478",
    "name": "Aloo Gobi Kurma (ಆಲು ಗೋಬಿ ಕುರ್ಮಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_479",
    "name": "Plain Palak (ಪ್ಲೇನ್ ಪಾಲಕ್)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_480",
    "name": "Veg Makhan Wala (ವೆಜ್ ಮಾಖನ್ ವಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_481",
    "name": "Green Peas Masala (ಗ್ರೀನ್ ಪೀಸ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_482",
    "name": "Mix Veg Curry (ಮಿಕ್ಸ್ ವೆಜ್ ಕರಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_483",
    "name": "Veg Kurma (ವೆಜ್ ಕುರ್ಮಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_484",
    "name": "Veg Hyderabadi (ವೆಜ್ ಹೈದೆರಾಬಾದಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_485",
    "name": "Baby Corn Masala (ಬೇಬಿ ಕಾರ್ನ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_486",
    "name": "Veg Jaipuri (ವೆಜ್ ಜೈಪುರಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_487",
    "name": "Veg Kolhapuri (ವೆಜ್ ಕೊಲ್ಲಾಪುರಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_488",
    "name": "Capsicum Masala (ಕ್ಯಾಪ್ಸಿಕಮ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_489",
    "name": "Aloo Palak (ಆಲೂ ಪಾಲಕ್)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_490",
    "name": "Mushroom Masala (ಮಶ್ರೂಮ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_491",
    "name": "Paneer Burji (ಪನ್ನೀರ್ ಬುರ್ಜಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_492",
    "name": "Paneer Guchi (ಪನ್ನೀರ್ ಗುಚ್ಚಿ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_493",
    "name": "Paneer Tikka Masala (ಪನ್ನೀರ್ ಟಿಕ್ಕಾ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": true
  },
  {
    "_id": "item_494",
    "name": "Paneer Butter Masala (ಪನ್ನೀರ್ ಬಟರ್ ಮಸಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_495",
    "name": "Navratna Kurma (ನವರತ್ನ ಕುರ್ಮಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_496",
    "name": "Paneer Palak (ಪನ್ನೀರ್ ಪಾಲಕ್)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_497",
    "name": "Veg Dopayza (ವೆಜ್ ದೋಪ್ಯಾಝ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_498",
    "name": "Shahi Kurma (ಶಾಹಿ ಕುರ್ಮಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_499",
    "name": "Veg Patiyala (ವೆಜ್ ಪಟಿಯಾಲಾ)",
    "categoryId": "cat_50",
    "section": "HOTEL_RAAMA",
    "price": 185,
    "isVeg": true
  },
  {
    "_id": "item_500",
    "name": "Roti (ರೋಟಿ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_501",
    "name": "Butter Naan (ಬಟರ್ ನಾನ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_502",
    "name": "Garlic Naan (ಗಾರ್ಲಿಕ್ ನಾನ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_503",
    "name": "Aloo Parota (ಆಲೂ ಪರೋಟ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 70,
    "isVeg": true
  },
  {
    "_id": "item_504",
    "name": "Roti Basket (ರೋಟಿ ಬ್ಯಾಸ್ಕೆಟ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 165,
    "isVeg": true
  },
  {
    "_id": "item_505",
    "name": "Roti Basket Butter (ರೋಟಿ ಬ್ಯಾಸ್ಕೆಟ್ ಬಟರ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_506",
    "name": "Butter Roti (ಬಟರ್ ರೋಟಿ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_507",
    "name": "Methi Roti (ಮೇಥಿ ರೋಟಿ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_508",
    "name": "Pudina Roti (ಪುದಿನಾ ರೋಟಿ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_509",
    "name": "Kulcha (ಕುಲ್ಚಾ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 40,
    "isVeg": true
  },
  {
    "_id": "item_510",
    "name": "Butter Garlic Naan (ಬಟರ್ ಗಾರ್ಲಿಕ್ ನಾನ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_511",
    "name": "Kashmiri Naan (ಕಾಶ್ಮೀರಿ ನಾನ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 75,
    "isVeg": true
  },
  {
    "_id": "item_512",
    "name": "Naan (ನಾನ್)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_513",
    "name": "Butter Kulcha (ಬಟರ್ ಕುಲ್ಚಾ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_514",
    "name": "Parota (ಪರೋಟ)",
    "categoryId": "cat_51",
    "section": "HOTEL_RAAMA",
    "price": 45,
    "isVeg": true
  },
  {
    "_id": "item_515",
    "name": "Paneer Kadai (ಪನ್ನೀರ್ ಕಡಾಯ್)",
    "categoryId": "cat_52",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_516",
    "name": "Kadai Mushroom (ಕಡಾಯ್ ಮಶ್ರೂಮ್)",
    "categoryId": "cat_52",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_517",
    "name": "Kadai Gobi Mutter (ಕಡಾಯ್ ಗೋಬಿ ಮಟರ್)",
    "categoryId": "cat_52",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_518",
    "name": "Kadai Mix Veg (ಕಡಾಯ್ ಮಿಕ್ಸ್ ವೆಜ್)",
    "categoryId": "cat_52",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_519",
    "name": "Kadai Veg Kollapori (ಕಡಾಯ್ ವೆಜ್ ಕೊಲ್ಲಾಪುರಿ)",
    "categoryId": "cat_52",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_520",
    "name": "Pomfret Masala (ಪ್ರೋಂಫ್ರೆಟ್ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 320,
    "isVeg": false
  },
  {
    "_id": "item_521",
    "name": "Pomfret Tawa (ಪ್ರೋಂಫ್ರೆಟ್ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 320,
    "isVeg": false
  },
  {
    "_id": "item_522",
    "name": "Pomfret Rava (ಪ್ರೋಂಫ್ರೆಟ್ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 320,
    "isVeg": false
  },
  {
    "_id": "item_523",
    "name": "Pomfret Naget Fry (ಪ್ರೋಂಫ್ರೆಟ್ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 320,
    "isVeg": false
  },
  {
    "_id": "item_524",
    "name": "Bangda Masala (ಬಾಂಗ್ಡಾ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_525",
    "name": "Bangda Tawa (ಬಾಂಗ್ಡಾ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_526",
    "name": "Bangda Rava (ಬಾಂಗ್ಡಾ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_527",
    "name": "Bangda Naget Fry (ಬಾಂಗ್ಡಾ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 220,
    "isVeg": false
  },
  {
    "_id": "item_528",
    "name": "Badshah Masala (ಬಾದ್‌ಶಾ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_529",
    "name": "Badshah Tawa (ಬಾದ್‌ಶಾ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_530",
    "name": "Badshah Rava (ಬಾದ್‌ಶಾ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_531",
    "name": "Badshah Naget Fry (ಬಾದ್‌ಶಾ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_532",
    "name": "Prawns Masala (ಪ್ರಾನ್ಸ್ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_533",
    "name": "Prawns Tawa (ಪ್ರಾನ್ಸ್ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_534",
    "name": "Prawns Rava (ಪ್ರಾನ್ಸ್ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_535",
    "name": "Prawns Naget Fry (ಪ್ರಾನ್ಸ್ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 300,
    "isVeg": false
  },
  {
    "_id": "item_536",
    "name": "Anjal Masala (ಅಂಜಾಲ್ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 340,
    "isVeg": false
  },
  {
    "_id": "item_537",
    "name": "Anjal Tawa (ಅಂಜಾಲ್ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 340,
    "isVeg": false
  },
  {
    "_id": "item_538",
    "name": "Anjal Rava (ಅಂಜಾಲ್ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 340,
    "isVeg": false
  },
  {
    "_id": "item_539",
    "name": "Anjal Naget Fry (ಅಂಜಾಲ್ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 340,
    "isVeg": false
  },
  {
    "_id": "item_540",
    "name": "Tiger Prawns Masala (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ಮಸಾಲಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 380,
    "isVeg": false
  },
  {
    "_id": "item_541",
    "name": "Tiger Prawns Tawa (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ತವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 380,
    "isVeg": false
  },
  {
    "_id": "item_542",
    "name": "Tiger Prawns Rava (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ರವಾ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 380,
    "isVeg": false
  },
  {
    "_id": "item_543",
    "name": "Tiger Prawns Naget Fry (ಟೈಗರ್ ಪ್ರಾನ್ಸ್ ನಗೆಟ್ ಫ್ರೈ)",
    "categoryId": "cat_53",
    "section": "HOTEL_RAAMA",
    "price": 380,
    "isVeg": false
  },
  {
    "_id": "item_544",
    "name": "Softdrinks (ಸಾಫ್ಟ್ ಡ್ರಿಂಕ್ಸ್)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 25,
    "isVeg": true
  },
  {
    "_id": "item_545",
    "name": "Plain Curds (ಪ್ಲೇನ್ ಕರ್ಡ್ಸ್)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_546",
    "name": "Lassi (ಲಸ್ಸಿ)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 65,
    "isVeg": true
  },
  {
    "_id": "item_547",
    "name": "Butter Milk (ಬಟರ್ ಮಿಲ್ಕ್)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_548",
    "name": "Rasam (ರಸಂ)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_549",
    "name": "Ice Cubes (ಐಸ್ ಕ್ಯೂಬ್ಸ್)",
    "categoryId": "cat_54",
    "section": "HOTEL_RAAMA",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_550",
    "name": "Dal Fry (ದಾಲ್ ಫ್ರೈ)",
    "categoryId": "cat_55",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_551",
    "name": "Dal Punjabi (ದಾಲ್ ಪಂಜಾಬಿ)",
    "categoryId": "cat_55",
    "section": "HOTEL_RAAMA",
    "price": 140,
    "isVeg": true
  },
  {
    "_id": "item_552",
    "name": "Dal Tadka (ದಾಲ್ ತಡ್ಕಾ)",
    "categoryId": "cat_55",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_553",
    "name": "Dal Palak (ದಾಲ್ ಪಾಲಕ್)",
    "categoryId": "cat_55",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_554",
    "name": "Panner Kofta (ಪನ್ನೀರ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_555",
    "name": "Malai Kofta (ಮಲಾಯ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_556",
    "name": "Veg Kofta (ವೆಜ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_557",
    "name": "Stuffed Kofta (ಸ್ಟಫ್ಡ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 200,
    "isVeg": true
  },
  {
    "_id": "item_558",
    "name": "Stuffed Capsicum (ಸ್ಟಫ್ಡ್ ಕ್ಯಾಪ್ಸಿಕಮ್)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_559",
    "name": "Nargis Kofta (ನರ್ಗೀಸ್ ಕೋಫ್ತಾ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 180,
    "isVeg": true
  },
  {
    "_id": "item_560",
    "name": "Stuffed Aloo (ಸ್ಟಫ್ಡ್ ಆಲೂ)",
    "categoryId": "cat_56",
    "section": "HOTEL_RAAMA",
    "price": 170,
    "isVeg": true
  },
  {
    "_id": "item_561",
    "name": "Water Melon (ವಾಟರ್ ಮೆಲನ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_562",
    "name": "Fresh Lime Juice (ಫ್ರೆಶ್ ಲೈಮ್ ಜ್ಯೂಸ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 50,
    "isVeg": true
  },
  {
    "_id": "item_563",
    "name": "Fresh Lime Soda (ಫ್ರೆಶ್ ಲೈಮ್ ಸೋಡ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_564",
    "name": "Mint Lime Water (ಮಿಂಟ್ ಲೈಮ್ ವಾಟರ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 60,
    "isVeg": true
  },
  {
    "_id": "item_565",
    "name": "Mint Lime Soda (ಮಿಂಟ್ ಲೈಮ್ ಸೋಡ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 80,
    "isVeg": true
  },
  {
    "_id": "item_566",
    "name": "Milk Shake Mango (ಮಿಲ್ಕ್ ಶೇಕ್ ಮ್ಯಾಂಗೋ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_567",
    "name": "Milk Shake Chikku (ಮಿಲ್ಕ್ ಶೇಕ್ ಚಿಕ್ಕು)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_568",
    "name": "Milk Shake Apple (ಮಿಲ್ಕ್ ಶೇಕ್ ಆಪಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_569",
    "name": "Milk Shake Seasonal (ಮಿಲ್ಕ್ ಶೇಕ್ ಸೀಸೋನಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_570",
    "name": "Milk Shake Vanilla (ಮಿಲ್ಕ್ ಶೇಕ್ ವೆನಿಲಾ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_571",
    "name": "Milk Shake Strawberry (ಮಿಲ್ಕ್ ಶೇಕ್ ಸ್ಟ್ರಾಬೆರಿ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_572",
    "name": "Milk Shake Pista (ಮಿಲ್ಕ್ ಶೇಕ್ ಪಿಸ್ತಾ)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_573",
    "name": "Milk Shake Chocolate (ಮಿಲ್ಕ್ ಶೇಕ್ ಚಾಕೋಲೇಟ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_574",
    "name": "Musambi Seasonal (ಮೂಸಂಬಿ ಸೀಸೋನಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_575",
    "name": "Orange Juice Seasonal (ಆರೆಂಜ್ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_576",
    "name": "Grape Juice Seasonal (ಗ್ರೇಪ್ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_577",
    "name": "Pineapple (ಪೈನಾಪಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_578",
    "name": "Mango Juice Seasonal (ಮ್ಯಾಂಗೋ ಜ್ಯೂಸ್ ಸೀಸೋನಲ್)",
    "categoryId": "cat_57",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_579",
    "name": "Fruit Salad (ಫ್ರೂಟ್ ಸಲಾಡ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_580",
    "name": "Fruit Salad with Ice Cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಐಸ್‌ಕ್ರೀಮ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 120,
    "isVeg": true
  },
  {
    "_id": "item_581",
    "name": "Raja Rani (ರಾಜಾ ರಾಣಿ)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_582",
    "name": "My Darling (ಮೈ ಡಾರ್ಲಿಂಗ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_583",
    "name": "Golden Cherry (ಗೋಲ್ಡನ್ ಚೆರ್ರಿ)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_584",
    "name": "Nut Sunday (ನಟ್ ಸಂಡೆ)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_585",
    "name": "Honey Moon Spl (ಹನಿ ಮೂನ್ ಸ್ಪೇಷಲ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_586",
    "name": "Gudbud (ಘಡ್‌ಬಡ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_587",
    "name": "Vanilla Sunday (ವೆನಿಲಾ ಸಂಡೆ)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_588",
    "name": "My Dream (ಮೈ ಡ್ರೀಮ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 150,
    "isVeg": true
  },
  {
    "_id": "item_589",
    "name": "Raama Spl (ರಾಮಾ ಸ್ಪೇಷಲ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_590",
    "name": "Triple Sunday (ಟ್ರಿಪಲ್ ಸಂಡೆ)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 175,
    "isVeg": true
  },
  {
    "_id": "item_591",
    "name": "Fruit Salad with Jelly & Ice Cream (ಫ್ರೂಟ್ ಸಲಾಡ್ ವಿತ್ ಜೆಲ್ಲಿ ಅಂಡ್ ಐಸ್‌ಕ್ರೀಮ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 130,
    "isVeg": true
  },
  {
    "_id": "item_592",
    "name": "Cut Fruit (ಕಟ್ ಫ್ರೂಟ್)",
    "categoryId": "cat_58",
    "section": "HOTEL_RAAMA",
    "price": 110,
    "isVeg": true
  },
  {
    "_id": "item_593",
    "name": "Dry Fruit (ಡ್ರೈ ಫ್ರೂಟ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_594",
    "name": "Black Currant (ಬ್ಲಾಕ್ ಕರಂಟ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 100,
    "isVeg": true
  },
  {
    "_id": "item_595",
    "name": "Chocolate (ಚಾಕ್ಲೇಟ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_596",
    "name": "Pista (ಪಿಸ್ತಾ)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_597",
    "name": "Vanilla (ವೆನಿಲ್ಲಾ)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_598",
    "name": "Mango (ಮ್ಯಾಂಗೋ)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_599",
    "name": "Strawberry (ಸ್ಟ್ರಾಬೆರಿ)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_600",
    "name": "Butterscotch (ಬಟರ್ ಸ್ಕಾಚ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 85,
    "isVeg": true
  },
  {
    "_id": "item_601",
    "name": "Gulab Jamun (ಗುಲಾಬ್ ಜಾಮೂನ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 35,
    "isVeg": true
  },
  {
    "_id": "item_602",
    "name": "Jamun with Ice Cream (ಜಾಮೂನ್ ವಿತ್ ಐಸ್‌ಕ್ರೀಮ್)",
    "categoryId": "cat_59",
    "section": "HOTEL_RAAMA",
    "price": 55,
    "isVeg": true
  },
  {
    "_id": "item_603",
    "name": "Choice of Veg Menu",
    "categoryId": "cat_60",
    "section": "SAMBHRAMA",
    "price": 450,
    "description": "Welcome drink, Kosambari, Palya, Payasa, 1 Fried item, 1 Poori/Akki Roti/Dosa/Pulao, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)",
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_604",
    "name": "Choice of 2 Veg Menu",
    "categoryId": "cat_60",
    "section": "SAMBHRAMA",
    "price": 500,
    "description": "Welcome drink, Veg Soup, Kosambari, 1 Fried item, 1 Poori/Akki Roti/Dosa, 1 Pulao/Biriyani, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)",
    "isVeg": true,
    "featured": true
  },
  {
    "_id": "item_605",
    "name": "Multiple Cuisine Menu",
    "categoryId": "cat_60",
    "section": "SAMBHRAMA",
    "price": 550,
    "description": "Welcome drink, Veg Soup, 2 Salads, 1 Veg starter, 1 Main course, 1 Dal, 2 Breads, 1 Pulao/Biriyani, Rice, Sweet, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)",
    "isVeg": true,
    "featured": true
  }
];

export const FALLBACK_PARTY_PACKAGES = [
  {
    _id: 'pkg_1',
    name: 'Choice of Veg Menu',
    price: 450,
    description: 'Welcome drink, Kosambari, Palya, Payasa, 1 Fried item, 1 Poori/Akki Roti/Dosa/Pulao, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)',
    isVeg: true,
    featured: true,
  },
  {
    _id: 'pkg_2',
    name: 'Choice of 2 Veg Menu',
    price: 500,
    description: 'Welcome drink, Veg Soup, Kosambari, 1 Fried item, 1 Poori/Akki Roti/Dosa, 1 Pulao/Biriyani, Rice, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)',
    isVeg: true,
    featured: true,
  },
  {
    _id: 'pkg_3',
    name: 'Multiple Cuisine Menu',
    price: 550,
    description: 'Welcome drink, Veg Soup, 2 Salads, 1 Veg starter, 1 Main course, 1 Dal, 2 Breads, 1 Pulao/Biriyani, Rice, Sweet, Sambar, Rasam, Curds, Papad, Pickle & Dessert (+GST)',
    isVeg: true,
    featured: true,
  },
];

export const FALLBACK_ATTRACTIONS = [
  {
    _id: 'attr_1',
    name: 'Chennakeshava Temple, Belur',
    category: 'Hoysala Heritage',
    distance: '38 km',
    image: '/chennakeshava-temple-belur.png',
    description: 'Famous 12th-century Hoysala temple renowned for intricate stone carvings and architecture.',
    sortOrder: 1,
  },
  {
    _id: 'attr_2',
    name: 'Hoysaleswara Temple, Halebidu',
    category: 'Hoysala Heritage',
    distance: '31 km',
    image: '/hoysaleswara-temple-halebidu.png',
    description: 'Twin-temple complex dedicated to Shiva, showcasing breathtaking stone sculptures.',
    sortOrder: 2,
  },
  {
    _id: 'attr_3',
    name: 'Shravanabelagola (Gommateshwara)',
    category: 'Pilgrimage',
    distance: '52 km',
    image: '/shravanabelagola.png',
    description: 'Home to the magnificent 57-foot monolithic statue of Lord Bahubali atop Vindhyagiri Hill.',
    sortOrder: 3,
  },
  {
    _id: 'attr_4',
    name: 'Manjarabad Fort, Sakleshpur',
    category: 'History & Forts',
    distance: '40 km',
    image: '/manjarabad-fort.jpg',
    description: 'Star-shaped fort built by Tipu Sultan offering panoramic views of the Western Ghats.',
    sortOrder: 4,
  },
  {
    _id: 'attr_5',
    name: 'Shettihalli Rosary Church',
    category: 'Historic Ruins',
    distance: '22 km',
    image: '/shettihalli-church.png',
    description: 'Submerged Gothic church ruins built in 1860, famous for its surreal monsoon landscape.',
    sortOrder: 5,
  },
  {
    _id: 'attr_6',
    name: 'Bisle Ghat Viewpoint',
    category: 'Nature & Trekking',
    distance: '85 km',
    image: '/bisle-ghat.png',
    description: 'Spectacular mountain outlook providing sweeping vistas of three mountain ranges.',
    sortOrder: 6,
  },
];

export const mockCalculateAvailability = (payload: any) => {
  const room = FALLBACK_ROOM_TYPES.find((r) => r._id === payload.roomTypeId) || FALLBACK_ROOM_TYPES[0];
  let numNights = 1;
  if (payload.checkIn && payload.checkOut) {
    const d1 = new Date(payload.checkIn).getTime();
    const d2 = new Date(payload.checkOut).getTime();
    const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    if (diff > 0) numNights = diff;
  }

  const baseRate = payload.planType === 'CP' ? (room.cpPrice || room.basePrice + 150) : room.basePrice;
  const roomTotal = baseRate * numNights;
  const extraPersonChargePerNight = payload.extraPerson ? 600 : 0;
  const extraPersonTotal = extraPersonChargePerNight * numNights;
  
  let mealPlanTotal = 0;
  const totalGuests = (payload.numGuests || 1) + (payload.extraPerson ? 1 : 0);
  if (payload.mealSelection?.breakfast) mealPlanTotal += 150 * totalGuests * numNights;
  if (payload.mealSelection?.lunch) mealPlanTotal += 250 * totalGuests * numNights;
  if (payload.mealSelection?.dinner) mealPlanTotal += 300 * totalGuests * numNights;

  let discountAmount = 0;
  if (payload.couponCode === 'RAAMA5') {
    discountAmount = Math.round((roomTotal + extraPersonTotal + mealPlanTotal) * 0.05);
  }

  const taxableAmount = Math.max(0, roomTotal + extraPersonTotal + mealPlanTotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * 0.12);
  const totalAmount = taxableAmount + taxAmount;

  return {
    availability: { isAvailable: true },
    pricing: {
      numNights,
      roomPricePerNight: baseRate,
      roomTotal,
      extraPerson: !!payload.extraPerson,
      extraPersonChargePerNight,
      extraPersonTotal,
      mealPlanTotal,
      couponCode: discountAmount > 0 ? (payload.couponCode || '') : '',
      discountAmount,
      taxAmount,
      totalAmount,
    },
  };
};

export const mockCreateBooking = (payload: any) => {
  const calc = mockCalculateAvailability(payload);
  const bookingId = `BK${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingToken = `TRK-${Date.now()}`;
  return {
    bookingId,
    trackingToken,
    totalAmount: calc.pricing.totalAmount,
    razorpayOrderId: `order_mock_${Date.now()}`,
    razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  };
};

export const mockCreateOrder = (payload: any) => {
  const orderId = `ORD${Math.floor(100000 + Math.random() * 900000)}`;
  const trackingToken = `ORDTRK-${Date.now()}`;
  const totalAmount = payload.items?.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0) || 350;
  return {
    orderId,
    trackingToken,
    totalAmount,
    razorpayOrderId: `order_mock_${Date.now()}`,
    razorpayKeyId: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
  };
};

export const mockAdminMetrics = {
  totalRooms: 40,
  occupiedRooms: 18,
  reservedRooms: 8,
  availableRooms: 14,
  occupancyRate: 65,
  pendingOrdersCount: 4,
  totalConfirmedBookings: 26,
  totalCombinedRevenue: 148500,
  revenueChart: [
    { month: 'Jan', revenue: 95000 },
    { month: 'Feb', revenue: 110000 },
    { month: 'Mar', revenue: 125000 },
    { month: 'Apr', revenue: 140000 },
    { month: 'May', revenue: 165000 },
    { month: 'Jun', revenue: 148500 },
  ],
};
