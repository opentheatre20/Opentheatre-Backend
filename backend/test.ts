import mongoose from 'mongoose';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('Connected DB');
  
  try {
    const user = await User.create({
      name: 'Google User',
      email: 'testgoogle@example.com',
      provider: 'google',
      providerId: '123456789',
      role: 'user',
    });
    console.log('User created successfully', user._id);
    await User.deleteOne({ _id: user._id });
  } catch (err: any) {
    console.error('Error creating user:', err.message);
  }
  
  mongoose.connection.close();
}

test();
