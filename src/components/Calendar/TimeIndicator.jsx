import { useRigaTime } from '../../hooks/useRigaTime.js';

function getRigaMinutes(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Riga',
    hour12: false,
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour').value, 10);
  const m = parseInt(parts.find((p) => p.type === 'minute').value, 10);
  return h * 60 + m;
}

export default function TimeIndicator({ currentMinutes }) {
  const rigaTime = useRigaTime();

  const minutes = currentMinutes !== undefined ? currentMinutes : getRigaMinutes(rigaTime);
  const top = `${(minutes / 1440) * 100}%`;

  return (
    <div
      data-testid="time-indicator"
      className="time-indicator"
      style={{ top, position: 'absolute', width: '100%' }}
    />
  );
}
