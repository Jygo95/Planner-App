import { useState } from 'react';
import DayView from './DayView.jsx';
import WeekView from './WeekView.jsx';
import MonthView from './MonthView.jsx';
import RoomFilter from './RoomFilter.jsx';
import BookingDetailPanel from '../BookingDetail/BookingDetailPanel.jsx';
import useBookings from '../../hooks/useBookings.js';
import useBookingActions from '../../hooks/useBookingActions.js';
import { useToast } from '../../context/ToastContext.jsx';
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
  const dow = d.getUTCDay(); // 0=Sun, 1=Mon...
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function dayBounds(dateStr) {
  const from = `${dateStr}T00:00:00Z`;
  const to = `${dateStr}T23:59:59Z`;
  return { from, to };
}

function weekBounds(weekStart) {
  const from = `${weekStart}T00:00:00Z`;
  const end = addDays(weekStart, 6);
  const to = `${end}T23:59:59Z`;
  return { from, to };
}

function monthBounds(year, month) {
  const mm = String(month + 1).padStart(2, '0');
  const from = `${year}-${mm}-01T00:00:00Z`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dd = String(lastDay).padStart(2, '0');
  const to = `${year}-${mm}-${dd}T23:59:59Z`;
  return { from, to };
}

function parseYearMonth(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  return { year: y, month: m - 1 }; // month is 0-indexed
}

function getInitialDate(today) {
  const params = new URLSearchParams(window.location.search);
  const dateParam = params.get('date');
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return dateParam;
  return today;
}

export default function Calendar() {
  const today = getTodayRiga();
  const { year: todayYear, month: todayMonth } = parseYearMonth(today);
  const { showToast } = useToast();

  const [view, setView] = useState('day');
  const [currentDate, setCurrentDate] = useState(() => getInitialDate(today));
  const [activeRooms, setActiveRooms] = useState([...ALL_ROOMS]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Month-view specific state
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);

  const minDate = addDays(today, -365);
  const maxDate = addDays(today, 90);

  const weekStart = getWeekStart(currentDate);

  let fetchBounds;
  if (view === 'day') {
    fetchBounds = dayBounds(currentDate);
  } else if (view === 'week') {
    fetchBounds = weekBounds(weekStart);
  } else {
    fetchBounds = monthBounds(viewYear, viewMonth);
  }

  const { bookings, refetch } = useBookings({ from: fetchBounds.from, to: fetchBounds.to });

  const { delete: deleteBooking } = useBookingActions({
    onSuccess: () => {
      showToast('Booking cancelled.');
      setSelectedBooking(null);
      if (refetch) refetch();
    },
  });

  const { patch } = useBookingActions({
    onSuccess: () => {
      showToast('Booking updated.');
      setSelectedBooking(null);
      if (refetch) refetch();
    },
  });

  const handleCancelBooking = (id) => {
    deleteBooking(id);
  };

  const handleEditSave = (id, body) => {
    patch(id, body);
  };

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
    // Bounds check: don't go before minDate month or after maxDate month
    const newMonthStr = `${newYear}-${String(newMonth + 1).padStart(2, '0')}-01`;
    const maxMonthStr = maxDate.slice(0, 7) + '-01';
    const minMonthStr = minDate.slice(0, 7) + '-01';
    if (newMonthStr > maxMonthStr || newMonthStr < minMonthStr) return;
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
              <span className="current-date-label">{currentDate}</span>
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
              <span className="current-date-label">
                {weekStart} – {addDays(weekStart, 6)}
              </span>
              <button data-testid="nav-next-week" onClick={() => navigateWeek(1)}>
                ›
              </button>
              <button onClick={goToday}>This week</button>
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
              <button onClick={goThisMonth}>This month</button>
            </>
          )}
        </div>

        <RoomFilter activeRooms={activeRooms} onFilterChange={setActiveRooms} />
      </div>

      <div className="calendar-body">
        {view === 'day' && (
          <DayView
            date={currentDate}
            bookings={bookings}
            filteredRooms={activeRooms}
            onBookingClick={setSelectedBooking}
          />
        )}
        {view === 'week' && (
          <WeekView
            weekStart={weekStart}
            bookings={bookings}
            filteredRooms={activeRooms}
            onBookingClick={setSelectedBooking}
          />
        )}
        {view === 'month' && (
          <MonthView
            year={viewYear}
            month={viewMonth}
            bookings={bookings}
            filteredRooms={activeRooms}
            onDayClick={handleMonthDayClick}
            minDate={minDate}
            maxDate={maxDate}
          />
        )}
      </div>

      {selectedBooking && (
        <BookingDetailPanel
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancelConfirm={handleCancelBooking}
          onEditSave={(body) => handleEditSave(selectedBooking.id, body)}
        />
      )}
    </div>
  );
}
