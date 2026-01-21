// Routes Index - Combine all routes
import { Router } from 'express';
import roomRoutes from './room.routes.js';
import restaurantRoutes from './restaurant.routes.js';
import ladderRoutes from './ladder.routes.js';
import adminRoutes from './admin.routes.js';
import * as adminController from '../controllers/adminController.js';

const router = Router();

// Health check
router.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'dinner-planner-api' });
});

// Room routes
router.use('/api/rooms', roomRoutes);

// Restaurant routes (nested under rooms)
router.use('/api/rooms', restaurantRoutes);

// Ladder routes (nested under rooms)
router.use('/api/rooms', ladderRoutes);

// Legacy parse endpoint
router.post('/api/parse', (req, res, next) => {
    import('../controllers/restaurantController.js').then(controller => {
        controller.parse(req, res);
    }).catch(next);
});

// Admin routes
router.use('/api/admin', adminRoutes);

// Ad click tracking
router.post('/api/ads/:adId/click', adminController.trackAdClick);

// Feedback submission
router.post('/api/feedback', adminController.submitFeedback);

export default router;
