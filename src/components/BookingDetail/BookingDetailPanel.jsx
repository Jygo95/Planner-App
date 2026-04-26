import { useState, useEffect } from 'react';
import './BookingDetailPanel.css';

const ROOM_NAMES = { california: 'California', nevada: 'Nevada', oregon: 'Oregon' };

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

function utcToRigaParts(utcStr) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Riga',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(utcStr));
  const rp = {};
  parts.forEach(({ type, value }) => {
    rp[type] = value;
  });
  return { date: `${rp.year}-${rp.month}-${rp.day}`, time: `${rp.hour}:${rp.minute}` };
}

export default function BookingDetailPanel({ booking, onClose, onEditSave, onCancelConfirm }) {
  const [confirming, setConfirming] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState(null);

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
  const roomName = ROOM_NAMES[booking.room_id] ?? booking.room_id;

  function handleEditClick() {
    const startParts = utcToRigaParts(booking.start_utc);
    const endParts = utcToRigaParts(booking.end_utc);
    setEditForm({
      room_id: booking.room_id,
      date: startParts.date,
      startTime: startParts.time,
      endTime: endParts.time,
      bookerName: booking.booker_name,
      description: booking.description || '',
    });
    setShowEditForm(true);
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditConfirm(e) {
    e.preventDefault();
    const { room_id, date, startTime: st, endTime: et, bookerName, description } = editForm;
    onEditSave({
      room_id,
      start_utc: rigaToUtcIso(date, st),
      end_utc: rigaToUtcIso(date, et),
      booker_name: bookerName,
      description,
    });
    setShowEditForm(false);
  }

  function rigaToUtcIso(dateStr, timeStr) {
    const localIso = `${dateStr}T${timeStr}:00`;
    const localDate = new Date(localIso);
    const rigaMs = localDate.getTime();
    const rigaParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Riga',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(localDate);
    const rp = {};
    rigaParts.forEach(({ type, value }) => {
      rp[type] = value;
    });
    const rigaDisplayedIso = `${rp.year}-${rp.month}-${rp.day}T${rp.hour}:${rp.minute}:00`;
    const rigaDisplayed = new Date(rigaDisplayedIso);
    const offsetMs = rigaDisplayed.getTime() - rigaMs;
    return new Date(rigaMs - offsetMs).toISOString();
  }

  return (
    <div data-testid="booking-detail-panel" className="booking-detail-panel">
      <button className="booking-detail-close" onClick={onClose} aria-label="Close">
        ×
      </button>

      <h2 className="booking-detail-room">{roomName}</h2>

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

      {showEditForm && editForm ? (
        <form className="booking-detail-edit-form" onSubmit={handleEditConfirm}>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-room">Room</label>
            <select
              id="edit-room"
              name="room_id"
              value={editForm.room_id}
              onChange={handleEditChange}
            >
              <option value="california">California</option>
              <option value="nevada">Nevada</option>
              <option value="oregon">Oregon</option>
            </select>
          </div>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-date">Date</label>
            <input
              id="edit-date"
              name="date"
              type="date"
              value={editForm.date}
              onChange={handleEditChange}
            />
          </div>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-start">Start time</label>
            <input
              id="edit-start"
              name="startTime"
              type="time"
              value={editForm.startTime}
              onChange={handleEditChange}
            />
          </div>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-end">End time</label>
            <input
              id="edit-end"
              name="endTime"
              type="time"
              value={editForm.endTime}
              onChange={handleEditChange}
            />
          </div>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-booker">Booker name</label>
            <input
              id="edit-booker"
              name="bookerName"
              type="text"
              value={editForm.bookerName}
              onChange={handleEditChange}
            />
          </div>
          <div className="booking-detail-edit-field">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              name="description"
              value={editForm.description}
              onChange={handleEditChange}
            />
          </div>
          <div className="booking-detail-edit-actions">
            <button type="submit">Save changes</button>
            <button type="button" onClick={() => setShowEditForm(false)}>
              Discard
            </button>
          </div>
        </form>
      ) : !confirming ? (
        <div className="booking-detail-actions">
          <button className="booking-detail-edit" onClick={handleEditClick}>
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
