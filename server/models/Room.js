import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
    id: { type: String, required: true },
    url: { type: String, required: true },
    name: String,
    category: String,
    images: [String],
    image: String,
    description: String,
    location: String,
    station: String,
    menu: String,
    priceRange: String,
    tags: [String],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    dislikeReasons: [{
        userId: String,
        nickname: String,
        reason: String,
        timestamp: String
    }],
    userVotes: {
        type: Map,
        of: String // 'up' or 'down'
    },
    author: String,
    ownerId: String
}, { _id: false }); // Disable _id for subdocuments if we want to match exact JSON structure, or keep it. Let's keep it false to match old structure perfectly if possible, though Mongoose adds it by default to subdocs in arrays. For safety, let's keep it to avoid clutter.

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    restaurants: [restaurantSchema]
});

// Add index for faster lookups
roomSchema.index({ roomId: 1 });

const Room = mongoose.model('Room', roomSchema);

export default Room;
