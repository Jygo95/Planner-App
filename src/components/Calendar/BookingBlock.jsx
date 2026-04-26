export default function BookingBlock({ booking, onClick }) {
  const formatTime = (utcStr) =>
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Riga',
    }).format(new Date(utcStr));

  const startMin = (() => {
    const d = new Date(booking.start_utc);
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Riga',
      hour12: false,
    }).formatToParts(d);
    const h = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    const m = parseInt(parts.find((p) => p.type === 'minute').value, 10);
    return h * 60 + m;
  })();

  const endMin = (() => {
    const d = new Date(booking.end_utc);
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Riga',
      hour12: false,
    }).formatToParts(d);
    const h = parseInt(parts.find((p) => p.type === 'hour').value, 10);
    const m = parseInt(parts.find((p) => p.type === 'minute').value, 10);
    return h * 60 + m;
  })();

  const top = (startMin / 1440) * 100;
  const height = Math.max(((endMin - startMin) / 1440) * 100, 2);

  return (
    <div
      className="booking-block"
      data-testid={`booking-block-${booking.id}`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        position: 'absolute',
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(e);
      }}
    >
      <span className="booking-booker">{booking.booker_name}</span>
      <span className="booking-time">
        {formatTime(booking.start_utc)}–{formatTime(booking.end_utc)}
      </span>
    </div>
  );
}
