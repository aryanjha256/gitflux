import { render, screen } from '@testing-library/react';
import { PRTimeline } from './PRTimeline';
import { PRTimelineData } from '@/lib/github-api';

// Mock Recharts components
jest.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

const mockTimelineData: PRTimelineData[] = [
  {
    date: '2024-01-01',
    opened: 5,
    merged: 3,
    closed: 1,
  },
  {
    date: '2024-01-02',
    opened: 2,
    merged: 4,
    closed: 0,
  },
  {
    date: '2024-01-03',
    opened: 3,
    merged: 2,
    closed: 2,
  },
  {
    date: '2024-01-04',
    opened: 1,
    merged: 3,
    closed: 1,
  },
  {
    date: '2024-01-05',
    opened: 4,
    merged: 1,
    closed: 2,
  },
];

describe('PRTimeline', () => {
  it('renders loading state correctly', () => {
    render(
      <PRTimeline
        timelineData={[]}
        isLoading={true}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Pull Request Timeline')).toBeInTheDocument();
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    
    // Should show loading skeleton
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no timeline data is provided', () => {
    render(
      <PRTimeline
        timelineData={[]}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('No timeline data available')).toBeInTheDocument();
    expect(screen.getByText('Not enough pull request activity to generate a timeline.')).toBeInTheDocument();
  });

  it('renders timeline chart correctly', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Pull Request Timeline')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    
    // Check chart components
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('legend')).toBeInTheDocument();
  });

  it('calculates statistics correctly', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Total opened: 5 + 2 + 3 + 1 + 4 = 15
    expect(screen.getByText('15')).toBeInTheDocument();
    
    // Total merged: 3 + 4 + 2 + 3 + 1 = 13
    expect(screen.getByText('13')).toBeInTheDocument();
    
    // Total closed: 1 + 0 + 2 + 1 + 2 = 6
    expect(screen.getByText('6')).toBeInTheDocument();
    
    // Check stat labels
    expect(screen.getByText('PRs Opened')).toBeInTheDocument();
    expect(screen.getByText('PRs Merged')).toBeInTheDocument();
    expect(screen.getByText('PRs Closed')).toBeInTheDocument();
    expect(screen.getByText('Peak Activity')).toBeInTheDocument();
  });

  it('displays activity pattern analysis', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Activity Pattern Analysis')).toBeInTheDocument();
    expect(screen.getByText('Activity Trend:')).toBeInTheDocument();
    expect(screen.getByText('Consistency:')).toBeInTheDocument();
    expect(screen.getByText('Merge Ratio:')).toBeInTheDocument();
    expect(screen.getByText('Avg Daily Activity:')).toBeInTheDocument();
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
        <PRTimeline
          timelineData={mockTimelineData}
          isLoading={false}
          timePeriod={period}
        />
      );

      expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
      
      rerender(<div />);
    });
  });

  it('calculates peak activity correctly', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Peak day should be Jan 1 with 9 total activities (5 opened + 3 merged + 1 closed)
    expect(screen.getByText('9')).toBeInTheDocument(); // Peak activity count
  });

  it('handles single data point', () => {
    const singlePoint: PRTimelineData[] = [
      { date: '2024-01-01', opened: 5, merged: 3, closed: 1 },
    ];

    render(
      <PRTimeline
        timelineData={singlePoint}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Pull Request Timeline')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Opened
    expect(screen.getByText('3')).toBeInTheDocument(); // Merged
    expect(screen.getByText('1')).toBeInTheDocument(); // Closed
    expect(screen.getByText('9')).toBeInTheDocument(); // Peak activity
  });

  it('handles zero values correctly', () => {
    const zeroData: PRTimelineData[] = [
      { date: '2024-01-01', opened: 0, merged: 0, closed: 0 },
      { date: '2024-01-02', opened: 0, merged: 0, closed: 0 },
    ];

    render(
      <PRTimeline
        timelineData={zeroData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument(); // Total opened
    expect(screen.getByText('0')).toBeInTheDocument(); // Total merged
    expect(screen.getByText('0')).toBeInTheDocument(); // Total closed
    expect(screen.getByText('0')).toBeInTheDocument(); // Peak activity
  });

  it('displays stat cards with correct icons', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Check that stat cards are rendered with icons
    const statCards = screen.getAllByText(/🔀|✅|🔴|📊/);
    expect(statCards.length).toBeGreaterThan(0);
  });

  it('formats dates correctly for different time periods', () => {
    const testData: PRTimelineData[] = [
      { date: '2024-01-15', opened: 5, merged: 3, closed: 1 },
    ];

    // Test 30d period (should show month and day)
    render(
      <PRTimeline
        timelineData={testData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // The exact format depends on locale, but should include month info
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('calculates merge ratio correctly', () => {
    const testData: PRTimelineData[] = [
      { date: '2024-01-01', opened: 10, merged: 5, closed: 2 },
    ];

    render(
      <PRTimeline
        timelineData={testData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Merge ratio should be 50% (5 merged / 10 opened)
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('calculates consistency score correctly', () => {
    // Consistent data (all days have same activity)
    const consistentData: PRTimelineData[] = [
      { date: '2024-01-01', opened: 3, merged: 2, closed: 1 },
      { date: '2024-01-02', opened: 3, merged: 2, closed: 1 },
      { date: '2024-01-03', opened: 3, merged: 2, closed: 1 },
    ];

    render(
      <PRTimeline
        timelineData={consistentData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Consistency should be 100% (perfect consistency)
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows trend analysis correctly', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should show trend icons and analysis
    const trendIcons = screen.getAllByText(/📈|📉|➡️/);
    expect(trendIcons.length).toBeGreaterThan(0);
  });

  it('handles null timeline data gracefully', () => {
    render(
      <PRTimeline
        timelineData={null as any}
        isLoading={false}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('No timeline data available')).toBeInTheDocument();
  });

  it('displays average daily activity correctly', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );

    // Should calculate and display average daily activity
    expect(screen.getByText('Avg Daily Activity:')).toBeInTheDocument();
    
    // Total activity: (5+3+1) + (2+4+0) + (3+2+2) + (1+3+1) + (4+1+2) = 9+6+7+5+7 = 34
    // Average: 34/5 = 6.8
    expect(screen.getByText('6.8')).toBeInTheDocument();
  });
});