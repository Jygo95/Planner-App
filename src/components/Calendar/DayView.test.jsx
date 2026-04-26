import { render, screen } from '@testing-library/react';
import DayView from './DayView.jsx';

const ROOMS = ['california', 'nevada', 'oregon'];

const makeBooking = (overrides = {}) => ({
  id: 1,
  room_id: 'california',
  start_utc: '2026-04-26T09:00:00Z',
  end_utc: '2026-04-26T10:00:00Z',
  booker_name: 'Alice',
  description: 'Team sync',
  ...overrides,
});

describe('DayView', () => {
  it('renders 3 room columns (california, nevada, oregon) when no filter applied', () => {
    render(<DayView bookings={[]} filteredRooms={ROOMS} date="2026-04-26" />);
    expect(screen.getByText(/california/i)).toBeInTheDocument();
    expect(screen.getByText(/nevada/i)).toBeInTheDocument();
    expect(screen.getByText(/oregon/i)).toBeInTheDocument();
  });

  it('renders a booking block in the correct column given a booking with room_id', () => {
    const booking = makeBooking({ room_id: 'nevada', booker_name: 'Bob' });
    render(<DayView bookings={[booking]} filteredRooms={ROOMS} date="2026-04-26" />);
    // The booking block should appear — rendered by column
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
  });

  it('does not render a room column when filteredRooms excludes that room', () => {
    const filtered = ['california', 'nevada'];
    render(<DayView bookings={[]} filteredRooms={filtered} date="2026-04-26" />);
    expect(screen.getByText(/california/i)).toBeInTheDocument();
    expect(screen.getByText(/nevada/i)).toBeInTheDocument();
    expect(screen.queryByText(/oregon/i)).not.toBeInTheDocument();
  });

  it('renders a BookingBlock for each booking passed in props', () => {
    const bookings = [
      makeBooking({ id: 1, room_id: 'california', booker_name: 'Alice' }),
      makeBooking({ id: 2, room_id: 'nevada', booker_name: 'Bob' }),
      makeBooking({ id: 3, room_id: 'oregon', booker_name: 'Carol' }),
    ];
    render(<DayView bookings={bookings} filteredRooms={ROOMS} date="2026-04-26" />);
    expect(screen.getByText(/Alice/i)).toBeInTheDocument();
    expect(screen.getByText(/Bob/i)).toBeInTheDocument();
    expect(screen.getByText(/Carol/i)).toBeInTheDocument();
  });
});
