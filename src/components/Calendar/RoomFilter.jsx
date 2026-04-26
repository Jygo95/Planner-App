const ROOM_NAMES = ['california', 'nevada', 'oregon'];

export default function RoomFilter({ activeRooms, onFilterChange }) {
  const handleChange = (room) => {
    let updated;
    if (activeRooms.includes(room)) {
      updated = activeRooms.filter((r) => r !== room);
    } else {
      updated = [...activeRooms, room];
    }
    onFilterChange(updated);
  };

  return (
    <div data-testid="room-filter" className="room-filter">
      {ROOM_NAMES.map((room) => (
        <label key={room} className={`room-filter-label room-filter-${room}`}>
          <input
            type="checkbox"
            checked={activeRooms.includes(room)}
            onChange={() => handleChange(room)}
          />
          {room}
        </label>
      ))}
    </div>
  );
}
