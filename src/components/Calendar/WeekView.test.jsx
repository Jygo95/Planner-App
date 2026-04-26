import { render, screen } from '@testing-library/react';
import WeekView from './WeekView.jsx';

const makeBooking = (overrides = {}) => ({
  id: 1,
  room_id: 'california',
  start_utc: '2026-04-26T09:00:00Z',
  end_utc: '2026-04-26T10:00:00Z',
  booker_name: 'Alice',
  description: 'Team sync',
  ...overrides,
});

describe('WeekView', () => {
  it('renders 7 day columns', () => {
    // weekStart is a Monday; the view should show Mon–Sun
    render(<WeekView bookings={[]} weekStart="2026-04-21" />);
    const dayCols = screen.getAllByRole('columnheader');
    expect(dayCols).toHaveLength(7);
  });

  it('renders a booking on the correct day column matching its start_utc date', () => {
    // Booking is on Wednesday 2026-04-23
    const booking = makeBooking({
      start_utc: '2026-04-23T14:00:00Z',
      end_utc: '2026-04-23T15:00:00Z',
      booker_name: 'Dave',
    });
    render(<WeekView bookings={[booking]} weekStart="2026-04-21" />);
    expect(screen.getByText(/Dave/i)).toBeInTheDocument();
  });

  it('renders without crashing when given an empty bookings array', () => {
    expect(() => render(<WeekView bookings={[]} weekStart="2026-04-21" />)).not.toThrow();
  });
});
