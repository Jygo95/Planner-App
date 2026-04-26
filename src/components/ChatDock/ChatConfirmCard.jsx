function calcDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMins = eh * 60 + em - (sh * 60 + sm);
  if (totalMins <= 0) return null;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${mins} min`;
}

export default function ChatConfirmCard({
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
  const duration = calcDuration(startTime, endTime);

  return (
    <div className="chat-confirm-card">
      <h3 className="chat-confirm-card__title">Confirm booking</h3>
      <dl className="chat-confirm-card__details">
        <div className="chat-confirm-card__row">
          <dt>Room</dt>
          <dd>{room}</dd>
        </div>
        <div className="chat-confirm-card__row">
          <dt>Date</dt>
          <dd>{date}</dd>
        </div>
        <div className="chat-confirm-card__row">
          <dt>Start</dt>
          <dd>{startTime}</dd>
        </div>
        <div className="chat-confirm-card__row">
          <dt>End</dt>
          <dd>{endTime}</dd>
        </div>
        {duration && (
          <div className="chat-confirm-card__row">
            <dt>Duration</dt>
            <dd>{duration}</dd>
          </div>
        )}
        <div className="chat-confirm-card__row">
          <dt>Booker</dt>
          <dd>{bookerName}</dd>
        </div>
        {description && (
          <div className="chat-confirm-card__row">
            <dt>Description</dt>
            <dd>{description}</dd>
          </div>
        )}
      </dl>
      {timeAdjusted && (
        <p className="chat-confirm-card__note">
          Note: times have been adjusted to the nearest 5 minutes.
        </p>
      )}
      <div className="chat-confirm-card__actions">
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
