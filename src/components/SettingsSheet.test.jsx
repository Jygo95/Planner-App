import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import SettingsSheet from '../components/SettingsSheet';

const STORAGE_KEY = 'meeting-queuer.webgl-mode';

beforeEach(() => {
  localStorage.clear();
});

describe('SettingsSheet', () => {
  it('renders three options: Auto, Force enable WebGL, Force CSS only', () => {
    render(<SettingsSheet />);
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.getByText('Force enable WebGL')).toBeInTheDocument();
    expect(screen.getByText('Force CSS only')).toBeInTheDocument();
  });

  it('clicking "Force CSS only" writes force-css to localStorage', () => {
    render(<SettingsSheet />);
    fireEvent.click(screen.getByText('Force CSS only'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('force-css');
  });

  it('renders "Force enable WebGL" as selected when localStorage has force-webgl', () => {
    localStorage.setItem(STORAGE_KEY, 'force-webgl');
    render(<SettingsSheet />);
    // Accept either data-selected attribute or aria-checked/aria-pressed on the option element
    const optionEl = screen
      .getByText('Force enable WebGL')
      .closest('button, [role="radio"], [role="option"]');
    expect(optionEl).not.toBeNull();
    const isSelected =
      optionEl?.getAttribute('data-selected') === 'true' ||
      optionEl?.getAttribute('aria-pressed') === 'true' ||
      optionEl?.getAttribute('aria-checked') === 'true' ||
      optionEl?.classList.contains('selected') ||
      optionEl?.classList.contains('active');
    expect(isSelected).toBe(true);
  });
});
