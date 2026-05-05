/**
 * Unit tests for src/components/Toast/ToastContainer.jsx
 *
 * These tests are intentionally RED — ToastContainer.jsx and ToastContext.jsx
 * do not exist yet.
 *
 * Spec (FR-V-7):
 *   - showToast() adds a toast to the DOM
 *   - auto-dismiss fires after 5000 ms (fake timers)
 *   - close button removes the toast immediately
 *   - multiple toasts stack (two visible at once)
 */

import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import ToastContainer from './ToastContainer.jsx';
import { ToastContext, ToastProvider } from '../../context/ToastContext.jsx';

// ---------------------------------------------------------------------------
// Helper: a consumer component that calls showToast via context
// ---------------------------------------------------------------------------
function ToastTrigger({ message, type }) {
  const { showToast } = useContext(ToastContext);
  return (
    <button type="button" onClick={() => showToast(message, type)}>
      trigger
    </button>
  );
}

function renderWithContainer(ui) {
  return render(
    <ToastProvider>
      <ToastContainer />
      {ui}
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// 1. showToast adds a toast to the DOM
// ---------------------------------------------------------------------------
describe('ToastContainer — showToast', () => {
  it('adds a toast to the DOM when showToast is called', async () => {
    renderWithContainer(<ToastTrigger message="Booking confirmed." />);

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    await waitFor(() => {
      expect(screen.getByText('Booking confirmed.')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 2. auto-dismiss fires after 5000 ms
// ---------------------------------------------------------------------------
describe('ToastContainer — auto-dismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes the toast from the DOM after 5000 ms', async () => {
    renderWithContainer(<ToastTrigger message="Auto-dismiss me." />);

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    await waitFor(() => {
      expect(screen.getByText('Auto-dismiss me.')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Auto-dismiss me.')).not.toBeInTheDocument();
    });
  });

  it('does NOT remove the toast before 5000 ms', async () => {
    renderWithContainer(<ToastTrigger message="Still here." />);

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    await waitFor(() => {
      expect(screen.getByText('Still here.')).toBeInTheDocument();
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });

    expect(screen.getByText('Still here.')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. close button removes the toast immediately
// ---------------------------------------------------------------------------
describe('ToastContainer — close button', () => {
  it('removes the toast immediately when close button is clicked', async () => {
    renderWithContainer(<ToastTrigger message="Close me now." />);

    fireEvent.click(screen.getByRole('button', { name: /trigger/i }));

    await waitFor(() => {
      expect(screen.getByText('Close me now.')).toBeInTheDocument();
    });

    const closeBtn =
      screen.queryByRole('button', { name: /close/i }) ||
      screen.queryByRole('button', { name: /dismiss/i });

    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Close me now.')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// 4. multiple toasts stack — two visible at once
// ---------------------------------------------------------------------------
describe('ToastContainer — multiple toasts stack', () => {
  it('shows two toasts simultaneously when showToast is called twice', async () => {
    function DoubleToastTrigger() {
      const { showToast } = useContext(ToastContext);
      return (
        <button
          type="button"
          onClick={() => {
            showToast('First toast');
            showToast('Second toast');
          }}
        >
          trigger two
        </button>
      );
    }

    render(
      <ToastProvider>
        <ToastContainer />
        <DoubleToastTrigger />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /trigger two/i }));

    await waitFor(() => {
      expect(screen.getByText('First toast')).toBeInTheDocument();
      expect(screen.getByText('Second toast')).toBeInTheDocument();
    });
  });
});
