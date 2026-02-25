// Admin Routes
import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/admin/login - Login
router.post('/login', adminController.login);
router.post('/signup', adminController.signup);

// Protected routes (require JWT)
router.get('/me', authMiddleware, adminController.me);
router.get('/campaigns', authMiddleware, adminController.getCampaigns);
router.post('/campaigns', authMiddleware, adminController.createCampaign);
router.post('/campaigns/parse-link', authMiddleware, adminController.parseCampaignLink);
router.put('/campaigns/:campaignId', authMiddleware, adminController.updateCampaign);
router.patch('/campaigns/:campaignId/submit', authMiddleware, adminController.submitCampaign);
router.patch('/campaigns/:campaignId/review', authMiddleware, adminController.reviewCampaign);
router.patch('/campaigns/:campaignId/status', authMiddleware, adminController.updateCampaignStatus);
router.post('/points/charge', authMiddleware, adminController.chargePoints);
router.get('/feedbacks', authMiddleware, adminController.getFeedbacks);
router.get('/rooms', authMiddleware, adminController.getRooms);
router.put('/rooms/:roomId/memo', authMiddleware, adminController.updateMemo);
router.delete('/rooms/:roomId', authMiddleware, adminController.deleteRoom);

export default router;
