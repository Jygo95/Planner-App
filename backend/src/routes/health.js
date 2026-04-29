import { Router } from 'express';
import db from '../db/index.js';
import { getRemainingCalls } from '../lib/dailyCap.js';

const router = Router();

router.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    llmAvailable: !!process.env.ANTHROPIC_API_KEY,
    dailyCapRemaining: getRemainingCalls(db),
  });
});

export default router;
