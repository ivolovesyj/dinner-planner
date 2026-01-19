// Room Routes
import { Router } from 'express';
import * as roomController from '../controllers/roomController.js';

const router = Router();

// POST /api/rooms - Create new room
router.post('/', roomController.create);

// GET /api/rooms/:roomId - Get room data
router.get('/:roomId', roomController.get);

export default router;
