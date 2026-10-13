import User from '../models/User.js';
import dotenv from 'dotenv';
dotenv.config();

export const createAdminIfNotExists = async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskio.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
        console.log('Admin user already exists');
        return;
    }

    const adminUser = new User({
        name: 'Admin',
        first_name:"admin",
        last_name:"admin",
        email: adminEmail,
        password: adminPassword,
        phone: '0000000000',
        role: 'admin',
        status: 'verified',
    });

    await adminUser.save();
    
    console.log('Admin user created');
};