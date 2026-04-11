import mongoose from 'mongoose';
import Order from './src/models/Order';
import Movie from './src/models/Movie'; // Needed to register the model
import User from './src/models/User';   // Needed to register the model
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    try {
        console.log("Connected to DB");
        const activeOrders = await Order.find({
            accessExpiresAt: { $gt: new Date() },
        }).populate('movieId', 'title thumbnailUrl slug genre duration');
        console.log("Success:", activeOrders.length);
    } catch (e) {
        console.error("Error populating:", e);
    }
    mongoose.disconnect();
}).catch(console.error);
