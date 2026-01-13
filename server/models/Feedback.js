import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    contact: {
        type: String, // Optional email or phone
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Feedback', feedbackSchema);
