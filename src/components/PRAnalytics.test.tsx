import { render, screen, fireEvent } from '@testing-library/react';
import { PRAnalytics } from './PRAnalytics';
import { PRData } from '@/lib/github-api';

const mockPRs: PRData[] = [
  {
    number: 123,
    title: 'Add new feature component',
    state: 'merged',
    createdAt: '2024-01-15T10:30:00Z',
    mergedAt: '2024-01-16T14:20:00Z',
    closedAt: '2024-01-16T14:20:00Z',
    author: 'john-doe',
    reviewCount: 3,
    timeToMerge: 28,
    linesChanged: 150,
    additions: 120,
    deletions: 30,
    reviewers: ['jane-smith', 'bob-wilson'],
    labels: ['feature', 'frontend'],
    isDraft: false,
  },
  {
    number: 124,
    title: 'Fix critical bug in authentication',
    state: 'merged',
    createdAt: '2024-01-14T09:15:00Z',
    mergedAt: '2024-01-14T11:30:00Z',
    closedAt: '2024-01-14T11:30:00Z',
    author: 'jane-smith',
    reviewCount: 2,
    timeToMerge: 2,
    linesChanged: 25,
    additions: 15,
    deletions: 10,
    reviewers: ['john-doe'],
    labels: ['bug', 'hotfix'],
    isDraft: false,
  },
  {
    number: 125,
    title: 'Work in progress: Refactor API layer',
    state: 'open',
    createdAt: '2024-01-13T16:45:00Z',
    author: 'bob-wilson',
    reviewCount: 0,
    linesChanged: 500,
    additions: 300,
    deletions: 200,
    reviewers: [],
    labels: ['refactor', 'api'],
    isDraft: true,
  },
  {
    number: 126,
    title: 'Update documentation',
    state: 'closed',
    createdAt: '2024-01-12T14:20:00Z',
    closedAt: '2024-01-13T10:15:00Z',
    author: 'alice-brown',
    reviewCount: 1,
    linesChanged: 75,
    additions: 50,
    deletions: 25,
    reviewers: ['john-doe'],
    labels: ['documentation'],
    isDraft: false,
  },
];

