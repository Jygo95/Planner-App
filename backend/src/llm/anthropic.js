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
  // The @anthropic-ai/sdk CJS default export is a callable factory wrapper,
  // not a class — call it without `new` so vi.mock can replace it cleanly.
  const client = Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: maxTokens,
    system,
    messages,
  });

  return response.content[0].text;
}
