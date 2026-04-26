import { useState } from 'react';
import DayView from './DayView.jsx';
import WeekView from './WeekView.jsx';
import RoomFilter from './RoomFilter.jsx';
import useBookings from '../../hooks/useBookings.js';
import './Calendar.css';

const ALL_ROOMS = ['california', 'nevada', 'oregon'];

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

export default function Calendar() {
  const today = getTodayRiga();
  const [view, setView] = useState('day');
  const [currentDate, setCurrentDate] = useState(today);
  const [activeRooms, setActiveRooms] = useState([...ALL_ROOMS]);

  const minDate = addDays(today, -365);
  const maxDate = addDays(today, 90);

  const weekStart = getWeekStart(currentDate);

  const { from, to } = view === 'day' ? dayBounds(currentDate) : weekBounds(weekStart);

  const { bookings } = useBookings({ from, to });

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

  const goToday = () => setCurrentDate(today);

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
        </div>

        <div className="nav-controls">
          {view === 'day' ? (
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
          ) : (
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
        </div>

        <RoomFilter activeRooms={activeRooms} onFilterChange={setActiveRooms} />
      </div>

      <div className="calendar-body">
        {view === 'day' ? (
          <DayView date={currentDate} bookings={bookings} filteredRooms={activeRooms} />
        ) : (
          <WeekView weekStart={weekStart} bookings={bookings} filteredRooms={activeRooms} />
        )}
      </div>
    </div>
  );
}
