/**
 * POST /api/chat — LLM booking assistant endpoint
 */

import { Router } from 'express';
import { parseBookingRequest } from '../../llm/index.js';
import { ROOMS } from '../config/rooms.js';

const router = Router();

/**
 * Get the current time in Europe/Riga as an ISO string.
 * @returns {string}
 */
function currentRigaTime() {
  return (
    new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Riga' }).replace(' ', 'T') + '+03:00'
  );
}

router.post('/', async (req, res) => {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const contextSnapshot = {
    nowRiga: currentRigaTime(),
    rooms: ROOMS,
    bookings_for_day: [],
  };

  try {
    const result = await parseBookingRequest({ conversationHistory: messages, contextSnapshot });
    return res.status(200).json(result);
  } catch {
    return res.status(503).json({ error: 'llm_unavailable' });
  }
});

export default router;
