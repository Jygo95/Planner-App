import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GearIcon from './components/GearIcon.jsx';
import ManualForm from './components/ManualForm/ManualForm.jsx';
import ConfirmationCard from './components/ManualForm/ConfirmationCard.jsx';
import BookingDetailPanel from './components/BookingDetail/BookingDetailPanel.jsx';
import BookingBlock from './components/Calendar/BookingBlock.jsx';

// ---------------------------------------------------------------------------
// GearIcon
// ---------------------------------------------------------------------------
describe('GearIcon accessibility', () => {
  it('all buttons have an aria-label attribute', () => {
    render(<GearIcon />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label').trim()).not.toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// BookingBlock
// ---------------------------------------------------------------------------
describe('BookingBlock accessibility', () => {
  const booking = {
    id: 'bb-1',
    room_id: 'california',
    booker_name: 'Alice',
    start_utc: '2026-04-26T10:00:00Z',
    end_utc: '2026-04-26T11:00:00Z',
  };

  it('has role="button"', () => {
    render(<BookingBlock booking={booking} onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has an aria-label containing the booker name', () => {
    render(<BookingBlock booking={booking} onClick={vi.fn()} />);
    const block = screen.getByRole('button');
    expect(block).toHaveAttribute('aria-label');
    expect(block.getAttribute('aria-label')).toMatch(/Alice/i);
  });

  it('has an aria-label containing the room', () => {
    render(<BookingBlock booking={booking} onClick={vi.fn()} />);
    const block = screen.getByRole('button');
    expect(block.getAttribute('aria-label')).toMatch(/california/i);
  });
});

// ---------------------------------------------------------------------------
// ManualForm — inputs and textareas have associated labels
// ---------------------------------------------------------------------------
describe('ManualForm accessibility', () => {
  it('room select has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    // Click "Switch to manual" to reveal the form
    const toggle = screen.getByRole('button', { name: /switch to manual/i });
    toggle.click();
    // After form appears, labels should be queryable
    expect(await findByLabelText(/room/i)).toBeInTheDocument();
  });

  it('date input has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    screen.getByRole('button', { name: /switch to manual/i }).click();
    expect(await findByLabelText(/date/i)).toBeInTheDocument();
  });

  it('start time input has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    screen.getByRole('button', { name: /switch to manual/i }).click();
    expect(await findByLabelText(/start time/i)).toBeInTheDocument();
  });

  it('end time input has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    screen.getByRole('button', { name: /switch to manual/i }).click();
    expect(await findByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('booker name input has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    screen.getByRole('button', { name: /switch to manual/i }).click();
    expect(await findByLabelText(/booker name/i)).toBeInTheDocument();
  });

  it('description textarea has an associated label', async () => {
    const { findByLabelText } = render(<ManualForm />);
    screen.getByRole('button', { name: /switch to manual/i }).click();
    expect(await findByLabelText(/description/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ConfirmationCard — all interactive buttons have accessible names
// ---------------------------------------------------------------------------
describe('ConfirmationCard accessibility', () => {
  const defaultProps = {
    room: 'california',
    date: '2026-04-27',
    startTime: '10:00',
    endTime: '11:00',
    bookerName: 'Bob',
    description: '',
    timeAdjusted: false,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('all buttons have accessible names', () => {
    render(<ConfirmationCard {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((btn) => {
      // Accessible name can come from text content, aria-label, or aria-labelledby
      const name =
        btn.getAttribute('aria-label') ||
        btn.getAttribute('aria-labelledby') ||
        btn.textContent.trim();
      expect(name).not.toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// BookingDetailPanel — "Cancel booking" button has an accessible name
// ---------------------------------------------------------------------------
describe('BookingDetailPanel accessibility', () => {
  const booking = {
    id: 'bk-1',
    room_id: 'nevada',
    booker_name: 'Carol',
    start_utc: '2026-04-26T09:00:00Z',
    end_utc: '2026-04-26T10:00:00Z',
    description: '',
  };

  it('"Cancel booking" button has an accessible name', () => {
    render(
      <BookingDetailPanel
        booking={booking}
        onClose={vi.fn()}
        onEditSave={vi.fn()}
        onCancelConfirm={vi.fn()}
      />
    );
    const cancelBtn = screen.getByRole('button', { name: /cancel booking/i });
    expect(cancelBtn).toBeInTheDocument();

    const accessibleName =
      cancelBtn.getAttribute('aria-label') ||
      cancelBtn.getAttribute('aria-labelledby') ||
      cancelBtn.textContent.trim();
    expect(accessibleName).not.toBe('');
  });
});
