import { Router } from 'express';

const router = Router();

router.get('/api/health', (_req, res) => {
  res.json({ ok: true, llmAvailable: !!process.env.ANTHROPIC_API_KEY, dailyCapRemaining: 500 });
});

export default router;
