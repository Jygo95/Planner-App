import { useState, useRef } from 'react';
import GearIcon from './components/GearIcon';
import Calendar from './components/Calendar/Calendar.jsx';
import ChatDock from './components/ChatDock/ChatDock.jsx';
import BookingDetailPanel from './components/BookingDetail/BookingDetailPanel.jsx';
import './App.css';

export default function App() {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const calendarActionsRef = useRef({});

  function handleBookingSelect(booking) {
    setSelectedBooking(booking);
    if (!booking) setMobileDetailOpen(false);
  }

  function handleBookingClose() {
    setSelectedBooking(null);
    setMobileDetailOpen(false);
  }

  function handleCancel(id) {
    calendarActionsRef.current.cancelBooking?.(id);
    setMobileDetailOpen(false);
  }

  function handleEdit(body) {
    calendarActionsRef.current.editBooking?.(selectedBooking?.id, body);
    setMobileDetailOpen(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">Meeting Room Queuer</span>
        <GearIcon />
      </header>

      <main className="app-main">
        <div className="calendar-area">
          <Calendar
            selectedBooking={selectedBooking}
            onBookingSelect={handleBookingSelect}
            actionsRef={calendarActionsRef}
          />
        </div>

        <div className="app-sidebar">
          {selectedBooking && (
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={handleBookingClose}
              onCancelConfirm={handleCancel}
              onEditSave={handleEdit}
            />
          )}
          <div className="app-sidebar__chat">
            <ChatDock />
          </div>
        </div>
      </main>

      {/* Mobile FAB — visible only on small screens when a booking is selected */}
      {selectedBooking && (
        <button
          className="booking-fab"
          aria-label="View booking details"
          onClick={() => setMobileDetailOpen(true)}
        >
          +
        </button>
      )}

      {/* Mobile detail sheet */}
      {mobileDetailOpen && selectedBooking && (
        <div className="mobile-sheet-overlay" onClick={handleBookingClose}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <BookingDetailPanel
              booking={selectedBooking}
              onClose={handleBookingClose}
              onCancelConfirm={handleCancel}
              onEditSave={handleEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
