import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressIndicator } from './ProgressIndicator';

describe('ProgressIndicator', () => {
  it('renders progress information correctly', () => {
    render(
      <ProgressIndicator
        progress={25}
        total={100}
        message="Processing files..."
      />
    );

    expect(screen.getByText('Processing files...')).toBeInTheDocument();
    expect(screen.getByText('25 of 100 processed')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('renders default message when none provided', () => {
    render(
      <ProgressIndicator
        progress={10}
        total={50}
      />
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    render(
      <ProgressIndicator
        progress={33}
        total={100}
      />
    );

    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('handles zero total gracefully', () => {
    render(
      <ProgressIndicator
        progress={0}
        total={0}
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 0 processed')).toBeInTheDocument();
  });

  it('renders cancel button when onCancel is provided', () => {
    const mockOnCancel = jest.fn();
    
    render(
      <ProgressIndicator
        progress={50}
        total={100}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when onCancel is not provided', () => {
    render(
      <ProgressIndicator
        progress={50}
        total={100}
      />
    );

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('displays progress bar with correct width', () => {
    const { container } = render(
      <ProgressIndicator
        progress={75}
        total={100}
      />
    );

    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('handles progress greater than total', () => {
    render(
      <ProgressIndicator
        progress={150}
        total={100}
      />
    );

    expect(screen.getByText('150%')).toBeInTheDocument();
    expect(screen.getByText('150 of 100 processed')).toBeInTheDocument();
  });

  it('rounds percentage correctly', () => {
    render(
      <ProgressIndicator
        progress={33}
        total={99}
      />
    );

    // 33/99 = 33.33..., should round to 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ProgressIndicator
        progress={50}
        total={100}
        message="Loading data..."
      />
    );

    // Check for loading indicator
    const spinner = screen.getByRole('generic');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('applies correct CSS classes for styling', () => {
    const { container } = render(
      <ProgressIndicator
        progress={25}
        total={100}
      />
    );

    // Check main container styling
    const mainContainer = container.firstChild;
    expect(mainContainer).toHaveClass(
      'bg-blue-50',
      'dark:bg-blue-900/20',
      'border',
      'border-blue-200',
      'dark:border-blue-800',
      'rounded-lg',
      'p-4'
    );

    // Check progress bar container
    const progressBarContainer = container.querySelector('.bg-blue-200');
    expect(progressBarContainer).toHaveClass('rounded-full', 'h-2');

    // Check progress bar
    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveClass('h-2', 'rounded-full', 'transition-all', 'duration-300');
  });

  it('handles decimal progress values', () => {
    render(
      <ProgressIndicator
        progress={33.7}
        total={100}
      />
    );

    expect(screen.getByText('33.7 of 100 processed')).toBeInTheDocument();
    expect(screen.getByText('34%')).toBeInTheDocument(); // Rounded
  });
});