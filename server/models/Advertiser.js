import mongoose from 'mongoose';

const AdvertiserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // In prod, hash with bcrypt!
    companyName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'advertiser'], default: 'advertiser' },
    pointsBalance: { type: Number, default: 0 }, // KRW-based points (1 point = 1 KRW)
    pointsPending: { type: Number, default: 0 }, // reserved for pending payments (Toss integration-ready)
    billingProfile: {
        contactName: { type: String, default: '' },
        contactEmail: { type: String, default: '' },
        phone: { type: String, default: '' }
    },
    createdAt: { type: Date, default: Date.now }
});

const Advertiser = mongoose.model('Advertiser', AdvertiserSchema);
export default Advertiser;
