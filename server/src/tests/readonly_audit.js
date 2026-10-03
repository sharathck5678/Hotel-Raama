const mongoose = require('mongoose');

async function audit() {
  await mongoose.connect('mongodb://localhost:27017/hotel_raama');
  const roomsColl = mongoose.connection.collection('rooms');
  const rtColl = mongoose.connection.collection('roomtypes');
  const bookingsColl = mongoose.connection.collection('bookings');
  const ordersColl = mongoose.connection.collection('orders');

  const allActiveRooms = await roomsColl.find({ isActive: true }).toArray();
  const guestRooms = allActiveRooms.filter(r => !r.isVenue);
  const venues = allActiveRooms.filter(r => r.isVenue);
  const roomTypes = await rtColl.find().toArray();
  const rtMap = new Map(roomTypes.map(rt => [rt._id.toString(), rt]));

  console.log('=== SECTION 1: PHYSICAL INVENTORY ===');
  console.log('Active Guest Rooms:', guestRooms.length);
  console.log('Active Venues:', venues.length);
  const f1 = guestRooms.filter(r => r.floor === 1).map(r => r.roomNumber).sort((a,b)=>parseInt(a)-parseInt(b));
  const f2 = guestRooms.filter(r => r.floor === 2).map(r => r.roomNumber).sort((a,b)=>parseInt(a)-parseInt(b));
  const f3 = guestRooms.filter(r => r.floor === 3).map(r => r.roomNumber).sort((a,b)=>parseInt(a)-parseInt(b));
  console.log(`Floor 1 (${f1.length}):`, f1.join(', '));
  console.log(`Floor 2 (${f2.length}):`, f2.join(', '));
  console.log(`Floor 3 (${f3.length}):`, f3.join(', '));
  console.log('Has 104?:', guestRooms.some(r => r.roomNumber === '104'));
  const inactive = await roomsColl.find({ isActive: false }).toArray();
  console.log(`Inactive Old Rooms Count:`, inactive.length);

  console.log('\n=== SECTION 2: ROOM TYPE MAPPING ===');
  const grouped = {};
  guestRooms.forEach(r => {
    const rt = rtMap.get(r.roomTypeId?.toString());
    const code = rt?.code || 'UNKNOWN';
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(r.roomNumber);
  });
  for (const [code, list] of Object.entries(grouped)) {
    console.log(`${code} (${list.length} rooms):`, list.sort((a,b)=>parseInt(a)-parseInt(b)).join(', '));
  }
  console.log('\nSplit Bed Rooms (215, 303, 304):');
  ['215', '303', '304'].forEach(num => {
    const r = guestRooms.find(rm => rm.roomNumber === num);
    const rt = rtMap.get(r.roomTypeId?.toString());
    console.log(`Room ${num}: code=${rt?.code}, name="${rt?.name}", basePrice=₹${rt?.basePrice}, cpPrice=₹${rt?.cpPrice}`);
  });

  console.log('\n=== SECTION 3: SINGLE/DOUBLE AVAILABILITY POOL ===');
  const acPool = grouped['EXEC_DBL_AC'] || [];
  console.log(`Reported 22-room A/C pool count: ${acPool.length}`);
  console.log(`Rooms in 22-room A/C pool: ${acPool.sort((a,b)=>parseInt(a)-parseInt(b)).join(', ')}`);

  console.log('\n=== SECTION 5: VENUE ISOLATION ===');
  venues.forEach(v => {
    console.log(`Venue: "${v.roomNumber}", isVenue=${v.isVenue}, floor=${v.floor}, qrToken="${v.qrToken}"`);
  });

  console.log('\n=== SECTION 8: LEGACY DATABASE SAFETY ===');
  console.log('Historical Bookings in DB:', await bookingsColl.countDocuments());
  console.log('Historical Orders in DB:', await ordersColl.countDocuments());

  await mongoose.disconnect();
}

audit().catch(console.error);
