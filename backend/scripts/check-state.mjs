import mongoose from 'mongoose';

await mongoose.connect('mongodb://localhost:27017/lms');
const BR = mongoose.connection.collection('bookrequests');
const WC = mongoose.connection.collection('whatsappconfirmations');

const reqs = await BR.find({})
  .sort({ createdAt: -1 })
  .limit(5)
  .project({ requestId: 1, status: 1, remarks: 1, createdAt: 1, updatedAt: 1 })
  .toArray();

const confs = await WC.find({})
  .sort({ createdAt: -1 })
  .limit(5)
  .project({
    token: 1,
    status: 1,
    phone: 1,
    wasenderMsgId: 1,
    wasenderPollKeyId: 1,
    bookRequest: 1,
    createdAt: 1,
  })
  .toArray();

console.log('RECENT_REQUESTS', JSON.stringify(reqs, null, 2));
console.log('RECENT_CONFIRMATIONS', JSON.stringify(confs, null, 2));
await mongoose.disconnect();
