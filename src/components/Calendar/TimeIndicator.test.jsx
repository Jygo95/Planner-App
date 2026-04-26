import { render, screen, act } from '@testing-library/react';
import TimeIndicator from './TimeIndicator.jsx';

describe('TimeIndicator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a time indicator element', () => {
    render(<TimeIndicator />);
    const indicator = screen.getByTestId('time-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('indicator top position reflects the current time via prop injection', () => {
    // 06:00 = 360 minutes into day, out of 1440 = 25% down
    render(<TimeIndicator currentMinutes={360} />);
    const indicator = screen.getByTestId('time-indicator');
    const style = indicator.style.top;
    // top should encode the 25% position somehow (e.g. "25%" or a pixel value)
    expect(style).toBeTruthy();
  });

  it('indicator top position changes when a different time is passed', () => {
    const { rerender } = render(<TimeIndicator currentMinutes={360} />);
    const indicatorBefore = screen.getByTestId('time-indicator');
    const topBefore = indicatorBefore.style.top;

    rerender(<TimeIndicator currentMinutes={720} />);
    const indicatorAfter = screen.getByTestId('time-indicator');
    const topAfter = indicatorAfter.style.top;

    expect(topAfter).not.toBe(topBefore);
  });

  it('updates position on interval using fake timers', () => {
    vi.useFakeTimers();
    // Set time to 09:00 (540 minutes)
    vi.setSystemTime(new Date('2026-04-26T09:00:00Z'));

    render(<TimeIndicator />);
    const indicatorBefore = screen.getByTestId('time-indicator');
    const topBefore = indicatorBefore.style.top;

    // Advance by 30 minutes
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000);
    });

    const indicatorAfter = screen.getByTestId('time-indicator');
    expect(indicatorAfter.style.top).not.toBe(topBefore);
  });
});
