import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GearIcon from '../components/GearIcon';

describe('GearIcon', () => {
  it('renders a button with accessible name containing "Settings"', () => {
    render(<GearIcon />);
    const btn = screen.getByRole('button', { name: /settings/i });
    expect(btn).toBeInTheDocument();
  });

  it('clicking the button causes SettingsSheet to appear in the DOM', () => {
    render(<GearIcon />);
    expect(screen.queryByText('Auto')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('clicking outside the SettingsSheet removes it from the DOM', () => {
    render(
      <div>
        <GearIcon />
        <div data-testid="outside">Outside area</div>
      </div>
    );
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    expect(screen.getByText('Auto')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Auto')).not.toBeInTheDocument();
  });
});
