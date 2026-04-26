import './ConfirmationCard.css';

function computeDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMinutes = eh * 60 + em - (sh * 60 + sm);

  if (totalMinutes <= 0) return '0 min';

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hour`;
  return `${hours} hour ${minutes} min`;
}

export default function ConfirmationCard({
  room,
  date,
  startTime,
  endTime,
  bookerName,
  description,
  timeAdjusted,
  onConfirm,
  onCancel,
}) {
  const duration = computeDuration(startTime, endTime);

  return (
    <div data-testid="confirmation-card" className="confirmation-card">
      <h2>Booking Summary</h2>
      <dl>
        <dt>Room</dt>
        <dd>{room}</dd>

        <dt>Date</dt>
        <dd>{date}</dd>

        <dt>Start time</dt>
        <dd>{startTime}</dd>

        <dt>End time</dt>
        <dd>{endTime}</dd>

        <dt>Duration</dt>
        <dd>{duration}</dd>

        <dt>Booker name</dt>
        <dd>{bookerName}</dd>

        {description && (
          <>
            <dt>Description</dt>
            <dd>{description}</dd>
          </>
        )}
      </dl>

      {timeAdjusted && (
        <p className="time-adjusted-note">
          Note: your start time was adjusted to align with room availability.
        </p>
      )}

      <div className="confirmation-card__actions">
        <button type="button" onClick={onConfirm}>
          Confirm booking
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
