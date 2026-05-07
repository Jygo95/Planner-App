import DayView from './DayView.jsx';
import WeekView from './WeekView.jsx';
import MonthView from './MonthView.jsx';
import RoomFilter from './RoomFilter.jsx';
import useBookings from '../../hooks/useBookings.js';
import useBookingActions from '../../hooks/useBookingActions.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useState, useEffect } from 'react';
import './Calendar.css';

const ALL_ROOMS = ['california', 'nevada', 'oregon'];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getTodayRiga() {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Europe/Riga',
  }).format(new Date());
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = d.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function dayBounds(dateStr) {
  return { from: `${dateStr}T00:00:00Z`, to: `${dateStr}T23:59:59Z` };
}

function weekBounds(weekStart) {
  return { from: `${weekStart}T00:00:00Z`, to: `${addDays(weekStart, 6)}T23:59:59Z` };
}

function monthBounds(year, month) {
  const mm = String(month + 1).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${mm}-01T00:00:00Z`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, '0')}T23:59:59Z`,
  };
}

function parseYearMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1 };
}

function getInitialDate(today) {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
  return today;
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = DAY_NAMES_LONG[d.getUTCDay()];
  const day = d.getUTCDate();
  const mon = MONTH_NAMES[d.getUTCMonth()];
  const yr = d.getUTCFullYear();
  return `${dow}, ${day} ${mon} ${yr}`;
}

function formatWeekLabel(weekStart) {
  const start = new Date(weekStart + 'T12:00:00Z');
  const end = new Date(addDays(weekStart, 6) + 'T12:00:00Z');
  const sDay = start.getUTCDate();
  const sMon = MONTH_SHORT[start.getUTCMonth()];
  const eDay = end.getUTCDate();
  const eMon = MONTH_SHORT[end.getUTCMonth()];
  const yr = end.getUTCFullYear();
  if (sMon === eMon) return `${sDay}–${eDay} ${eMon} ${yr}`;
  return `${sDay} ${sMon} – ${eDay} ${eMon} ${yr}`;
}

export default function Calendar({ onBookingSelect, actionsRef }) {
  const today = getTodayRiga();
  const { year: todayYear, month: todayMonth } = parseYearMonth(today);
  const { showToast } = useToast();

  const [view, setView] = useState('day');
  const [currentDate, setCurrentDate] = useState(() => getInitialDate(today));
  const [activeRooms, setActiveRooms] = useState([...ALL_ROOMS]);

  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);

  const minDate = addDays(today, -365);
  const maxDate = addDays(today, 90);

  const weekStart = getWeekStart(currentDate);

  let fetchBounds;
  if (view === 'day') fetchBounds = dayBounds(currentDate);
  else if (view === 'week') fetchBounds = weekBounds(weekStart);
  else fetchBounds = monthBounds(viewYear, viewMonth);

  const { bookings, refetch } = useBookings({ from: fetchBounds.from, to: fetchBounds.to });

  const { delete: deleteBooking } = useBookingActions({
    onSuccess: () => {
      showToast('Booking cancelled.');
      onBookingSelect && onBookingSelect(null);
      if (refetch) refetch();
    },
  });

  const { patch } = useBookingActions({
    onSuccess: () => {
      showToast('Booking updated.');
      onBookingSelect && onBookingSelect(null);
      if (refetch) refetch();
    },
  });

  // Expose action handlers to parent (App) via ref
  useEffect(() => {
    if (actionsRef) {
      actionsRef.current = {
        cancelBooking: (id) => deleteBooking(id),
        editBooking: (id, body) => patch(id, body),
      };
    }
  }, [actionsRef, deleteBooking, patch]);

  const navigateDay = (delta) => {
    const next = addDays(currentDate, delta);
    if (next < minDate || next > maxDate) return;
    setCurrentDate(next);
  };

  const navigateWeek = (delta) => {
    const next = addDays(currentDate, delta * 7);
    if (next < minDate || next > maxDate) return;
    if (getWeekStart(next) < minDate) return;
    setCurrentDate(next);
  };

  const navigateMonth = (delta) => {
    let newYear = viewYear;
    let newMonth = viewMonth + delta;
    if (newMonth > 11) {
      newMonth -= 12;
      newYear += 1;
    } else if (newMonth < 0) {
      newMonth += 12;
      newYear -= 1;
    }
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`;
    if (newMonthStr > maxDate.slice(0, 7) + '-01' || newMonthStr < minDate.slice(0, 7) + '-01')
      return;
    setViewYear(newYear);
    setViewMonth(newMonth);
  };

  const goToday = () => setCurrentDate(today);
  const goThisMonth = () => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
  };

  const handleMonthDayClick = (dateStr) => {
    setCurrentDate(dateStr);
    setView('day');
  };

  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <div className="calendar-container">
      <div className="calendar-toolbar">
        <div className="view-picker">
          <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>
            Day
          </button>
          <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>
            Week
          </button>
          <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>
            Month
          </button>
        </div>

        <div className="nav-controls">
          {view === 'day' && (
            <>
              <button data-testid="nav-prev-day" onClick={() => navigateDay(-1)}>
                ‹
              </button>
              <span className="current-date-label">{formatDayLabel(currentDate)}</span>
              <button data-testid="nav-next-day" onClick={() => navigateDay(1)}>
                ›
              </button>
              <button onClick={goToday}>Today</button>
            </>
          )}
          {view === 'week' && (
            <>
              <button data-testid="nav-prev-week" onClick={() => navigateWeek(-1)}>
                ‹
              </button>
              <span className="current-date-label">{formatWeekLabel(weekStart)}</span>
              <button data-testid="nav-next-week" onClick={() => navigateWeek(1)}>
                ›
              </button>
              <button onClick={goToday}>Today</button>
            </>
          )}
          {view === 'month' && (
            <>
              <button data-testid="nav-prev-month" onClick={() => navigateMonth(-1)}>
                ‹
              </button>
              <span data-testid="month-label" className="current-date-label month-label">
                {monthLabel}
              </span>
              <button data-testid="nav-next-month" onClick={() => navigateMonth(1)}>
                ›
              </button>
              <button onClick={goThisMonth}>Today</button>
            </>
          )}
          <span className="riga-tz-label">(Riga)</span>
        </div>

        <RoomFilter activeRooms={activeRooms} onFilterChange={setActiveRooms} />
      </div>

      <div className="calendar-body">
        {view === 'day' && (
          <DayView
            date={currentDate}
            today={today}
            bookings={bookings}
            filteredRooms={activeRooms}
            onBookingClick={onBookingSelect}
          />
        )}
        {view === 'week' && (
          <WeekView
            weekStart={weekStart}
            today={today}
            bookings={bookings}
            filteredRooms={activeRooms}
            onBookingClick={onBookingSelect}
          />
        )}
        {view === 'month' && (
          <MonthView
            year={viewYear}
            month={viewMonth}
            today={today}
            bookings={bookings}
            filteredRooms={activeRooms}
            onDayClick={handleMonthDayClick}
            minDate={minDate}
            maxDate={maxDate}
          />
        )}
      </div>
    </div>
  );
}
