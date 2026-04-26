/**
 * Pure booking rule functions — no DB, no side effects.
 */

/**
 * Round an ISO UTC string to the nearest 5-minute boundary.
 * @param {string} isoString
 * @returns {string} ISO UTC string rounded to nearest 5 min
 */
export function roundToFiveMin(isoString) {
  const d = new Date(isoString);
  const ms = d.getTime();
  const fiveMin = 5 * 60 * 1000;
  const rounded = Math.round(ms / fiveMin) * fiveMin;
  return new Date(rounded).toISOString();
}

/**
 * Validate that the booking duration is between 10 minutes and 4 hours (inclusive).
 * @param {string} startUtc ISO UTC string
 * @param {string} endUtc ISO UTC string
 * @returns {null | { error: string, message?: string }}
 */
export function validateDuration(startUtc, endUtc) {
  const diffMs = new Date(endUtc).getTime() - new Date(startUtc).getTime();
  const TEN_MIN = 10 * 60 * 1000;
  const FOUR_HOURS = 4 * 60 * 60 * 1000;

  if (diffMs < TEN_MIN) {
    return { error: 'too-short' };
  }
  if (diffMs > FOUR_HOURS) {
    return { error: 'too-long', message: 'Bookings over 4 hours are not allowed.' };
  }
  return null;
}

/**
 * Validate that the booking start is not in the past.
 * start == now is allowed (returns null).
 * @param {string} startUtc ISO UTC string
 * @param {string} nowUtc ISO UTC string
 * @returns {null | { error: string }}
 */
export function validatePast(startUtc, nowUtc) {
  if (new Date(startUtc).getTime() < new Date(nowUtc).getTime()) {
    return { error: 'start_in_past' };
  }
  return null;
}

/**
 * Validate that the booking start is not more than 90 days from now.
 * Exactly 90 days is allowed (returns null).
 * @param {string} startUtc ISO UTC string
 * @param {string} nowUtc ISO UTC string
 * @returns {null | { error: string }}
 */
export function validateFutureLimit(startUtc, nowUtc) {
  const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
  const diff = new Date(startUtc).getTime() - new Date(nowUtc).getTime();
  if (diff > NINETY_DAYS) {
    return { error: 'too-far' };
  }
  return null;
}
