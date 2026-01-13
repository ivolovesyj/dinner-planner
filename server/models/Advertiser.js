import mongoose from 'mongoose';

const AdvertiserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In prod, hash with bcrypt!
    companyName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'advertiser'], default: 'advertiser' },
    createdAt: { type: Date, default: Date.now }
});

const Advertiser = mongoose.model('Advertiser', AdvertiserSchema);
export default Advertiser;
