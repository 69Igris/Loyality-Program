import express from 'express';
import {
  createProgram,
  deleteProgram,
  listPrograms,
  programCreateSchema,
  programUpdateSchema,
  updateProgram,
} from '../controllers/loyaltyController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', listPrograms);
router.post('/', validateBody(programCreateSchema), createProgram);
router.patch('/:id', validateBody(programUpdateSchema), updateProgram);
router.delete('/:id', deleteProgram);

export default router;
