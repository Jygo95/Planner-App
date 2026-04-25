import { Router } from 'express';

const router = Router();

router.get('/api/health', (_req, res) => {
  res.json({ ok: true, llmAvailable: true, dailyCapRemaining: 500 });
});

export default router;
