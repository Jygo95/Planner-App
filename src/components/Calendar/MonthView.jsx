import './MonthView.css';

const RIGA_TZ = 'Europe/Riga';

/**
 * Convert a UTC ISO string to a YYYY-MM-DD date string in Riga timezone.
 */
function toRigaDate(utcString) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: RIGA_TZ,
  }).format(new Date(utcString));
}

/**
 * Return an ISO date string YYYY-MM-DD for a given year/month (0-indexed)/day.
 */
function isoDate(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Build the list of ISO date strings for all cells in the month grid.
 * Grid starts on Monday (ISO week). Returns an array of YYYY-MM-DD strings.
 */
function buildCalendarDays(year, month) {
  // First day of the month (local; we only use year/month/day)
  const firstDay = new Date(year, month, 1);
  // Day of week: 0=Sun,1=Mon,...,6=Sat → convert to Mon-based (0=Mon,...,6=Sun)
  const dowFirst = (firstDay.getDay() + 6) % 7; // days to go back to reach Monday
  const lastDay = new Date(year, month + 1, 0).getDate(); // last date of month

  // Calculate grid start (could be in the previous month)
  const gridStart = new Date(year, month, 1 - dowFirst);

  // Total cells: enough to cover all days, rounded up to full weeks (multiples of 7)
  const totalDays = dowFirst + lastDay;
  const weeks = Math.ceil(totalDays / 7);
  const cellCount = weeks * 7;

  const days = [];
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push(iso);
  }
  return days;
}

export default function MonthView({
  year,
  month,
  bookings,
  filteredRooms,
  onDayClick,
  minDate,
  maxDate,
}) {
  const days = buildCalendarDays(year, month);

  // Build density map: { 'YYYY-MM-DD': count }
  const densityMap = {};
  const rooms = new Set(filteredRooms || []);
  for (const b of bookings) {
    if (!rooms.has(b.room_id)) continue;
    const d = toRigaDate(b.start_utc);
    densityMap[d] = (densityMap[d] || 0) + 1;
  }

  const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleCellClick = (dateStr, disabled) => {
    if (disabled) return;
    onDayClick && onDayClick(dateStr);
  };

  return (
    <div data-testid="month-view" className="month-view">
      <div className="month-view-grid">
        {/* Day-of-week headers */}
        {DAY_HEADERS.map((h) => (
          <div key={h} className="month-view-header-cell">
            {h}
          </div>
        ))}

        {/* Day cells */}
        {days.map((dateStr) => {
          const isCurrentMonth =
            dateStr >= isoDate(year, month, 1) &&
            dateStr <= isoDate(year, month, new Date(year, month + 1, 0).getDate());
          const disabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
          const density = densityMap[dateStr] || 0;
          const dayNum = parseInt(dateStr.slice(8), 10);

          return (
            <div
              key={dateStr}
              role="gridcell"
              data-testid={`day-cell-${dateStr}`}
              className={[
                'month-view-cell',
                isCurrentMonth ? '' : 'month-view-cell--other',
                disabled ? 'month-view-cell--disabled' : '',
              ]
                .join(' ')
                .trim()}
              aria-disabled={disabled ? 'true' : undefined}
              onClick={() => handleCellClick(dateStr, disabled)}
            >
              <span className="month-view-day-num">{dayNum}</span>
              {density > 0 && (
                <span data-testid={`density-${dateStr}`} className="month-view-density">
                  {density}
                </span>
              )}
              {density === 0 && (
                <span
                  data-testid={`density-${dateStr}`}
                  className="month-view-density month-view-density--zero"
                >
                  0
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
