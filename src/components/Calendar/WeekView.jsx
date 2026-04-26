import BookingBlock from './BookingBlock.jsx';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getRigaDateStr(utcStr) {
  const d = new Date(utcStr);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Riga',
  }).format(d);
  // en-CA gives YYYY-MM-DD format
  return parts;
}

export default function WeekView({ weekStart, bookings, filteredRooms, onBookingClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const visibleBookings =
    filteredRooms && filteredRooms.length > 0
      ? bookings.filter((b) => filteredRooms.includes(b.room_id))
      : bookings;

  return (
    <div data-testid="week-view" className="week-view">
      <table className="week-view-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {days.map((day, i) => (
              <th key={day} role="columnheader" className="week-day-header">
                {DAY_NAMES[i]} {day.slice(8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {days.map((day) => {
              const dayBookings = visibleBookings.filter(
                (b) => getRigaDateStr(b.start_utc) === day
              );
              return (
                <td
                  key={day}
                  className="week-day-cell"
                  style={{ position: 'relative', verticalAlign: 'top' }}
                >
                  {dayBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      onClick={onBookingClick ? () => onBookingClick(booking) : undefined}
                    />
                  ))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
