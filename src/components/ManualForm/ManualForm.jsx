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

function roundToFiveMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMinutes = h * 60 + m;
  const rounded = Math.ceil(totalMinutes / 5) * 5;
  const rh = Math.floor(rounded / 60) % 24;
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

function getNowInRiga() {
  // Returns the current wall-clock time in Europe/Riga as a Date-like object
  // by building an ISO string from the Riga-formatted parts.
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Riga',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const rp = {};
  parts.forEach(({ type, value }) => {
    rp[type] = value;
  });
  return new Date(`${rp.year}-${rp.month}-${rp.day}T${rp.hour}:${rp.minute}:${rp.second}`);
}

export default function ManualForm() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');

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
    setValidationError('');

    const { room, date, startTime, endTime, bookerName } = form;
    if (!room || !date || !startTime || !endTime || !bookerName.trim()) return;

    // Parse start and end times into total minutes
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;
    const durationMinutes = endMinutes - startMinutes;

    // FR-MAN-3: End time must be at least 10 minutes after start time
    if (durationMinutes < 10) {
      setValidationError('Booking must be at least 10 minutes');
      return;
    }

    // FR-MAN-3: Duration must not exceed 4 hours (240 minutes)
    if (durationMinutes > 240) {
      setValidationError('Booking cannot exceed 4 hours');
      return;
    }

    // FR-MAN-3: Start time must not be in the past (Europe/Riga)
    const nowRiga = getNowInRiga();
    const startRiga = new Date(`${date}T${startTime}:00`);
    if (startRiga < nowRiga) {
      setValidationError('Start time is in the past');
      return;
    }

    // Detect client-side rounding: compare raw input to rounded-to-5min
    const roundedStart = roundToFiveMinutes(startTime);
    const roundedEnd = roundToFiveMinutes(endTime);
    const timeAdjusted = roundedStart !== startTime || roundedEnd !== endTime;

    setPendingBooking({ ...form, timeAdjusted });
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

  // Determine which API error to show (visible regardless of pendingBooking state)
  const apiErrorNode = error && (
    <>
      {error.type === 'conflict' && (
        <p className="manual-form__error">
          That slot was just taken by {error.bookerName}. Please pick another time or room.
        </p>
      )}
      {error.type === 'rule_error' && <p className="manual-form__error">{error.error}</p>}
      {error.type === 'network_error' && (
        <p className="manual-form__error">Could not reach server. Please try again.</p>
      )}
    </>
  );

  return (
    <div className="manual-form-wrapper">
      {successMessage && <p className="manual-form__success">{successMessage}</p>}

      {!showForm && !successMessage && (
        <button type="button" className="manual-form__affordance" onClick={() => setShowForm(true)}>
          Switch to manual
        </button>
      )}

      {/* API errors shown outside form/confirmation conditional so they are always visible */}
      {showForm && apiErrorNode}

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

          {validationError && <p className="manual-form__error">{validationError}</p>}

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
          timeAdjusted={pendingBooking.timeAdjusted}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
