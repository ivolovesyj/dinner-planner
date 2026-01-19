// Server Entry Point
// Dinner Planner API - Layered Architecture
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/database.js';

const PORT = process.env.PORT || 8080;

// Connect to MongoDB and start server
connectDB()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🍽️ Dinner Planner API running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });
