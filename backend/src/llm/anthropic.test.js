/**
 * Unit tests for backend/src/llm/anthropic.js
 *
 * Verifies that the Anthropic SDK is called correctly without making real
 * network requests (vi.mock replaces the SDK entirely).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the entire @anthropic-ai/sdk module before any imports resolve it
vi.mock('@anthropic-ai/sdk');

import Anthropic from '@anthropic-ai/sdk';

let callAnthropic;

beforeEach(async () => {
  vi.resetAllMocks();

  // Set up the mock: Anthropic is a constructor whose instances have messages.create.
  // Must use a regular function (not arrow) so `new Anthropic()` works correctly.
  const mockCreate = vi.fn();
  Anthropic.mockImplementation(function () {
    return { messages: { create: mockCreate } };
  });

  const mod = await import('../llm/anthropic.js');
  callAnthropic = mod.callAnthropic;
});

describe('callAnthropic', () => {
  it('creates an Anthropic client (the SDK constructor is called)', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Hello!' }],
    });
    Anthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    });

    await callAnthropic({
      messages: [{ role: 'user', content: 'Hello' }],
      system: 'You are a helpful assistant.',
      maxTokens: 200,
    });

    expect(Anthropic).toHaveBeenCalledOnce();
  });

  it('calls messages.create with model: "claude-haiku-4-5-20251001"', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Response text' }],
    });
    Anthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    });

    await callAnthropic({
      messages: [{ role: 'user', content: 'Book a room' }],
      system: 'System prompt here.',
      maxTokens: 200,
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.model).toBe('claude-haiku-4-5-20251001');
  });

  it('passes max_tokens equal to the maxTokens argument', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Response text' }],
    });
    Anthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    });

    await callAnthropic({
      messages: [{ role: 'user', content: 'Book a room' }],
      system: 'System prompt here.',
      maxTokens: 150,
    });

    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.max_tokens).toBe(150);
  });

  it('returns the assistant response text from the SDK response', async () => {
    const expectedText = 'I can help you book california for tomorrow at 2pm.';
    const mockCreate = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: expectedText }],
    });
    Anthropic.mockImplementation(function () {
      return { messages: { create: mockCreate } };
    });

    const result = await callAnthropic({
      messages: [{ role: 'user', content: 'Book california tomorrow' }],
      system: 'You are a booking assistant.',
      maxTokens: 200,
    });

    expect(result).toBe(expectedText);
  });
});
