import mongoose from 'mongoose';

const AdCampaignSchema = new mongoose.Schema({
    // Basic Ad Content
    title: { type: String, default: '' },       // Restaurant Name
    description: { type: String, default: '' }, // Ad Copy (e.g. "Free Drink Coupon")
    imageUrl: { type: String, default: '' },    // Thumbnail URL
    linkUrl: { type: String, default: '' },     // Destination URL
    sponsorName: { type: String, default: '' }, // "Burger King"

    // Ownership
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser' },
    ownerUsername: { type: String, default: '' },

    // Targeting
    targetStations: [String], // e.g., ["강남", "홍대", "신림"] - Station names (normalized)
    radius: { type: Number, default: 1000 },      // in meters (future use)
    source: {
        naverMapUrl: { type: String, default: '' },
        parsedRestaurant: {
            name: { type: String, default: '' },
            category: { type: String, default: '' },
            image: { type: String, default: '' },
            images: { type: [String], default: [] },
            location: { type: String, default: '' },
            station: { type: String, default: '' },
            menu: { type: String, default: '' },
            description: { type: String, default: '' }
        }
    },
    creative: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        menuPreview: { type: String, default: '' },
        linkUrl: { type: String, default: '' }
    },
    pricing: {
        baseStartFee: { type: Number, default: 10000 },
        impressionCost: { type: Number, default: 4 },
        clickCost: { type: Number, default: 250 }
    },
    budget: {
        totalPointsLimit: { type: Number, default: 10000 },
        spentPoints: { type: Number, default: 0 }
    },
    schedule: {
        startAt: { type: Date, default: null },
        endAt: { type: Date, default: null }
    },
    status: {
        type: String,
        enum: ['draft', 'submitted', 'approved', 'rejected', 'active', 'paused', 'completed'],
        default: 'draft'
    },
    review: {
        reviewedBy: { type: String, default: '' },
        reviewedAt: { type: Date, default: null },
        rejectionReason: { type: String, default: '' }
    },

    // Stats & Control
    active: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },       // Higher shows first
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    userVotes: {
        type: Map,
        of: String // 'up' or 'down'
    },

    createdAt: { type: Date, default: Date.now }
});

// Index for targeting search
AdCampaignSchema.index({ targetStations: 1 });
AdCampaignSchema.index({ ownerId: 1, createdAt: -1 });
AdCampaignSchema.index({ status: 1, active: 1 });

export default mongoose.model('AdCampaign', AdCampaignSchema);
