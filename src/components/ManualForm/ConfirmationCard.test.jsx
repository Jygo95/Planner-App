import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationCard from './ConfirmationCard.jsx';

const baseProps = {
  room: 'california',
  date: '2026-05-01',
  startTime: '09:00',
  endTime: '10:00',
  bookerName: 'Alice',
  description: '',
  timeAdjusted: false,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders room name', () => {
    render(<ConfirmationCard {...baseProps} />);
    expect(screen.getByText(/california/i)).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<ConfirmationCard {...baseProps} />);
    expect(screen.getByText(/2026-05-01/)).toBeInTheDocument();
  });

  it('renders start time', () => {
    render(<ConfirmationCard {...baseProps} />);
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it('renders end time', () => {
    render(<ConfirmationCard {...baseProps} />);
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('renders duration', () => {
    render(<ConfirmationCard {...baseProps} />);
    // 09:00 to 10:00 = 60 minutes or 1 hour
    expect(screen.getByText(/60\s*min|1\s*h(ou)?r/i)).toBeInTheDocument();
  });

  it('renders booker name', () => {
    render(<ConfirmationCard {...baseProps} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('shows description when provided', () => {
    render(<ConfirmationCard {...baseProps} description="Team standup" />);
    expect(screen.getByText(/Team standup/)).toBeInTheDocument();
  });

  it('does not show description when empty', () => {
    render(<ConfirmationCard {...baseProps} description="" />);
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('shows a time-adjusted note when timeAdjusted prop is true', () => {
    render(<ConfirmationCard {...baseProps} timeAdjusted={true} />);
    expect(screen.getByText(/time.*(adjusted|modified|changed)/i)).toBeInTheDocument();
  });

  it('does not show time-adjusted note when timeAdjusted is false', () => {
    render(<ConfirmationCard {...baseProps} timeAdjusted={false} />);
    expect(screen.queryByText(/time.*(adjusted|modified|changed)/i)).not.toBeInTheDocument();
  });

  it('calls onConfirm when "Confirm booking" button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationCard {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when "Cancel" button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmationCard {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
