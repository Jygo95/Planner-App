import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/index.js';
import {
  roundToFiveMin,
  validateDuration,
  validatePast,
  validateFutureLimit,
} from '../lib/bookingRules.js';
import { checkConflict } from '../lib/conflictCheck.js';
import { appendLog } from '../lib/bookingLog.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/bookings
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  const { room_id, booker_name, description } = req.body;
  let { start_utc, end_utc } = req.body;

  // Basic required-field check
  if (!room_id || !start_utc || !end_utc || !booker_name) {
    return res.status(400).json({ error: 'missing_fields' });
  }

  const trimmedName = String(booker_name).trim();
  if (!trimmedName) {
    return res.status(400).json({ error: 'invalid_booker_name' });
  }

  // FR-RULE-4: round to nearest 5-min
  let timeAdjusted = false;
  const roundedStart = roundToFiveMin(start_utc);
  const roundedEnd = roundToFiveMin(end_utc);
  if (roundedStart !== start_utc || roundedEnd !== end_utc) {
    timeAdjusted = true;
  }
  start_utc = roundedStart;
  end_utc = roundedEnd;

  const nowUtc = new Date().toISOString();

  // FR-RULE-3: reject if start in past
  const pastError = validatePast(start_utc, nowUtc);
  if (pastError) {
    return res.status(400).json(pastError);
  }

  // FR-RULE-5: reject if > 90 days out
  const futureError = validateFutureLimit(start_utc, nowUtc);
  if (futureError) {
    return res.status(400).json(futureError);
  }

  // FR-RULE-2 / FR-RULE-1: duration checks
  const durationError = validateDuration(start_utc, end_utc);
  if (durationError) {
    return res.status(400).json(durationError);
  }

  const id = uuidv4();
  const created_at_utc = new Date().toISOString();

  // C-4: conflict check + insert inside same transaction
  const insertTx = db.transaction(() => {
    const conflict = checkConflict(db, room_id, start_utc, end_utc, '');
    if (conflict) {
      return { conflict };
    }

    db.prepare(
      `INSERT INTO bookings (id, room_id, start_utc, end_utc, booker_name, description, created_at_utc)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, room_id, start_utc, end_utc, trimmedName, description ?? null, created_at_utc);

    return { conflict: null };
  });

  const { conflict } = insertTx();

  if (conflict) {
    return res.status(409).json({ error: 'conflict', conflicting: conflict });
  }

  const booking = {
    id,
    room_id,
    start_utc,
    end_utc,
    booker_name: trimmedName,
    description: description ?? null,
    created_at_utc,
  };

  appendLog(db, 'create', booking);

  const responseBody = { ...booking };
  if (timeAdjusted) {
    responseBody.timeAdjusted = true;
  }

  return res.status(201).json(responseBody);
});

// ---------------------------------------------------------------------------
// GET /api/bookings
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  const { room_id, date, from, to } = req.query;

  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];

  if (room_id) {
    sql += ' AND room_id = ?';
    params.push(room_id);
  }

  if (date) {
    // Filter by calendar date (UTC)
    sql += ' AND start_utc >= ? AND start_utc < ?';
    params.push(`${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`);
  }

  if (from && to) {
    // Overlap: existing.start_utc < to AND existing.end_utc > from
    sql += ' AND start_utc < ? AND end_utc > ?';
    params.push(to, from);
  }

  sql += ' ORDER BY start_utc ASC';

  const rows = db.prepare(sql).all(...params);
  return res.status(200).json(rows);
});

// ---------------------------------------------------------------------------
// PATCH /api/bookings/:id
// ---------------------------------------------------------------------------
router.patch('/:id', (req, res) => {
  const { id } = req.params;

  // Fetch existing booking
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'not_found' });
  }

  // Merge patch fields
  let { room_id, start_utc, end_utc, booker_name, description } = req.body;
  const merged = {
    room_id: room_id ?? existing.room_id,
    start_utc: start_utc ?? existing.start_utc,
    end_utc: end_utc ?? existing.end_utc,
    booker_name: booker_name != null ? String(booker_name).trim() : existing.booker_name,
    description: description !== undefined ? description : existing.description,
  };

  // FR-RULE-4: round to nearest 5-min
  merged.start_utc = roundToFiveMin(merged.start_utc);
  merged.end_utc = roundToFiveMin(merged.end_utc);

  const nowUtc = new Date().toISOString();

  // FR-RULE-3
  const pastError = validatePast(merged.start_utc, nowUtc);
  if (pastError) {
    return res.status(400).json(pastError);
  }

  // FR-RULE-5
  const futureError = validateFutureLimit(merged.start_utc, nowUtc);
  if (futureError) {
    return res.status(400).json(futureError);
  }

  // FR-RULE-2 / FR-RULE-1
  const durationError = validateDuration(merged.start_utc, merged.end_utc);
  if (durationError) {
    return res.status(400).json(durationError);
  }

  // C-4: conflict check + update in transaction (exclude self)
  const updateTx = db.transaction(() => {
    const conflict = checkConflict(db, merged.room_id, merged.start_utc, merged.end_utc, id);
    if (conflict) {
      return { conflict };
    }

    db.prepare(
      `UPDATE bookings SET room_id = ?, start_utc = ?, end_utc = ?, booker_name = ?, description = ?
       WHERE id = ?`
    ).run(
      merged.room_id,
      merged.start_utc,
      merged.end_utc,
      merged.booker_name,
      merged.description,
      id
    );

    return { conflict: null };
  });

  const { conflict } = updateTx();

  if (conflict) {
    return res.status(409).json({ error: 'conflict', conflicting: conflict });
  }

  const updated = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  appendLog(db, 'edit', updated);

  return res.status(200).json(updated);
});

// ---------------------------------------------------------------------------
// DELETE /api/bookings/:id
// ---------------------------------------------------------------------------
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // FR-LOG-3: capture snapshot BEFORE deletion
  const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'not_found' });
  }

  // Log cancel with snapshot before delete
  appendLog(db, 'cancel', existing);

  db.prepare('DELETE FROM bookings WHERE id = ?').run(id);

  return res.status(204).send();
});

export default router;
