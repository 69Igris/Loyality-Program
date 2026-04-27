import express from 'express';
import {
  cardCreateSchema,
  cardUpdateSchema,
  createCard,
  deleteCard,
  listCards,
  updateCard,
} from '../controllers/cardController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', listCards);
router.post('/', validateBody(cardCreateSchema), createCard);
router.patch('/:id', validateBody(cardUpdateSchema), updateCard);
router.delete('/:id', deleteCard);

export default router;
