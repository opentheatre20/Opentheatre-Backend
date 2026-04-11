import mongoose from 'mongoose';
import User from './models/User';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const seedAdmin = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb+srv://open_theatre_user:open_theatre_pass_123@cluster0.sxmc7bp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    await mongoose.connect(uri);
    
    // Check if admin exists
    let admin = await User.findOne({ email: 'admin@opentheatre.com' });
    if (!admin) {
      admin = new User({
        name: 'Super Admin',
        email: 'admin@opentheatre.com',
        password: 'admin',
        role: 'SUPER_ADMIN',
        credit_balance: 10000,
        referral_code: 'SUPERAD'
      });
      await admin.save();
      console.log('✅ Admin user created successfully.');
    } else {
      admin.role = 'SUPER_ADMIN';
      admin.password = 'admin'; // Will be rehashed by User model pre-save hook
      await admin.save();
      console.log('✅ Admin user updated successfully.');
    }
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    mongoose.connection.close();
  }
};

seedAdmin();
