import mongoose from 'mongoose';

const AdCampaignSchema = new mongoose.Schema({
    // Basic Ad Content
    title: { type: String, required: true },       // Restaurant Name
    description: { type: String, required: true }, // Ad Copy (e.g. "Free Drink Coupon")
    imageUrl: { type: String, required: true },    // Thumbnail URL
    linkUrl: { type: String, required: true },     // Destination URL
    sponsorName: { type: String, required: true }, // "Burger King"

    // Ownership
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser' },

    // Targeting
    targetStations: [String], // e.g., ["강남", "홍대", "신림"] - Station names (normalized)
    radius: { type: Number, default: 1000 },      // in meters (future use)

    // Stats & Control
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },       // Higher shows first
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now }
});

// Index for targeting search
AdCampaignSchema.index({ targetStations: 1 });

export default mongoose.model('AdCampaign', AdCampaignSchema);
