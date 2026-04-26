import { render, screen } from '@testing-library/react';
import ChatHistory from './ChatHistory.jsx';

describe('ChatHistory', () => {
  const messages = [
    { id: '1', role: 'user', content: 'Book Nevada tomorrow 2-3pm' },
    { id: '2', role: 'assistant', content: 'Sure! Who is the booking for?' },
    { id: '3', role: 'user', content: 'Alice' },
    { id: '4', role: 'assistant', content: 'Got it. Confirming Nevada tomorrow 2-3pm for Alice.' },
  ];

  it('renders all messages in order', () => {
    render(<ChatHistory messages={messages} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
  });

  it('user messages have data-role="user"', () => {
    render(<ChatHistory messages={messages} />);
    const userMessages = screen.getAllByRole('listitem').filter((el) => el.dataset.role === 'user');
    expect(userMessages).toHaveLength(2);
  });

  it('assistant messages have data-role="assistant"', () => {
    render(<ChatHistory messages={messages} />);
    const assistantMessages = screen
      .getAllByRole('listitem')
      .filter((el) => el.dataset.role === 'assistant');
    expect(assistantMessages).toHaveLength(2);
  });

  it('last message element has data-testid="last-message"', () => {
    render(<ChatHistory messages={messages} />);
    const lastMessage = screen.getByTestId('last-message');
    expect(lastMessage).toBeInTheDocument();
    expect(lastMessage).toHaveTextContent('Got it. Confirming Nevada tomorrow 2-3pm for Alice.');
  });

  it('renders an empty list when no messages provided', () => {
    render(<ChatHistory messages={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('renders message content as text', () => {
    render(<ChatHistory messages={messages} />);
    expect(screen.getByText('Book Nevada tomorrow 2-3pm')).toBeInTheDocument();
    expect(screen.getByText('Sure! Who is the booking for?')).toBeInTheDocument();
  });
});
