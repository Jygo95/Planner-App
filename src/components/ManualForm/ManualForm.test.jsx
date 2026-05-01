import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualForm from './ManualForm.jsx';

describe('ManualForm', () => {
  it('renders a "Switch to manual" affordance on initial render', () => {
    render(<ManualForm />);
    expect(screen.getByText(/switch to manual/i)).toBeInTheDocument();
  });

  describe('when form is visible', () => {
    beforeEach(() => {
      render(<ManualForm />);
      fireEvent.click(screen.getByText(/switch to manual/i));
    });

    it('renders a room select with 3 options: california, nevada, oregon', () => {
      const select = screen.getByRole('combobox', { name: /room/i });
      expect(select).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /california/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /nevada/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /oregon/i })).toBeInTheDocument();
    });

    it('renders a date input', () => {
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('renders a start time input', () => {
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    });

    it('renders an end time input', () => {
      expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
    });

    it('renders a booker name input', () => {
      expect(screen.getByLabelText(/booker name/i)).toBeInTheDocument();
    });

    it('renders a description textarea', () => {
      expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    });

    it('renders a "Back to chat" button', () => {
      expect(screen.getByRole('button', { name: /back to chat/i })).toBeInTheDocument();
    });

    it('blocks submit when required fields are empty', async () => {
      const submitBtn = screen.getByRole('button', { name: /preview|submit|confirm/i });
      fireEvent.click(submitBtn);
      await waitFor(() => {
        expect(screen.queryByText(/confirmation/i)).not.toBeInTheDocument();
      });
    });

    it('shows ConfirmationCard after filling all required fields and submitting', async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /room/i }), {
        target: { value: 'california' },
      });
      fireEvent.change(screen.getByLabelText(/date/i), {
        target: { value: '2026-05-15' },
      });
      fireEvent.change(screen.getByLabelText(/start time/i), {
        target: { value: '09:00' },
      });
      fireEvent.change(screen.getByLabelText(/end time/i), {
        target: { value: '10:00' },
      });
      fireEvent.change(screen.getByLabelText(/booker name/i), {
        target: { value: 'Alice' },
      });

      const submitBtn = screen.getByRole('button', { name: /preview|submit|confirm/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-card')).toBeInTheDocument();
      });
    });

    it('clicking Cancel on ConfirmationCard returns to the form without clearing it', async () => {
      fireEvent.change(screen.getByRole('combobox', { name: /room/i }), {
        target: { value: 'nevada' },
      });
      fireEvent.change(screen.getByLabelText(/date/i), {
        target: { value: '2026-05-02' },
      });
      fireEvent.change(screen.getByLabelText(/start time/i), {
        target: { value: '10:00' },
      });
      fireEvent.change(screen.getByLabelText(/end time/i), {
        target: { value: '11:00' },
      });
      fireEvent.change(screen.getByLabelText(/booker name/i), {
        target: { value: 'Bob' },
      });

      const submitBtn = screen.getByRole('button', { name: /preview|submit|confirm/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-card')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('confirmation-card')).not.toBeInTheDocument();
        // Form is still present (not cleared)
        expect(screen.getByRole('combobox', { name: /room/i })).toBeInTheDocument();
      });
    });
  });
});
