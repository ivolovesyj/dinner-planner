// Restaurant Routes
import { Router } from 'express';
import * as restaurantController from '../controllers/restaurantController.js';

const router = Router();

// POST /api/rooms/:roomId/restaurants - Add restaurant
router.post('/:roomId/restaurants', restaurantController.add);

// DELETE /api/rooms/:roomId/restaurants/:restaurantId - Delete restaurant
router.delete('/:roomId/restaurants/:restaurantId', restaurantController.remove);

// POST /api/rooms/:roomId/vote - Vote for restaurant
router.post('/:roomId/vote', restaurantController.vote);

// POST /api/parse - Legacy parse endpoint
router.post('/parse', restaurantController.parse);

export default router;
