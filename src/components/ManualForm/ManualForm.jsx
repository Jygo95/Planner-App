import { useState } from 'react';
import ConfirmationCard from './ConfirmationCard.jsx';
import useBookingSubmit from '../../hooks/useBookingSubmit.js';
import './ManualForm.css';

const EMPTY_FORM = {
  room: '',
  date: '',
  startTime: '',
  endTime: '',
  bookerName: '',
  description: '',
};

function rigaToUtcIso(dateStr, timeStr) {
  // Treat the input as Europe/Riga local time and convert to UTC ISO string.
  // Strategy: new Date(localIso) parses as UTC (no tz info), so we find
  // what Riga displays for that UTC instant, then subtract the difference.
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

  // offsetMs = how far ahead Riga is from UTC for this instant
  const offsetMs = rigaDisplayed.getTime() - rigaMs;
  const utcMs = rigaMs - offsetMs;
  return new Date(utcMs).toISOString();
}

export default function ManualForm() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const { submit, error, loading } = useBookingSubmit({
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setPendingBooking(null);
      setShowForm(false);
      setSuccessMessage('Booking confirmed');
    },
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { room, date, startTime, endTime, bookerName } = form;
    if (!room || !date || !startTime || !endTime || !bookerName.trim()) return;

    setPendingBooking({ ...form });
  }

  function handleConfirm() {
    const { room, date, startTime, endTime, bookerName, description } = pendingBooking;
    const payload = {
      room,
      date,
      start_time: rigaToUtcIso(date, startTime),
      end_time: rigaToUtcIso(date, endTime),
      booker_name: bookerName.trim(),
      description,
    };
    submit(payload);
  }

  function handleCancel() {
    setPendingBooking(null);
  }

  return (
    <div className="manual-form-wrapper">
      {successMessage && <p className="manual-form__success">{successMessage}</p>}

      {!showForm && !successMessage && (
        <button type="button" className="manual-form__affordance" onClick={() => setShowForm(true)}>
          Switch to manual
        </button>
      )}

      {showForm && !pendingBooking && (
        <form className="manual-form" onSubmit={handleSubmit} noValidate>
          <div className="manual-form__field">
            <label htmlFor="room">Room</label>
            <select id="room" name="room" value={form.room} onChange={handleChange} required>
              <option value="">-- select a room --</option>
              <option value="california">california</option>
              <option value="nevada">nevada</option>
              <option value="oregon">oregon</option>
            </select>
          </div>

          <div className="manual-form__field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="manual-form__field">
            <label htmlFor="startTime">Start time</label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              step="300"
              value={form.startTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="manual-form__field">
            <label htmlFor="endTime">End time</label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              step="300"
              value={form.endTime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="manual-form__field">
            <label htmlFor="bookerName">Booker name</label>
            <input
              id="bookerName"
              name="bookerName"
              type="text"
              value={form.bookerName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="manual-form__field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={500}
            />
          </div>

          {error && error.type === 'conflict' && (
            <p className="manual-form__error">
              That slot was just taken by {error.bookerName}. Please pick another time or room.
            </p>
          )}
          {error && error.type === 'rule_error' && (
            <p className="manual-form__error">{error.error}</p>
          )}
          {error && error.type === 'network_error' && (
            <p className="manual-form__error">Could not reach server. Please try again.</p>
          )}

          <div className="manual-form__actions">
            <button type="submit" disabled={loading}>
              Preview booking
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              Back to chat
            </button>
          </div>
        </form>
      )}

      {showForm && pendingBooking && (
        <ConfirmationCard
          room={pendingBooking.room}
          date={pendingBooking.date}
          startTime={pendingBooking.startTime}
          endTime={pendingBooking.endTime}
          bookerName={pendingBooking.bookerName}
          description={pendingBooking.description}
          timeAdjusted={false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
