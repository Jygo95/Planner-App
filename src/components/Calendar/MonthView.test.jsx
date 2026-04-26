import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MonthView from './MonthView.jsx';

// April 2026 has 30 days; week starts Mon 30-Mar, ends Sun 03-May → 5 weeks = 35 cells
const YEAR = 2026;
const MONTH = 3; // 0-indexed: 3 = April

const makeBooking = (dateStr, overrides = {}) => ({
  id: Math.random(),
  room_id: 'california',
  start_utc: `${dateStr}T10:00:00Z`,
  end_utc: `${dateStr}T11:00:00Z`,
  booker_name: 'Alice',
  description: 'Meeting',
  ...overrides,
});

const DEFAULT_PROPS = {
  year: YEAR,
  month: MONTH,
  bookings: [],
  filteredRooms: ['california', 'nevada', 'oregon'],
  onDayClick: () => {},
  minDate: '2025-04-26',
  maxDate: '2026-07-25',
};

describe('MonthView', () => {
  it('renders at least 28 day cells', () => {
    render(<MonthView {...DEFAULT_PROPS} />);
    // Each day cell should display a day number; the grid has 28–42 cells
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThanOrEqual(28);
    expect(cells.length).toBeLessThanOrEqual(42);
  });

  it('shows booking density count for a date with 2 bookings', () => {
    const bookings = [makeBooking('2026-04-15', { id: 1 }), makeBooking('2026-04-15', { id: 2 })];
    render(<MonthView {...DEFAULT_PROPS} bookings={bookings} />);

    // The cell for April 15 should display "2" or a density indicator containing "2"
    const densityEl = screen.getByTestId('density-2026-04-15');
    expect(densityEl).toBeInTheDocument();
    expect(densityEl.textContent).toMatch(/2/);
  });

  it('calls onDayClick with the correct date when a day cell is clicked', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(<MonthView {...DEFAULT_PROPS} onDayClick={onDayClick} />);

    const cell = screen.getByTestId('day-cell-2026-04-10');
    await user.click(cell);

    expect(onDayClick).toHaveBeenCalledOnce();
    expect(onDayClick).toHaveBeenCalledWith('2026-04-10');
  });

  it('disables cells before minDate and they do not fire onDayClick', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    // minDate is in 2025, but we render April 2026 — test a month where some
    // cells are outside maxDate by narrowing maxDate
    render(
      <MonthView
        {...DEFAULT_PROPS}
        onDayClick={onDayClick}
        minDate="2026-04-05"
        maxDate="2026-04-25"
      />
    );

    // April 1 is before minDate (2026-04-05) — should be disabled
    const disabledCell = screen.getByTestId('day-cell-2026-04-01');
    expect(
      disabledCell.getAttribute('aria-disabled') === 'true' || disabledCell.hasAttribute('disabled')
    ).toBe(true);

    await user.click(disabledCell);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it('disables cells after maxDate and they do not fire onDayClick', async () => {
    const user = userEvent.setup();
    const onDayClick = vi.fn();
    render(
      <MonthView
        {...DEFAULT_PROPS}
        onDayClick={onDayClick}
        minDate="2026-04-01"
        maxDate="2026-04-20"
      />
    );

    // April 30 is after maxDate (2026-04-20) — should be disabled
    const disabledCell = screen.getByTestId('day-cell-2026-04-30');
    expect(
      disabledCell.getAttribute('aria-disabled') === 'true' || disabledCell.hasAttribute('disabled')
    ).toBe(true);

    await user.click(disabledCell);
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
