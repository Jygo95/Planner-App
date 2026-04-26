import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatConfirmCard from './ChatConfirmCard.jsx';

const baseProps = {
  room: 'Nevada',
  date: '2026-05-01',
  startTime: '14:00',
  endTime: '15:00',
  bookerName: 'Alice',
  onConfirm: () => {},
  onCancel: () => {},
};

describe('ChatConfirmCard', () => {
  it('renders the room name', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.getByText('Nevada')).toBeInTheDocument();
  });

  it('renders the date', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
  });

  it('renders the start time', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('renders the end time', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('renders the duration', () => {
    render(<ChatConfirmCard {...baseProps} />);
    // 14:00–15:00 = 60 min = 1 hour
    expect(screen.getByText(/1 hour/i)).toBeInTheDocument();
  });

  it('renders the booker name', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<ChatConfirmCard {...baseProps} description="Team standup" />);
    expect(screen.getByText('Team standup')).toBeInTheDocument();
  });

  it('does not show description section when description is absent', () => {
    render(<ChatConfirmCard {...baseProps} />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('shows time-adjusted note when timeAdjusted is true', () => {
    render(<ChatConfirmCard {...baseProps} timeAdjusted={true} />);
    expect(screen.getByText(/adjusted/i)).toBeInTheDocument();
  });

  it('does not show time-adjusted note when timeAdjusted is false', () => {
    render(<ChatConfirmCard {...baseProps} timeAdjusted={false} />);
    expect(screen.queryByText(/adjusted/i)).not.toBeInTheDocument();
  });

  it('"Confirm booking" button calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ChatConfirmCard {...baseProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('"Cancel" button calls onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ChatConfirmCard {...baseProps} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
