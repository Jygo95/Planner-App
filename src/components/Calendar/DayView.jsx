import { useRef, useEffect } from 'react';
import BookingBlock from './BookingBlock.jsx';
import TimeIndicator from './TimeIndicator.jsx';

const ROOM_COLORS = { california: 'blue', nevada: 'green', oregon: 'amber' };
const HOUR_HEIGHT = 60; // px per hour
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT; // 1440px
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getRigaHour(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    timeZone: 'Europe/Riga',
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find((p) => p.type === 'hour').value, 10);
}

export default function DayView({ bookings, filteredRooms, onBookingClick }) {
  const rooms = filteredRooms || ['california', 'nevada', 'oregon'];
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const hour = getRigaHour(new Date());
    scrollRef.current.scrollTop = Math.max(0, (hour - 1) * HOUR_HEIGHT);
  }, []);

  return (
    <div data-testid="day-view" className="day-view">
      {/* Sticky column headers */}
      <div className="day-view-header-row">
        <div className="time-gutter-spacer" />
        {rooms.map((room) => (
          <div key={room} className={`room-column-header room-column-${ROOM_COLORS[room] || ''}`}>
            {room}
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="day-view-scroll" ref={scrollRef}>
        <div className="day-view-grid" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter: hour labels */}
          <div className="time-gutter">
            {HOURS.map((h) => (
              <div key={h} className="time-gutter-cell" style={{ top: h * HOUR_HEIGHT }}>
                <span className="time-gutter-label">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Columns area: room columns + time indicator */}
          <div className="day-view-columns-area">
            {/* Current time indicator spans all columns */}
            <TimeIndicator />

            {rooms.map((room) => {
              const roomBookings = bookings.filter((b) => b.room_id === room);
              return (
                <div
                  key={room}
                  data-testid={`room-column-${room}`}
                  className={`room-column room-column-${ROOM_COLORS[room] || ''}`}
                  style={{ height: TOTAL_HEIGHT }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div key={h} className="hour-line" style={{ top: h * HOUR_HEIGHT }} />
                  ))}
                  {/* Half-hour lines */}
                  {HOURS.map((h) => (
                    <div
                      key={`h${h}`}
                      className="half-hour-line"
                      style={{ top: h * HOUR_HEIGHT + 30 }}
                    />
                  ))}
                  {/* Booking blocks */}
                  {roomBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      onClick={onBookingClick ? () => onBookingClick(booking) : undefined}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
