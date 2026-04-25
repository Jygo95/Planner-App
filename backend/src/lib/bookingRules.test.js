import { describe, it, expect } from 'vitest';
import {
  roundToFiveMin,
  validateDuration,
  validatePast,
  validateFutureLimit,
} from './bookingRules.js';

// ---------------------------------------------------------------------------
// roundToFiveMin
// ---------------------------------------------------------------------------
describe('roundToFiveMin', () => {
  it('rounds 14:03 up to 14:05', () => {
    const input = '2026-04-25T14:03:00.000Z';
    const result = roundToFiveMin(input);
    expect(result).toBe('2026-04-25T14:05:00.000Z');
  });

  it('rounds 14:07 down to 14:05', () => {
    const input = '2026-04-25T14:07:00.000Z';
    const result = roundToFiveMin(input);
    expect(result).toBe('2026-04-25T14:05:00.000Z');
  });

  it('leaves 14:00 unchanged (already on boundary)', () => {
    const input = '2026-04-25T14:00:00.000Z';
    const result = roundToFiveMin(input);
    expect(result).toBe('2026-04-25T14:00:00.000Z');
  });

  it('leaves 14:05 unchanged (already on boundary)', () => {
    const input = '2026-04-25T14:05:00.000Z';
    const result = roundToFiveMin(input);
    expect(result).toBe('2026-04-25T14:05:00.000Z');
  });

  it('rounds 14:02 down to 14:00', () => {
    const input = '2026-04-25T14:02:00.000Z';
    const result = roundToFiveMin(input);
    expect(result).toBe('2026-04-25T14:00:00.000Z');
  });

  it('returns an ISO string', () => {
    const input = '2026-04-25T14:03:00.000Z';
    const result = roundToFiveMin(input);
    expect(typeof result).toBe('string');
    // should parse as a valid date
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateDuration
// ---------------------------------------------------------------------------
describe('validateDuration', () => {
  it('returns null for exactly 10-minute duration (minimum valid)', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T14:10:00.000Z';
    expect(validateDuration(start, end)).toBeNull();
  });

  it('returns null for exactly 4-hour duration (maximum valid)', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T18:00:00.000Z';
    expect(validateDuration(start, end)).toBeNull();
  });

  it('returns null for a duration between 10 min and 4 hours', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T15:30:00.000Z';
    expect(validateDuration(start, end)).toBeNull();
  });

  it('returns { error: "too-short" } for duration < 10 min', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T14:09:00.000Z'; // 9 minutes
    const result = validateDuration(start, end);
    expect(result).not.toBeNull();
    expect(result.error).toBe('too-short');
  });

  it('returns { error: "too-short" } for zero-length duration', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T14:00:00.000Z';
    const result = validateDuration(start, end);
    expect(result).not.toBeNull();
    expect(result.error).toBe('too-short');
  });

  it('returns { error: "too-long", message } for duration > 4 hours', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T18:01:00.000Z'; // 4h 1min
    const result = validateDuration(start, end);
    expect(result).not.toBeNull();
    expect(result.error).toBe('too-long');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('too-long message mentions "not allowed"', () => {
    const start = '2026-04-25T14:00:00.000Z';
    const end = '2026-04-25T19:00:00.000Z'; // 5 hours
    const result = validateDuration(start, end);
    expect(result.message.toLowerCase()).toContain('not allowed');
  });
});

// ---------------------------------------------------------------------------
// validatePast
// ---------------------------------------------------------------------------
describe('validatePast', () => {
  it('returns null when start equals now', () => {
    const now = '2026-04-25T14:00:00.000Z';
    expect(validatePast(now, now)).toBeNull();
  });

  it('returns null when start is in the future', () => {
    const now = '2026-04-25T14:00:00.000Z';
    const start = '2026-04-25T15:00:00.000Z';
    expect(validatePast(start, now)).toBeNull();
  });

  it('returns { error: "start_in_past" } when start < now', () => {
    const now = '2026-04-25T14:00:00.000Z';
    const start = '2026-04-25T13:59:59.000Z';
    const result = validatePast(start, now);
    expect(result).not.toBeNull();
    expect(result.error).toBe('start_in_past');
  });

  it('returns { error: "start_in_past" } when start is well in the past', () => {
    const now = '2026-04-25T14:00:00.000Z';
    const start = '2025-01-01T00:00:00.000Z';
    const result = validatePast(start, now);
    expect(result).not.toBeNull();
    expect(result.error).toBe('start_in_past');
  });
});

// ---------------------------------------------------------------------------
// validateFutureLimit
// ---------------------------------------------------------------------------
describe('validateFutureLimit', () => {
  it('returns null when start equals now', () => {
    const now = '2026-04-25T14:00:00.000Z';
    expect(validateFutureLimit(now, now)).toBeNull();
  });

  it('returns null when start is exactly 90 days from now', () => {
    const now = new Date('2026-04-25T14:00:00.000Z');
    const ninetyDaysLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    expect(validateFutureLimit(ninetyDaysLater.toISOString(), now.toISOString())).toBeNull();
  });

  it('returns null when start is within 90 days', () => {
    const now = '2026-04-25T14:00:00.000Z';
    const start = '2026-06-01T14:00:00.000Z'; // ~37 days ahead
    expect(validateFutureLimit(start, now)).toBeNull();
  });

  it('returns { error: "too-far" } when start > now + 90 days', () => {
    const now = new Date('2026-04-25T14:00:00.000Z');
    const tooFar = new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000);
    const result = validateFutureLimit(tooFar.toISOString(), now.toISOString());
    expect(result).not.toBeNull();
    expect(result.error).toBe('too-far');
  });

  it('returns { error: "too-far" } when start is a year from now', () => {
    const now = '2026-04-25T14:00:00.000Z';
    const start = '2027-04-25T14:00:00.000Z';
    const result = validateFutureLimit(start, now);
    expect(result).not.toBeNull();
    expect(result.error).toBe('too-far');
  });
});
