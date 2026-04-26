import { render, screen } from '@testing-library/react';
import LLMUnavailableBanner from './LLMUnavailableBanner.jsx';

describe('LLMUnavailableBanner', () => {
  it('renders banner text "AI assistant unavailable" when llmAvailable is false', () => {
    render(<LLMUnavailableBanner llmAvailable={false} />);
    expect(screen.getByText(/AI assistant unavailable/i)).toBeInTheDocument();
  });

  it('does not render when llmAvailable is true', () => {
    const { container } = render(<LLMUnavailableBanner llmAvailable={true} />);
    expect(screen.queryByText(/AI assistant unavailable/i)).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
  });

  it('renders a visible banner element when llmAvailable is false', () => {
    render(<LLMUnavailableBanner llmAvailable={false} />);
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
  });
});
