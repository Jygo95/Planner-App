/**
 * Anthropic adapter — the ONLY file that imports @anthropic-ai/sdk.
 * API key is read from process.env.ANTHROPIC_API_KEY and never logged or returned.
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * @param {{ messages: Array, system: string, maxTokens: number }} opts
 * @returns {Promise<string>} The text of the first content block
 */
export async function callAnthropic({ messages, system, maxTokens }) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Strip any custom fields (parsedFields, _raw, etc.) — Anthropic only accepts role + content.
  const cleanMessages = messages.map(({ role, content }) => ({
    role,
    content: typeof content === 'string' ? content : String(content),
  }));

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system,
    messages: cleanMessages,
  });

  return response.content[0].text;
}
