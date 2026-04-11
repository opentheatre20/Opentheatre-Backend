import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in the environment.");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const email = "superadmin@opentheatre.com";
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log(`User with email ${email} already exists.`);
      existingAdmin.role = "SUPER_ADMIN";
      existingAdmin.password = "SuperPassword123!";
      await existingAdmin.save();
      console.log("Updated existing user to SUPER_ADMIN role and reset password to SuperPassword123!");
    } else {
      const superAdmin = new User({
        name: "Super Admin",
        email: email,
        password: "SuperPassword123!", // Temporary password
        role: "SUPER_ADMIN",
        phoneNumber: "0000000000",
      });

      await superAdmin.save();
      console.log("Super admin created successfully.");
      console.log(`Email: ${email}`);
      console.log(`Password: SuperPassword123!`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
};

createSuperAdmin();