describe('PRAnalytics', () => {
  const mockOnPRSelect = jest.fn();

  beforeEach(() => {
    mockOnPRSelect.mockClear();
  });

  it('renders loading state correctly', () => {
    render(
      <PRAnalytics
        pullRequests={[]}
        isLoading={true}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Pull Request Analytics')).toBeInTheDocument();
    
    // Should show loading skeleton
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no PRs are provided', () => {
    render(
      <PRAnalytics
        pullRequests={[]}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('No pull requests found')).toBeInTheDocument();
    expect(screen.getByText('No PR data available for the selected time period.')).toBeInTheDocument();
  });

  it('renders PR analytics correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Pull Request Analytics')).toBeInTheDocument();
    expect(screen.getByText('4 PRs • Last 30 days')).toBeInTheDocument();
    
    // Check statistics cards
    expect(screen.getByText('Total PRs')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Total PRs
    expect(screen.getByText('Merged')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Merged PRs
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Open PRs
  });

  it('calculates merge rate correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // 2 merged out of 4 total = 50% merge rate
    expect(screen.getByText('50% merge rate')).toBeInTheDocument();
  });

  it('calculates average time to merge correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Average of 28h and 2h = 15h
    expect(screen.getByText('15h')).toBeInTheDocument();
    expect(screen.getByText('Hours to merge')).toBeInTheDocument();
  });

  it('displays PR size distribution', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('PR Size Distribution')).toBeInTheDocument();
    expect(screen.getByText('XS (≤10 lines)')).toBeInTheDocument();
    expect(screen.getByText('S (≤50 lines)')).toBeInTheDocument();
    expect(screen.getByText('M (≤200 lines)')).toBeInTheDocument();
    expect(screen.getByText('L (≤500 lines)')).toBeInTheDocument();
    expect(screen.getByText('XL (>500 lines)')).toBeInTheDocument();
  });

  it('displays top contributors', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Top Contributors')).toBeInTheDocument();
    expect(screen.getByText('john-doe')).toBeInTheDocument();
    expect(screen.getByText('jane-smith')).toBeInTheDocument();
    expect(screen.getByText('bob-wilson')).toBeInTheDocument();
    expect(screen.getByText('alice-brown')).toBeInTheDocument();
  });

  it('renders PR list correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Recent Pull Requests')).toBeInTheDocument();
    expect(screen.getByText('#123')).toBeInTheDocument();
    expect(screen.getByText('Add new feature component')).toBeInTheDocument();
    expect(screen.getByText('#124')).toBeInTheDocument();
    expect(screen.getByText('Fix critical bug in authentication')).toBeInTheDocument();
  });

  it('shows PR state indicators', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Check for state indicators (emojis)
    expect(screen.getAllByText('🟣')).toHaveLength(2); // Merged PRs
    expect(screen.getByText('🟢')).toBeInTheDocument(); // Open PR
    expect(screen.getByText('🔴')).toBeInTheDocument(); // Closed PR
    expect(screen.getByText('📝')).toBeInTheDocument(); // Draft PR
  });

  it('displays draft PR badge', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('handles PR selection', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
        onPRSelect={mockOnPRSelect}
      />
    );

    const pr123Button = screen.getByText('#123').closest('button');
    fireEvent.click(pr123Button!);
    
    expect(mockOnPRSelect).toHaveBeenCalledWith(mockPRs[0]);
  });

  it('highlights selected PR', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
        onPRSelect={mockOnPRSelect}
        selectedPR={123}
      />
    );

    const selectedPR = screen.getByText('#123').closest('button');
    const unselectedPR = screen.getByText('#124').closest('button');
    
    expect(selectedPR).toHaveClass('bg-blue-50', 'border-blue-200');
    expect(unselectedPR).not.toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('displays PR size colors correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show size indicators (XS, S, M, L, XL)
    expect(screen.getByText('S')).toBeInTheDocument(); // 25 lines
    expect(screen.getByText('M')).toBeInTheDocument(); // 150 lines
    expect(screen.getByText('L')).toBeInTheDocument(); // 500 lines
    expect(screen.getByText('M')).toBeInTheDocument(); // 75 lines
  });

  it('shows time to merge information', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('28h to merge')).toBeInTheDocument();
    expect(screen.getByText('2h to merge')).toBeInTheDocument();
  });

  it('displays author information', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText(/By john-doe/)).toBeInTheDocument();
    expect(screen.getByText(/By jane-smith/)).toBeInTheDocument();
    expect(screen.getByText(/By bob-wilson/)).toBeInTheDocument();
    expect(screen.getByText(/By alice-brown/)).toBeInTheDocument();
  });

  it('formats relative time correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show relative time formats
    expect(screen.getByText(/days ago|weeks ago|months ago|years ago/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
        onPRSelect={mockOnPRSelect}
      />
    );

    const prButtons = screen.getAllByRole('button');
    prButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
      expect(button.getAttribute('aria-label')).toContain('PR');
    });
  });

  it('supports keyboard navigation', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
        onPRSelect={mockOnPRSelect}
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
        <PRAnalytics
          pullRequests={mockPRs}
          isLoading={false}
          timePeriod={period}
        />
      );

      expect(screen.getByText(`4 PRs • ${expectedLabels[index]}`)).toBeInTheDocument();
      
      rerender(<div />);
    });
  });

  it('displays PR ranking correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
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

  it('limits PR list display to 10 items', () => {
    const manyPRs = Array.from({ length: 15 }, (_, i) => ({
      ...mockPRs[0],
      number: i + 1,
      title: `PR ${i + 1}`,
    }));

    render(
      <PRAnalytics
        pullRequests={manyPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Showing 10 of 15 pull requests')).toBeInTheDocument();
  });

  it('handles single PR correctly', () => {
    const singlePR = [mockPRs[0]];
    
    render(
      <PRAnalytics
        pullRequests={singlePR}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('1 PRs • Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Total PRs
    expect(screen.getByText('100% merge rate')).toBeInTheDocument(); // Should be 100% merged
  });

  it('handles PRs without time to merge', () => {
    const prWithoutMergeTime = [{
      ...mockPRs[0],
      timeToMerge: undefined,
      mergedAt: undefined,
    }];
    
    render(
      <PRAnalytics
        pullRequests={prWithoutMergeTime}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('0h')).toBeInTheDocument(); // Average time to merge should be 0
  });

  it('calculates contributor statistics correctly', () => {
    render(
      <PRAnalytics
        pullRequests={mockPRs}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Each contributor should show PR count and lines changed
    expect(screen.getByText('1 PRs')).toBeInTheDocument();
    expect(screen.getByText(/\d+ lines/)).toBeInTheDocument();
  });
});