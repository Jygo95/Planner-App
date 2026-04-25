import { Router } from 'express';
import { ROOMS } from '../config/rooms.js';

const router = Router();

router.get('/api/rooms', (_req, res) => {
  res.json(ROOMS);
});

export default router;
