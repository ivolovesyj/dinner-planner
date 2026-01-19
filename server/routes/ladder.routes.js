// Ladder Routes
import { Router } from 'express';
import * as ladderController from '../controllers/ladderController.js';

const router = Router();

// POST /api/rooms/:roomId/ladder/trigger - Trigger ladder game
router.post('/:roomId/ladder/trigger', ladderController.trigger);

// PATCH /api/rooms/:roomId/ladder/complete - Complete ladder game
router.patch('/:roomId/ladder/complete', ladderController.complete);

// DELETE /api/rooms/:roomId/ladder - Reset ladder game
router.delete('/:roomId/ladder', ladderController.reset);

export default router;
