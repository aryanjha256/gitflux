import { render, screen, fireEvent } from '@testing-library/react';
import { TimePeriodFilter } from './TimePeriodFilter';
import { TimePeriod } from '@/lib/github-api';

describe('TimePeriodFilter', () => {
  const mockOnPeriodChange = jest.fn();

  beforeEach(() => {
    mockOnPeriodChange.mockClear();
  });

  it('renders all time period options', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
    expect(screen.getByText('6 Months')).toBeInTheDocument();
    expect(screen.getByText('1 Year')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('highlights the selected period', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="6m"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    const selectedButton = screen.getByText('6 Months');
    expect(selectedButton).toHaveClass('bg-blue-600', 'text-white');
    expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onPeriodChange when a period is clicked', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('1 Year'));
    expect(mockOnPeriodChange).toHaveBeenCalledWith('1y');
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filter by Last 30 days/ })).toBeDisabled();
  });

  it('disables all buttons when loading', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('displays the description for the selected period', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="90d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    expect(screen.getByText('Last 3 months')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="1y"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    const yearButton = screen.getByText('1 Year');
    expect(yearButton).toHaveAttribute('aria-label', 'Filter by Last 12 months');
    expect(yearButton).toHaveAttribute('title', 'Last 12 months');
    expect(yearButton).toHaveAttribute('aria-pressed', 'true');

    const monthButton = screen.getByText('30 Days');
    expect(monthButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports keyboard navigation', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    const button = screen.getByText('90 Days');
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockOnPeriodChange).toHaveBeenCalledWith('90d');
  });

  it('handles all time period values correctly', () => {
    const periods: TimePeriod[] = ['30d', '90d', '6m', '1y', 'all'];
    
    periods.forEach(period => {
      const { rerender } = render(
        <TimePeriodFilter
          selectedPeriod={period}
          onPeriodChange={mockOnPeriodChange}
          isLoading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      const selectedButton = buttons.find(button => 
        button.getAttribute('aria-pressed') === 'true'
      );
      
      expect(selectedButton).toBeInTheDocument();
      
      rerender(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={mockOnPeriodChange}
          isLoading={false}
        />
      );
    });
  });

  it('applies correct CSS classes for different states', () => {
    render(
      <TimePeriodFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    const selectedButton = screen.getByText('30 Days');
    const unselectedButton = screen.getByText('90 Days');

    expect(selectedButton).toHaveClass('bg-blue-600', 'text-white', 'border-blue-600');
    expect(unselectedButton).toHaveClass('bg-white', 'text-gray-700', 'border-gray-300');
  });
});