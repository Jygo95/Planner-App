import BookingBlock from './BookingBlock.jsx';
import TimeIndicator from './TimeIndicator.jsx';

const ROOM_COLORS = {
  california: 'blue',
  nevada: 'green',
  oregon: 'amber',
};

export default function DayView({ bookings, filteredRooms, onBookingClick }) {
  const rooms = filteredRooms || ['california', 'nevada', 'oregon'];

  return (
    <div data-testid="day-view" className="day-view">
      <div className="day-view-wrapper" style={{ position: 'relative' }}>
        <TimeIndicator />
        <div className="day-view-columns">
          {rooms.map((room) => {
            const roomBookings = bookings.filter((b) => b.room_id === room);
            return (
              <div
                key={room}
                data-testid={`room-column-${room}`}
                className={`room-column room-column-${ROOM_COLORS[room] || ''}`}
                style={{ position: 'relative', flex: 1 }}
              >
                <div className="room-column-header">{room}</div>
                <div className="room-column-body" style={{ position: 'relative', flex: 1 }}>
                  {roomBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      onClick={onBookingClick ? () => onBookingClick(booking) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
