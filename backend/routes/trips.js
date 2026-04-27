import express from 'express';
import { deleteTrip, getTrip, listTrips } from '../controllers/tripController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', listTrips);
router.get('/:id', getTrip);
router.delete('/:id', deleteTrip);

export default router;
