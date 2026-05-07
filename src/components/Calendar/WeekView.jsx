import { useRef, useEffect } from 'react';
import BookingBlock from './BookingBlock.jsx';
import TimeIndicator from './TimeIndicator.jsx';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_HEIGHT = 60;
const TOTAL_HEIGHT = 24 * HOUR_HEIGHT;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getRigaDateStr(utcStr) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Riga',
  }).format(new Date(utcStr));
}

function getRigaHour(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    timeZone: 'Europe/Riga',
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find((p) => p.type === 'hour').value, 10);
}

export default function WeekView({ weekStart, today, bookings, filteredRooms, onBookingClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const hour = getRigaHour(new Date());
    scrollRef.current.scrollTop = Math.max(0, (hour - 1) * HOUR_HEIGHT);
  }, []);

  const visibleBookings =
    filteredRooms && filteredRooms.length > 0
      ? bookings.filter((b) => filteredRooms.includes(b.room_id))
      : bookings;

  return (
    <div data-testid="week-view" className="week-view">
      {/* Sticky day headers */}
      <div className="week-view-header-row">
        <div className="time-gutter-spacer" />
        {days.map((day, i) => {
          const isToday = day === today;
          return (
            <div
              key={day}
              role="columnheader"
              className={`week-day-header${isToday ? ' week-day-header--today' : ''}`}
            >
              {DAY_NAMES[i]} {day.slice(8)}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="week-view-scroll" ref={scrollRef}>
        <div className="week-view-grid" style={{ height: TOTAL_HEIGHT }}>
          {/* Time gutter */}
          <div className="time-gutter">
            {HOURS.map((h) => (
              <div key={h} className="time-gutter-cell" style={{ top: h * HOUR_HEIGHT }}>
                <span className="time-gutter-label">{String(h).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const isToday = day === today;
            const dayBookings = visibleBookings.filter((b) => getRigaDateStr(b.start_utc) === day);
            return (
              <div
                key={day}
                className={`week-day-column${isToday ? ' week-day-column--today' : ''}`}
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
                {/* Time indicator on today's column */}
                {isToday && <TimeIndicator />}
                {/* Bookings */}
                {dayBookings.map((booking) => (
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
  );
}
