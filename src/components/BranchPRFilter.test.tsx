import { render, screen, fireEvent } from '@testing-library/react';
import { BranchPRFilter, BranchFilterType, PRFilterType } from './BranchPRFilter';
import { TimePeriod } from '@/lib/github-api';

describe('BranchPRFilter', () => {
  const mockOnPeriodChange = jest.fn();
  const mockOnBranchFilterChange = jest.fn();
  const mockOnPRFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders time period filter by default', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    expect(screen.getByText('Time Period')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
  });

  it('shows branch filter when enabled', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        selectedBranchFilter="active"
      />
    );

    expect(screen.getByText('Branch Filter')).toBeInTheDocument();
    expect(screen.getByText('All Branches')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('Merged')).toBeInTheDocument();
  });

  it('shows PR filter when enabled', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showPRFilter={true}
        onPRFilterChange={mockOnPRFilterChange}
        selectedPRFilter="open"
      />
    );

    expect(screen.getByText('Pull Request Filter')).toBeInTheDocument();
    expect(screen.getByText('All PRs')).toBeInTheDocument();
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(screen.getByText('Merged')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('handles time period changes', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByText('90 Days'));
    expect(mockOnPeriodChange).toHaveBeenCalledWith('90d');
  });

  it('handles branch filter changes', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        selectedBranchFilter="all"
      />
    );

    fireEvent.click(screen.getByText('Active'));
    expect(mockOnBranchFilterChange).toHaveBeenCalledWith('active');
  });

  it('handles PR filter changes', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showPRFilter={true}
        onPRFilterChange={mockOnPRFilterChange}
        selectedPRFilter="all"
      />
    );

    fireEvent.click(screen.getByText('Open'));
    expect(mockOnPRFilterChange).toHaveBeenCalledWith('open');
  });

  it('highlights selected filters correctly', () => {
    render(
      <BranchPRFilter
        selectedPeriod="90d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        selectedBranchFilter="active"
        showPRFilter={true}
        onPRFilterChange={mockOnPRFilterChange}
        selectedPRFilter="merged"
      />
    );

    // Check time period selection
    const timePeriodButton = screen.getByText('90 Days');
    expect(timePeriodButton).toHaveClass('bg-blue-600', 'text-white');

    // Check branch filter selection
    const branchFilterButton = screen.getByText('Active');
    expect(branchFilterButton).toHaveClass('bg-green-600', 'text-white');

    // Check PR filter selection
    const prFilterButton = screen.getByText('Merged');
    expect(prFilterButton).toHaveClass('bg-purple-600', 'text-white');
  });

  it('disables all buttons when loading', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        showPRFilter={true}
        onPRFilterChange={mockOnPRFilterChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('shows loading indicator for time period', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays filter descriptions', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        selectedBranchFilter="active"
        showPRFilter={true}
        onPRFilterChange={mockOnPRFilterChange}
        selectedPRFilter="open"
      />
    );

    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Recently updated branches')).toBeInTheDocument();
    expect(screen.getByText('Currently open pull requests')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
        selectedBranchFilter="active"
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-pressed');
      expect(button).toHaveAttribute('aria-label');
      expect(button).toHaveAttribute('title');
    });
  });

  it('supports keyboard navigation', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={true}
        onBranchFilterChange={mockOnBranchFilterChange}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('handles all filter combinations', () => {
    const branchFilters: BranchFilterType[] = ['all', 'active', 'stale', 'merged'];
    const prFilters: PRFilterType[] = ['all', 'open', 'closed', 'merged', 'draft'];
    const timePeriods: TimePeriod[] = ['30d', '90d', '6m', '1y', 'all'];

    branchFilters.forEach(branchFilter => {
      prFilters.forEach(prFilter => {
        timePeriods.forEach(timePeriod => {
          const { rerender } = render(
            <BranchPRFilter
              selectedPeriod={timePeriod}
              onPeriodChange={mockOnPeriodChange}
              isLoading={false}
              showBranchFilter={true}
              onBranchFilterChange={mockOnBranchFilterChange}
              selectedBranchFilter={branchFilter}
              showPRFilter={true}
              onPRFilterChange={mockOnPRFilterChange}
              selectedPRFilter={prFilter}
            />
          );

          // Should render without errors
          expect(screen.getByText('Time Period')).toBeInTheDocument();
          expect(screen.getByText('Branch Filter')).toBeInTheDocument();
          expect(screen.getByText('Pull Request Filter')).toBeInTheDocument();

          rerender(<div />);
        });
      });
    });
  });

  it('does not show filters when not enabled', () => {
    render(
      <BranchPRFilter
        selectedPeriod="30d"
        onPeriodChange={mockOnPeriodChange}
        isLoading={false}
        showBranchFilter={false}
        showPRFilter={false}
      />
    );

    expect(screen.queryByText('Branch Filter')).not.toBeInTheDocument();
    expect(screen.queryByText('Pull Request Filter')).not.toBeInTheDocument();
    expect(screen.getByText('Time Period')).toBeInTheDocument();
  });
});