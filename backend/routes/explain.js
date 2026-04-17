import express from 'express';
import { explainLoyalty } from '../controllers/explainController.js';

const router = express.Router();

router.post('/explain', explainLoyalty);
router.post('/optimize', explainLoyalty);

export default router;
