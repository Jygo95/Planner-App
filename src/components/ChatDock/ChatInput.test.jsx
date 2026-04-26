import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInput from './ChatInput.jsx';

describe('ChatInput', () => {
  const noop = () => {};

  it('renders a textarea', () => {
    render(<ChatInput value="" onChange={noop} onSend={noop} loading={false} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('textarea has maxLength of 300', () => {
    render(<ChatInput value="" onChange={noop} onSend={noop} loading={false} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('maxLength', '300');
  });

  it('counter shows "0 / 300" when input is empty', () => {
    render(<ChatInput value="" onChange={noop} onSend={noop} loading={false} />);
    expect(screen.getByText('0 / 300')).toBeInTheDocument();
  });

  it('counter updates to reflect current character count', () => {
    render(<ChatInput value="hello" onChange={noop} onSend={noop} loading={false} />);
    expect(screen.getByText('5 / 300')).toBeInTheDocument();
  });

  it('send button is disabled when textarea is empty', () => {
    render(<ChatInput value="" onChange={noop} onSend={noop} loading={false} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('send button is enabled when textarea has content', () => {
    render(<ChatInput value="hello" onChange={noop} onSend={noop} loading={false} />);
    expect(screen.getByRole('button', { name: /send/i })).not.toBeDisabled();
  });

  it('send button is disabled while loading prop is true', () => {
    render(<ChatInput value="hello" onChange={noop} onSend={noop} loading={true} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('counter turns red (has warning class or red style) when input is >= 270 chars', () => {
    const longValue = 'a'.repeat(270);
    render(<ChatInput value={longValue} onChange={noop} onSend={noop} loading={false} />);
    const counter = screen.getByText('270 / 300');
    // Either a CSS class indicating warning/danger/red, or an inline red color style
    const hasRedClass =
      counter.classList.contains('red') ||
      counter.classList.contains('warning') ||
      counter.classList.contains('danger') ||
      counter.classList.contains('counter--red') ||
      counter.classList.contains('counter--warning') ||
      counter.classList.contains('counter--danger');
    const hasRedStyle =
      counter.style.color === 'red' ||
      counter.style.color === '#ff0000' ||
      counter.style.color === 'rgb(255, 0, 0)';
    expect(hasRedClass || hasRedStyle).toBe(true);
  });

  it('calls onSend when send button is clicked with non-empty value', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<ChatInput value="hello" onChange={noop} onSend={onSend} loading={false} />);
    await user.click(screen.getByRole('button', { name: /send/i }));
    expect(onSend).toHaveBeenCalledOnce();
  });
});
