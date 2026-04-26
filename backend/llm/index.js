// Re-export from the source implementation.
// This file exists so that vi.mock('../../llm/index.js') in route tests
// (which resolves to backend/llm/index.js) intercepts the same module
// that routes/chat.js imports.
export { parseBookingRequest, generateWittyResponse } from '../src/llm/index.js';
