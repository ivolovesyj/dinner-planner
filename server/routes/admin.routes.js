// Admin Routes
import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/login - Login
router.post('/login', adminController.login);

// Protected routes (require JWT)
router.get('/campaigns', authMiddleware, adminController.getCampaigns);
router.get('/feedbacks', authMiddleware, adminController.getFeedbacks);
router.get('/rooms', authMiddleware, adminController.getRooms);
router.put('/rooms/:roomId/memo', authMiddleware, adminController.updateMemo);
router.delete('/rooms/:roomId', authMiddleware, adminController.deleteRoom);

export default router;
