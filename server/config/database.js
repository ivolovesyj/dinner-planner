// Database Configuration - MongoDB Connection
import mongoose from 'mongoose';
import Advertiser from '../models/Advertiser.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dinner_planner';

export const connectDB = async () => {
    console.log('Attempting to connect to MongoDB...');

    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log('✅ MongoDB Connected Successfully');

        // Seed Logic: Ensure Super Admin Exists
        try {
            const adminExists = await Advertiser.findOne({ username: 'admin' });
            if (!adminExists) {
                console.log('⚠️ No admin found. Creating default Super Admin...');
                await Advertiser.create({
                    username: 'admin',
                    password: process.env.ADMIN_PASSWORD || 'admin1234',
                    companyName: 'Platform Super Admin',
                    role: 'admin'
                });
                console.log('✅ Super Admin created: username=admin');
            }
        } catch (err) {
            console.error('Seed Admin Setup Failed:', err);
        }

    } catch (err) {
        console.error('❌ MongoDB Initial Connection Error:', err);
        throw err;
    }

    mongoose.connection.on('error', err => {
        console.error('❌ MongoDB Runtime Error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB Disconnected');
    });
};

export default { connectDB };
