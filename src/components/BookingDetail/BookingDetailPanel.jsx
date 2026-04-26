import { useState, useEffect } from 'react';
import './BookingDetailPanel.css';

function formatRigaTime(utcStr) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Riga',
    hour12: false,
  }).format(new Date(utcStr));
}

function formatDuration(startUtc, endUtc) {
  const diffMs = new Date(endUtc) - new Date(startUtc);
  const totalMin = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0 && mins > 0) return `${hours}hr ${mins}min`;
  if (hours > 0) return `${hours}hr`;
  return `${mins}min`;
}

export default function BookingDetailPanel({ booking, onClose, onEditSave, onCancelConfirm }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const startTime = formatRigaTime(booking.start_utc);
  const endTime = formatRigaTime(booking.end_utc);
  const duration = formatDuration(booking.start_utc, booking.end_utc);

  return (
    <div data-testid="booking-detail-panel" className="booking-detail-panel">
      <button className="booking-detail-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <h2 className="booking-detail-room">{booking.room_id}</h2>

      <div className="booking-detail-times">
        <span>{startTime}</span>
        <span className="booking-detail-dash"> – </span>
        <span>{endTime}</span>
      </div>

      <div className="booking-detail-duration">{duration}</div>

      <div className="booking-detail-booker">{booking.booker_name}</div>

      {booking.description && (
        <div className="booking-detail-description">{booking.description}</div>
      )}

      {!confirming ? (
        <div className="booking-detail-actions">
          <button className="booking-detail-edit" onClick={onEditSave}>
            Edit
          </button>
          <button className="booking-detail-cancel" onClick={() => setConfirming(true)}>
            Cancel booking
          </button>
        </div>
      ) : (
        <div className="booking-detail-confirm">
          <p>Cancel this booking?</p>
          <button
            className="booking-detail-confirm-yes"
            onClick={() => onCancelConfirm(booking.id)}
          >
            Yes, cancel it
          </button>
          <button className="booking-detail-confirm-keep" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </div>
      )}
    </div>
  );
}
