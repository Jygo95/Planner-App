import { render, screen, fireEvent } from '@testing-library/react';
import RoomFilter from './RoomFilter.jsx';

const ROOMS = ['california', 'nevada', 'oregon'];

describe('RoomFilter', () => {
  it('renders 3 toggles/checkboxes for california, nevada, oregon — all checked by default', () => {
    render(<RoomFilter activeRooms={ROOMS} onFilterChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    checkboxes.forEach((cb) => expect(cb).toBeChecked());

    expect(screen.getByLabelText(/california/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nevada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/oregon/i)).toBeInTheDocument();
  });

  it('clicking a toggle fires onFilterChange callback with an updated set of active rooms', () => {
    const onFilterChange = vi.fn();
    render(<RoomFilter activeRooms={ROOMS} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByLabelText(/nevada/i));

    expect(onFilterChange).toHaveBeenCalledOnce();
    const updatedRooms = onFilterChange.mock.calls[0][0];
    // Nevada was checked — now unchecked — should be removed
    expect(updatedRooms).not.toContain('nevada');
    expect(updatedRooms).toContain('california');
    expect(updatedRooms).toContain('oregon');
  });

  it('unchecking a room removes it from the active set passed to the callback', () => {
    const onFilterChange = vi.fn();
    render(<RoomFilter activeRooms={ROOMS} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByLabelText(/oregon/i));

    const updatedRooms = onFilterChange.mock.calls[0][0];
    expect(updatedRooms).not.toContain('oregon');
    expect(updatedRooms.length).toBe(2);
  });
});
