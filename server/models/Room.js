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
    latitude: Number,  // 위도
    longitude: Number, // 경도
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
}, { _id: false });

const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
    lastAccessedAt: { type: Date, default: Date.now },
    participants: [{
        userId: String,
        nickname: String,
        lastActive: Date
    }],
    adminMemo: { type: String, default: "" },
    restaurants: [restaurantSchema],
    ladderGame: {
        candidateIds: [String],
        startCol: Number,
        bridges: [{
            colFrom: Number,
            colTo: Number,
            y: Number
        }],
        triggeredBy: String,
        status: { type: String, default: 'playing' }, // playing | completed
        createdAt: Date
    }
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
