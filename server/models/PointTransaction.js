import mongoose from 'mongoose';

const PointTransactionSchema = new mongoose.Schema({
    advertiserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser', required: true },
    advertiserUsername: { type: String, required: true },
    type: {
        type: String,
        enum: ['charge', 'refund', 'impression_charge', 'click_charge', 'manual_adjustment'],
        required: true
    },
    amount: { type: Number, required: true }, // positive for charge/refund, negative for spend
    balanceAfter: { type: Number, required: true },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign', default: null },
    memo: { type: String, default: '' },
    paymentProvider: { type: String, enum: ['tosspayments', 'manual', 'none'], default: 'none' },
    paymentStatus: { type: String, default: '' }, // reserved for Toss integration
    paymentKey: { type: String, default: '' }, // reserved for Toss integration
    orderId: { type: String, default: '' }, // reserved for Toss integration
    createdAt: { type: Date, default: Date.now }
});

PointTransactionSchema.index({ advertiserId: 1, createdAt: -1 });

export default mongoose.model('PointTransaction', PointTransactionSchema);
