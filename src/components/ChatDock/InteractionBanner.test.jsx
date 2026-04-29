/**
 * Unit tests for src/components/ChatDock/InteractionBanner.jsx
 *
 * The component has not been created yet — these tests are intentionally RED.
 *
 * Spec (FR-CHAT-4):
 *   interactionCount 0–4  → renders nothing (null)
 *   interactionCount 5–9  → banner: "N interactions left, wrap it up, please."
 *                           where N = 10 - interactionCount
 *   interactionCount 10   → session-limit disabled message:
 *                           "You've reached the session limit. Please refresh the page or use the manual form."
 */

import { render, screen } from '@testing-library/react';
import InteractionBanner from './InteractionBanner.jsx';

// ---------------------------------------------------------------------------
// No banner below 5
// ---------------------------------------------------------------------------

describe('InteractionBanner — below threshold', () => {
  it('renders nothing when interactionCount is 0', () => {
    const { container } = render(<InteractionBanner interactionCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when interactionCount is 1', () => {
    const { container } = render(<InteractionBanner interactionCount={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when interactionCount is 4', () => {
    const { container } = render(<InteractionBanner interactionCount={4} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// "N interactions left" banner at counts 5–9
// ---------------------------------------------------------------------------

describe('InteractionBanner — warning banner (5–9)', () => {
  it('renders "5 interactions left, wrap it up, please." when interactionCount is 5', () => {
    render(<InteractionBanner interactionCount={5} />);
    expect(screen.getByText('5 interactions left, wrap it up, please.')).toBeInTheDocument();
  });

  it('renders "4 interactions left, wrap it up, please." when interactionCount is 6', () => {
    render(<InteractionBanner interactionCount={6} />);
    expect(screen.getByText('4 interactions left, wrap it up, please.')).toBeInTheDocument();
  });

  it('renders "3 interactions left, wrap it up, please." when interactionCount is 7', () => {
    render(<InteractionBanner interactionCount={7} />);
    expect(screen.getByText('3 interactions left, wrap it up, please.')).toBeInTheDocument();
  });

  it('renders "2 interactions left, wrap it up, please." when interactionCount is 8', () => {
    render(<InteractionBanner interactionCount={8} />);
    expect(screen.getByText('2 interactions left, wrap it up, please.')).toBeInTheDocument();
  });

  it('renders "1 interaction left, wrap it up, please." when interactionCount is 9', () => {
    render(<InteractionBanner interactionCount={9} />);
    // Singular "interaction" (not "interactions")
    expect(screen.getByText('1 interaction left, wrap it up, please.')).toBeInTheDocument();
  });

  it('the warning banner is visible (has an accessible role or is in the document)', () => {
    render(<InteractionBanner interactionCount={5} />);
    // Any of: role="status", role="alert", or just visible text
    const text = screen.getByText(/interactions left/i);
    expect(text).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Session-limit disabled message at count 10
// ---------------------------------------------------------------------------

describe('InteractionBanner — session limit reached (10)', () => {
  it('renders the session-limit message when interactionCount is 10', () => {
    render(<InteractionBanner interactionCount={10} />);
    expect(
      screen.getByText(
        "You've reached the session limit. Please refresh the page or use the manual form."
      )
    ).toBeInTheDocument();
  });

  it('does NOT render the "interactions left" text when interactionCount is 10', () => {
    render(<InteractionBanner interactionCount={10} />);
    expect(screen.queryByText(/interactions left/i)).not.toBeInTheDocument();
  });

  it('does NOT render the "interaction left" text (singular) when interactionCount is 10', () => {
    render(<InteractionBanner interactionCount={10} />);
    expect(screen.queryByText(/interaction left/i)).not.toBeInTheDocument();
  });
});
