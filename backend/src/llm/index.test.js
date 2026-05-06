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
// parseBookingRequest — system prompt scheduling instructions (FR-LLM-1..4)
// ---------------------------------------------------------------------------

describe('parseBookingRequest — system prompt scheduling content', () => {
  const baseContextSnapshot = {
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

  const conversationHistory = [{ role: 'user', content: 'Book nevada on May 10' }];

  it('system prompt contains bookings_for_day section with booking data (no description)', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({
        assistantMessage: 'Got it!',
        parsedFields: {},
        status: 'needs-clarification',
      })
    );

    const contextWithBooking = {
      ...baseContextSnapshot,
      bookings_for_day: [
        {
          id: 'abc',
          room_id: 'nevada',
          start_utc: '2026-05-10T09:00:00Z',
          end_utc: '2026-05-10T10:00:00Z',
          booker_name: 'Alice',
        },
      ],
    };

    await parseBookingRequest({ conversationHistory, contextSnapshot: contextWithBooking });

    const callArg = callAnthropic.mock.calls[0][0];
    const systemPrompt = callArg.system;

    // The booker name "Alice" must appear in the system prompt (injected from bookings_for_day).
    // "nevada" already appears in AVAILABLE ROOMS, so "Alice" is the discriminating signal.
    expect(systemPrompt).toContain('Alice');

    // Privacy: the raw word "description" must NOT appear anywhere in the
    // injected bookings block. We locate the section by finding "Alice" and check
    // the surrounding 500 chars.
    const aliceIndex = systemPrompt.indexOf('Alice');
    const bookingsWindow = systemPrompt.slice(Math.max(0, aliceIndex - 200), aliceIndex + 300);
    expect(bookingsWindow.toLowerCase()).not.toContain('description');
  });

  it('system prompt contains room recommendation rules with mismatch guidance', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({
        assistantMessage: 'Got it!',
        parsedFields: {},
        status: 'needs-clarification',
      })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot: baseContextSnapshot });

    const callArg = callAnthropic.mock.calls[0][0];
    const systemPrompt = callArg.system.toLowerCase();

    // FR-LLM-2: must contain explicit mismatch instruction.
    // "equipment" alone is insufficient — it already appears from the room listing.
    // We require "mismatch" or "doesn't have" / "does not have" / "book it anyway".
    const hasMismatchInstruction =
      systemPrompt.includes('mismatch') ||
      systemPrompt.includes("doesn't have") ||
      systemPrompt.includes('book it anyway') ||
      systemPrompt.includes('does not have');
    expect(hasMismatchInstruction).toBe(true);
  });

  it('system prompt contains conflict response format (booker, time-until-free, alternatives)', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({
        assistantMessage: 'Got it!',
        parsedFields: {},
        status: 'needs-clarification',
      })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot: baseContextSnapshot });

    const callArg = callAnthropic.mock.calls[0][0];
    const systemPrompt = callArg.system.toLowerCase();

    // FR-LLM-4: must include "until" (time-until-free) AND alternatives / pick one
    expect(systemPrompt.includes('until')).toBe(true);
    const hasAlternatives =
      systemPrompt.includes('alternative') ||
      systemPrompt.includes('nearby') ||
      systemPrompt.includes('pick one');
    expect(hasAlternatives).toBe(true);
  });

  it('system prompt instructs booker name verbatim', async () => {
    callAnthropic.mockResolvedValue(
      JSON.stringify({
        assistantMessage: 'Got it!',
        parsedFields: {},
        status: 'needs-clarification',
      })
    );

    await parseBookingRequest({ conversationHistory, contextSnapshot: baseContextSnapshot });

    const callArg = callAnthropic.mock.calls[0][0];
    const systemPrompt = callArg.system.toLowerCase();

    // FR-LLM-3: must use "verbatim" or "exactly as provided".
    // "booker_name" alone is NOT sufficient — it already appears in the JSON shape definition.
    const hasVerbatimInstruction =
      systemPrompt.includes('verbatim') || systemPrompt.includes('exactly as provided');
    expect(hasVerbatimInstruction).toBe(true);
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

  it('generateWittyResponse for too-short calls adapter with correct prompt and maxTokens=100', async () => {
    callAnthropic.mockResolvedValue('Ten minutes? Barely enough time to find the room.');

    const result = await generateWittyResponse({
      scenario: 'too-short',
      context: { duration_minutes: 5 },
    });

    expect(callAnthropic).toHaveBeenCalledOnce();
    const callArg = callAnthropic.mock.calls[0][0];

    // System prompt or messages content must reference too-short / short / 10 minute
    const allText = JSON.stringify(callArg).toLowerCase();
    const hasShortRef =
      allText.includes('short') || allText.includes('10 minute') || allText.includes('too-short');
    expect(hasShortRef).toBe(true);

    // maxTokens must be 100
    expect(callArg.maxTokens).toBe(100);

    // Returns object with a text string field
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('generateWittyResponse for too-far calls adapter with correct prompt and maxTokens=100', async () => {
    callAnthropic.mockResolvedValue('Booking 94 days out? Bold move. We only look 90 days ahead.');

    const result = await generateWittyResponse({
      scenario: 'too-far',
      context: { days_out: 94 },
    });

    expect(callAnthropic).toHaveBeenCalledOnce();
    const callArg = callAnthropic.mock.calls[0][0];

    // System prompt or messages content must reference too-far / 90 day / future
    const allText = JSON.stringify(callArg).toLowerCase();
    const hasFarRef =
      allText.includes('90 day') || allText.includes('future') || allText.includes('too-far');
    expect(hasFarRef).toBe(true);

    // maxTokens must be 100
    expect(callArg.maxTokens).toBe(100);

    // Returns object with a text string field
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });
});
