import { render, screen, fireEvent } from '@testing-library/react';
import { BranchStatistics } from './BranchStatistics';
import { BranchData } from '@/lib/github-api';

const mockBranches: BranchData[] = [
  {
    name: 'main',
    lastCommitDate: '2024-01-15T10:30:00Z',
    commitCount: 100,
    status: 'active',
    isDefault: true,
    ahead: 0,
    behind: 0,
    author: 'John Doe',
    lastCommitSha: 'abc123',
    lastCommitMessage: 'Update main branch',
  },
  {
    name: 'feature/new-component',
    lastCommitDate: '2024-01-14T15:20:00Z',
    commitCount: 25,
    status: 'active',
    isDefault: false,
    ahead: 5,
    behind: 2,
    author: 'Jane Smith',
    lastCommitSha: 'def456',
    lastCommitMessage: 'Add new component',
  },
  {
    name: 'old-feature',
    lastCommitDate: '2023-10-01T09:15:00Z',
    commitCount: 15,
    status: 'stale',
    isDefault: false,
    ahead: 0,
    behind: 50,
    author: 'Bob Wilson',
    lastCommitSha: 'ghi789',
    lastCommitMessage: 'Old feature work',
  },
  {
    name: 'hotfix/bug-fix',
    lastCommitDate: '2024-01-10T12:00:00Z',
    commitCount: 3,
    status: 'merged',
    isDefault: false,
    ahead: 0,
    behind: 0,
    author: 'Alice Brown',
    lastCommitSha: 'jkl012',
    lastCommitMessage: 'Fix critical bug',
  },
];

describe('BranchStatistics', () => {
  const mockOnBranchSelect = jest.fn();

  beforeEach(() => {
    mockOnBranchSelect.mockClear();
  });

  it('renders loading state correctly', () => {
    render(
      <BranchStatistics
        branches={[]}
        isLoading={true}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Branch Statistics')).toBeInTheDocument();
    
    // Should show loading skeleton
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no branches are provided', () => {
    render(
      <BranchStatistics
        branches={[]}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('No branches found')).toBeInTheDocument();
    expect(screen.getByText('No branch data available for the selected time period.')).toBeInTheDocument();
  });

  it('renders branch statistics correctly', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Branch Statistics')).toBeInTheDocument();
    expect(screen.getByText('4 branches • Last 30 days')).toBeInTheDocument();
    
    // Check statistics cards
    expect(screen.getByText('Total Branches')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Total branches
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Active branches
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Stale branches
  });

  it('displays default branch information', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Default Branch: main')).toBeInTheDocument();
    expect(screen.getByText(/Last updated.*by John Doe/)).toBeInTheDocument();
  });

  it('renders all branches in the list', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('main')).toBeInTheDocument();
    expect(screen.getByText('feature/new-component')).toBeInTheDocument();
    expect(screen.getByText('old-feature')).toBeInTheDocument();
    expect(screen.getByText('hotfix/bug-fix')).toBeInTheDocument();
  });

  it('shows branch status indicators', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Check for status indicators (emojis)
    expect(screen.getAllByText('🟢')).toHaveLength(2); // Active branches
    expect(screen.getByText('🟡')).toBeInTheDocument(); // Stale branch
    expect(screen.getByText('🔵')).toBeInTheDocument(); // Merged branch
  });

  it('displays default branch badge', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    const defaultBadges = screen.getAllByText('Default');
    expect(defaultBadges).toHaveLength(2); // One in the info section, one in the list
  });

  it('handles branch selection', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
        onBranchSelect={mockOnBranchSelect}
      />
    );

    const mainBranchButton = screen.getByText('main').closest('button');
    fireEvent.click(mainBranchButton!);
    
    expect(mockOnBranchSelect).toHaveBeenCalledWith(mockBranches[0]);
  });

  it('highlights selected branch', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
        onBranchSelect={mockOnBranchSelect}
        selectedBranch="main"
      />
    );

    const selectedBranch = screen.getByText('main').closest('button');
    const unselectedBranch = screen.getByText('feature/new-component').closest('button');
    
    expect(selectedBranch).toHaveClass('bg-blue-50', 'border-blue-200');
    expect(unselectedBranch).not.toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('displays health scores correctly', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show health percentages
    const healthElements = screen.getAllByText(/\d+%/);
    expect(healthElements.length).toBeGreaterThan(0);
    
    // Should show "Health" labels
    const healthLabels = screen.getAllByText('Health');
    expect(healthLabels.length).toBeGreaterThan(0);
  });

  it('calculates statistics correctly', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Total: 4 branches
    expect(screen.getByText('4')).toBeInTheDocument();
    
    // Active: 2 branches (main, feature/new-component)
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Stale: 1 branch (old-feature)
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Percentages should be calculated
    expect(screen.getByText('50% of total')).toBeInTheDocument(); // Active percentage
    expect(screen.getByText('25% of total')).toBeInTheDocument(); // Stale percentage
  });

  it('formats relative time correctly', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show relative time formats
    expect(screen.getByText(/days ago|weeks ago|months ago|years ago/)).toBeInTheDocument();
  });

  it('displays author information', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText(/By John Doe/)).toBeInTheDocument();
    expect(screen.getByText(/By Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/By Bob Wilson/)).toBeInTheDocument();
    expect(screen.getByText(/By Alice Brown/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
        onBranchSelect={mockOnBranchSelect}
      />
    );

    const branchButtons = screen.getAllByRole('button');
    branchButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('branch');
    });
  });

  it('supports keyboard navigation', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
        onBranchSelect={mockOnBranchSelect}
      />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('handles different time periods correctly', () => {
    const timePeriods = ['30d', '90d', '6m', '1y', 'all'] as const;
    const expectedLabels = [
      'Last 30 days',
      'Last 90 days',
      'Last 6 months',
      'Last year',
      'All time'
    ];

    timePeriods.forEach((period, index) => {
      const { rerender } = render(
        <BranchStatistics
          branches={mockBranches}
          isLoading={false}
          timePeriod={period}
        />
      );

      expect(screen.getByText(`4 branches • ${expectedLabels[index]}`)).toBeInTheDocument();
      
      rerender(<div />);
    });
  });

  it('displays branch ranking correctly', () => {
    render(
      <BranchStatistics
        branches={mockBranches}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show rank numbers
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('handles single branch correctly', () => {
    const singleBranch = [mockBranches[0]];
    
    render(
      <BranchStatistics
        branches={singleBranch}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('1 branches • Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total branches
    expect(screen.getByText('100% of total')).toBeInTheDocument(); // Should be 100% active
  });
});