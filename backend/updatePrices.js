const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://open_theatre_user:open_theatre_pass_123@cluster0.sxmc7bp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const db = mongoose.connection.db;
  await db.collection('movies').updateMany({}, { $set: { price: 99 } });
  console.log('Prices set to 99 INR');
  process.exit(0);
});
