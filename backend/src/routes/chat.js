/**
 * POST /api/chat — LLM booking assistant endpoint
 */

import { Router } from 'express';
import { parseBookingRequest, generateWittyResponse } from '../../llm/index.js';
import { ROOMS } from '../config/rooms.js';
import db from '../db/index.js';
import { getRemainingCalls, decrementCap } from '../lib/dailyCap.js';

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

/**
 * Extract the first start_utc found from assistant parsedFields in the messages array.
 * @param {Array} messages
 * @returns {string|null}
 */
function extractStartUtcFromHistory(messages) {
  for (const msg of messages) {
    if (msg.role !== 'assistant') continue;

    // parsedFields may be a top-level property on the message object
    if (msg.parsedFields && msg.parsedFields.start_utc) {
      return msg.parsedFields.start_utc;
    }

    // Or embedded in stringified JSON content
    if (typeof msg.content === 'string') {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.parsedFields && parsed.parsedFields.start_utc) {
          return parsed.parsedFields.start_utc;
        }
      } catch {
        // not JSON — skip
      }
    } else if (msg.content && typeof msg.content === 'object') {
      if (msg.content.parsedFields && msg.content.parsedFields.start_utc) {
        return msg.content.parsedFields.start_utc;
      }
    }
  }
  return null;
}

/**
 * Query bookings for the calendar day containing start_utc.
 * description is deliberately excluded for privacy.
 * @param {string} startUtc — ISO 8601 UTC string
 * @returns {Array}
 */
function queryBookingsForDay(startUtc) {
  const date = new Date(startUtc);
  // Start of day UTC
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  ).toISOString();
  // End of day UTC (start of next day)
  const endOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  ).toISOString();

  return db
    .prepare(
      'SELECT id, room_id, start_utc, end_utc, booker_name FROM bookings WHERE start_utc >= ? AND start_utc < ?'
    )
    .all(startOfDay, endOfDay);
}

router.post('/', async (req, res) => {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  const remaining = getRemainingCalls(db);
  if (remaining <= 0) {
    return res.status(429).json({ error: 'daily_cap_reached' });
  }
  decrementCap(db);

  const startUtc = extractStartUtcFromHistory(messages);
  const bookings_for_day = startUtc ? queryBookingsForDay(startUtc) : [];

  const contextSnapshot = {
    nowRiga: currentRigaTime(),
    rooms: ROOMS,
    bookings_for_day,
  };

  try {
    const result = await parseBookingRequest({ conversationHistory: messages, contextSnapshot });

    if (
      result.status === 'parse-failure' &&
      (result.error === 'too-short' || result.error === 'too-far')
    ) {
      const scenario = result.error;
      const context =
        scenario === 'too-short'
          ? { duration_minutes: result.duration_minutes ?? 0 }
          : { days_out: result.days_out ?? 0 };
      try {
        const witty = await generateWittyResponse({ scenario, context });
        return res.status(200).json({ ...result, assistantMessage: witty.text });
      } catch {
        // fallback: return result as-is
      }
    }

    return res.status(200).json(result);
  } catch {
    return res.status(503).json({ error: 'llm_unavailable' });
  }
});

export default router;
