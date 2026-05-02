/**
 * Unit tests for src/components/Toast/Toast.jsx
 *
 * Spec (FR-CONF-2 / FR-V-7):
 *   Props: message, onDismiss, duration=5000
 *   - renders the message text
 *   - close button calls onDismiss
 *   - auto-dismisses after `duration` ms
 *   - does NOT auto-dismiss before duration elapses
 *   - is non-modal (no role="dialog")
 *   - has role="status"
 *   - has aria-live="polite"
 *   - close button is present
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from './Toast.jsx';

describe('Toast — rendering', () => {
  it('renders the message text', () => {
    render(<Toast message="That slot was just taken by Alice." onDismiss={() => {}} />);
    expect(screen.getByText('That slot was just taken by Alice.')).toBeInTheDocument();
  });

  it('is non-modal: does not have role="dialog"', () => {
    render(<Toast message="Some conflict." onDismiss={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a close button', () => {
    render(<Toast message="Some conflict." onDismiss={() => {}} />);
    // accept a button with accessible name like "Close", "×", "Dismiss", etc.
    const closeBtn =
      screen.queryByRole('button', { name: /close/i }) ||
      screen.queryByRole('button', { name: /dismiss/i }) ||
      screen.queryByRole('button');
    expect(closeBtn).not.toBeNull();
  });

  it('has role="status" for screen-reader announcements', () => {
    render(<Toast message="Booking confirmed." onDismiss={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<Toast message="Booking confirmed." onDismiss={() => {}} />);
    const statusEl = screen.getByRole('status');
    expect(statusEl).toHaveAttribute('aria-live', 'polite');
  });

  it('close button is present', () => {
    render(<Toast message="Booking confirmed." onDismiss={() => {}} />);
    const closeBtn =
      screen.queryByRole('button', { name: /close/i }) ||
      screen.queryByRole('button', { name: /dismiss/i }) ||
      screen.queryByRole('button');
    expect(closeBtn).not.toBeNull();
  });
});

describe('Toast — onDismiss callback', () => {
  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Conflict!" onDismiss={onDismiss} />);
    const closeBtn =
      screen.queryByRole('button', { name: /close/i }) ||
      screen.queryByRole('button', { name: /dismiss/i }) ||
      screen.queryByRole('button');
    fireEvent.click(closeBtn);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('Toast — auto-dismiss timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does NOT call onDismiss before the duration elapses', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Conflict!" onDismiss={onDismiss} duration={3000} />);

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss after the duration elapses', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Conflict!" onDismiss={onDismiss} duration={3000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('uses 5000 ms as the default duration', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Conflict!" onDismiss={onDismiss} />);

    // Not dismissed at 4999 ms
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    // Dismissed at 5000 ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
