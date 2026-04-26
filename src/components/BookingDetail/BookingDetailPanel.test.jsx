import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BookingDetailPanel from './BookingDetailPanel.jsx';

const sampleBooking = {
  id: 'abc-123',
  room_id: 'california',
  start_utc: '2026-04-26T09:00:00.000Z',
  end_utc: '2026-04-26T10:30:00.000Z',
  booker_name: 'Alice',
  description: 'Team standup',
  created_at_utc: '2026-04-25T12:00:00.000Z',
};

describe('BookingDetailPanel', () => {
  let onClose;
  let onEditSave;
  let onCancelConfirm;

  beforeEach(() => {
    onClose = vi.fn();
    onEditSave = vi.fn();
    onCancelConfirm = vi.fn();
  });

  function renderPanel(bookingOverrides = {}) {
    const booking = { ...sampleBooking, ...bookingOverrides };
    return render(
      <BookingDetailPanel
        booking={booking}
        onClose={onClose}
        onEditSave={onEditSave}
        onCancelConfirm={onCancelConfirm}
      />
    );
  }

  it('renders the room name', () => {
    renderPanel();
    expect(screen.getByText(/california/i)).toBeInTheDocument();
  });

  it('renders the booker name', () => {
    renderPanel();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderPanel();
    expect(screen.getByText(/Team standup/)).toBeInTheDocument();
  });

  it('renders the duration (1 hr 30 min or 1h 30m or similar)', () => {
    renderPanel();
    // Accept any format that conveys 1 hour 30 minutes
    const durationPattern = /1\s*h(r|our)?\s*30\s*m(in)?/i;
    expect(screen.getByText(durationPattern)).toBeInTheDocument();
  });

  it('shows start time in Europe/Riga timezone', () => {
    renderPanel();
    // 2026-04-26T09:00:00Z in Europe/Riga (UTC+3 in summer) = 12:00
    expect(screen.getByText(/12:00/)).toBeInTheDocument();
  });

  it('shows end time in Europe/Riga timezone', () => {
    renderPanel();
    // 2026-04-26T10:30:00Z in Europe/Riga (UTC+3 in summer) = 13:30
    expect(screen.getByText(/13:30/)).toBeInTheDocument();
  });

  it('has an Edit button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('has a Cancel booking button', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('clicking "Cancel booking" shows a confirmation prompt', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    expect(screen.getByText(/cancel this booking\?/i)).toBeInTheDocument();
  });

  it('in confirmation state, "Yes, cancel it" calls onCancelConfirm', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    fireEvent.click(screen.getByRole('button', { name: /yes,? cancel it/i }));
    expect(onCancelConfirm).toHaveBeenCalledWith('abc-123');
  });

  it('in confirmation state, "Keep it" hides the confirmation and shows main panel', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /cancel booking/i }));
    expect(screen.getByText(/cancel this booking\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /keep it/i }));

    expect(screen.queryByText(/cancel this booking\?/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel booking/i })).toBeInTheDocument();
  });

  it('pressing Escape key calls onClose', () => {
    renderPanel();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
