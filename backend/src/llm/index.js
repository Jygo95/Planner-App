/**
 * LLM public interface.
 * Exports: parseBookingRequest, generateWittyResponse
 */

import { callAnthropic } from './anthropic.js';
import { ROOMS } from '../config/rooms.js';

// Approximate token count: 1 token ≈ 4 chars
const MAX_HISTORY_CHARS = 2000; // ~500 tokens
const MAX_HISTORY_MESSAGES = 3;

/**
 * Build the system prompt for the booking parse call.
 * @param {object} contextSnapshot
 * @returns {string}
 */
function buildSystemPrompt(contextSnapshot) {
  const { nowRiga, rooms } = contextSnapshot;

  const roomsText = (rooms || ROOMS)
    .map(
      (r) =>
        `  - id: ${r.id}, name: ${r.name}, floor: ${r.floor}, capacity: ${r.capacity}, ` +
        `equipment: [${r.equipment.join(', ')}], notes: ${r.notes}`
    )
    .join('\n');

  return `You are a meeting-room booking assistant for an office in Riga, Latvia.

CURRENT TIME (Europe/Riga): ${nowRiga}

AVAILABLE ROOMS:
${roomsText}

OUTPUT FORMAT:
Respond with a single JSON object (no markdown, no code fences) in this exact shape:
{
  "assistantMessage": "<natural language reply to the user>",
  "parsedFields": {
    "room_id": "<room id or null>",
    "start_utc": "<ISO 8601 UTC or null>",
    "end_utc": "<ISO 8601 UTC or null>",
    "booker_name": "<name or null>",
    "description": "<purpose or null>",
    "timeAdjusted": <true if you rounded times, else false>
  },
  "status": "<needs-clarification|ready-to-confirm|parse-failure>"
}

BEHAVIOURAL RULES:
1. Reject bookings shorter than 10 minutes: set status to "parse-failure", note error "too-short" in assistantMessage.
2. Reject bookings longer than 4 hours: politely decline with a clear message.
3. Reject any start time in the past relative to current time.
4. Reject bookings more than 90 days out: set error "too-far" in assistantMessage.
5. Round times to the nearest 5-minute boundary; if adjusted, set timeAdjusted: true.
6. Ask clarifying questions for any missing required fields (room, start time, end time or duration).
7. On complete parse failure (cannot understand request): set status "parse-failure".
8. ROOM RECOMMENDATION: only suggest a room if the user has not specified one. Flag equipment mismatches. An explicit room choice by the user always wins.`;
}

/**
 * Truncate conversation history if it exceeds the token budget.
 * @param {Array} history
 * @returns {Array}
 */
function truncateHistory(history) {
  const totalChars = history.reduce((sum, m) => sum + (m.content || '').length, 0);
  if (totalChars > MAX_HISTORY_CHARS) {
    return history.slice(-MAX_HISTORY_MESSAGES);
  }
  return history;
}

/**
 * Parse a booking request from the conversation history.
 * @param {{ conversationHistory: Array, contextSnapshot: object }} opts
 * @returns {Promise<{ assistantMessage: string, parsedFields: object, status: string }>}
 */
export async function parseBookingRequest({ conversationHistory, contextSnapshot }) {
  const system = buildSystemPrompt(contextSnapshot);
  const messages = truncateHistory(conversationHistory);

  const responseText = await callAnthropic({ messages, system, maxTokens: 200 });

  try {
    const parsed = JSON.parse(responseText);
    return {
      assistantMessage: parsed.assistantMessage,
      parsedFields: parsed.parsedFields ?? {},
      status: parsed.status,
    };
  } catch {
    return {
      assistantMessage: responseText,
      parsedFields: {},
      status: 'parse-failure',
    };
  }
}

/**
 * Generate a witty response for edge-case scenarios.
 * @param {{ scenario: string, context: object }} opts
 * @returns {Promise<{ text: string }>}
 */
export async function generateWittyResponse({ scenario, context }) {
  const scenarioDescriptions = {
    'too-short': 'The user tried to book a meeting room for less than 10 minutes.',
    'too-far': 'The user tried to book a meeting room more than 90 days in the future.',
  };

  const description = scenarioDescriptions[scenario] || `Scenario: ${scenario}`;
  const contextStr =
    context && Object.keys(context).length > 0 ? ` Context: ${JSON.stringify(context)}` : '';

  const prompt = `${description}${contextStr} Write a short, witty, friendly one-liner response (max 2 sentences) explaining why this isn't possible.`;

  const responseText = await callAnthropic({
    messages: [{ role: 'user', content: prompt }],
    system: '',
    maxTokens: 100,
  });

  return { text: responseText };
}
