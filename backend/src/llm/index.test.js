/**
 * Unit tests for backend/src/llm/index.js
 *
 * Tests parseBookingRequest and generateWittyResponse, mocking the
 * anthropic adapter so no real API calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the anthropic adapter BEFORE importing the module under test
vi.mock('../llm/anthropic.js', () => ({ callAnthropic: vi.fn() }));

import { callAnthropic } from '../llm/anthropic.js';

// Dynamic import so the mock is in place first
let parseBookingRequest;
let generateWittyResponse;

beforeEach(async () => {
  vi.resetAllMocks();
  const mod = await import('../llm/index.js');
  parseBookingRequest = mod.parseBookingRequest;
  generateWittyResponse = mod.generateWittyResponse;
});

// ---------------------------------------------------------------------------
// parseBookingRequest
// ---------------------------------------------------------------------------

describe('parseBookingRequest', () => {
  const contextSnapshot = {
    nowRiga: '2026-04-26T14:00:00+03:00',
    rooms: [
      {
        id: 'california',
        name: 'California',
        floor: 1,
        capacity: 5,
        equipment: ['camera', 'tv'],
        notes: 'First room',
      },
      {
        id: 'nevada',
        name: 'Nevada',
        floor: 2,
        capacity: 8,
        equipment: ['tv', 'whiteboard', 'conference-phone'],
        notes: 'Largest room, best for client calls',
      },
      {
        id: 'oregon',
        name: 'Oregon',
        floor: 1,
        capacity: 3,
        equipment: ['whiteboard'],
        notes: 'Quiet room, no AV',
      },
    ],
    bookings_for_day: [],
  };

  const conversationHistory = [
    { role: 'user', content: 'Book california tomorrow 2pm for 1 hour' },
  ];

  it('calls the anthropic adapter (callAnthropic) with a messages array and system field', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({ assistantMessage: 'Got it!', parsedFields: {}, status: 'ready-to-confirm' })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot });

    expect(callAnthropic).toHaveBeenCalledOnce();
    const callArg = callAnthropic.mock.calls[0][0];
    expect(Array.isArray(callArg.messages)).toBe(true);
    expect(typeof callArg.system).toBe('string');
  });

  it('system field contains the word "california" (room id present in prompt)', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({ assistantMessage: 'Got it!', parsedFields: {}, status: 'ready-to-confirm' })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot });

    const callArg = callAnthropic.mock.calls[0][0];
    expect(callArg.system.toLowerCase()).toContain('california');
  });

  it('system field contains the nowRiga datetime reference', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({ assistantMessage: 'Got it!', parsedFields: {}, status: 'ready-to-confirm' })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot });

    const callArg = callAnthropic.mock.calls[0][0];
    // The system prompt must include either the literal nowRiga value or the key name
    const hasDatetimeRef =
      callArg.system.includes(contextSnapshot.nowRiga) ||
      callArg.system.toLowerCase().includes('nowriga') ||
      callArg.system.includes('2026-04-26');
    expect(hasDatetimeRef).toBe(true);
  });

  it('returns { assistantMessage, parsedFields, status } shape', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({
        assistantMessage: 'Booking confirmed for california tomorrow at 2pm.',
        parsedFields: {
          room_id: 'california',
          start_utc: '2026-04-27T11:00:00.000Z',
          end_utc: '2026-04-27T12:00:00.000Z',
          booker_name: null,
        },
        status: 'ready-to-confirm',
      })
    );

    const result = await parseBookingRequest({ conversationHistory, contextSnapshot });

    expect(typeof result.assistantMessage).toBe('string');
    expect(typeof result.parsedFields).toBe('object');
    expect(['needs-clarification', 'ready-to-confirm', 'parse-failure']).toContain(result.status);
  });
});

// ---------------------------------------------------------------------------
// generateWittyResponse
// ---------------------------------------------------------------------------

describe('generateWittyResponse', () => {
  it('scenario "too-short": calls the adapter and returns { text: string }', async () => {
    callAnthropic.mockResolvedValue('Nice try, speedy! Even espresso takes longer than that.');

    const result = await generateWittyResponse({ scenario: 'too-short', context: {} });

    expect(callAnthropic).toHaveBeenCalledOnce();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('scenario "too-far": calls the adapter and returns { text: string }', async () => {
    callAnthropic.mockResolvedValue(
      "That's so far in the future even the room doesn't know its schedule."
    );

    const result = await generateWittyResponse({ scenario: 'too-far', context: {} });

    expect(callAnthropic).toHaveBeenCalledOnce();
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });
});
