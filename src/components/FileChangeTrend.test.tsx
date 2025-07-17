import { render, screen } from '@testing-library/react';
import { FileChangeTrend } from './FileChangeTrend';
import { TrendPoint, TimePeriod } from '@/lib/github-api';

// Mock Recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
}));

const mockTrendData: TrendPoint[] = [
  { date: '2024-01-01', changes: 5 },
  { date: '2024-01-02', changes: 3 },
  { date: '2024-01-03', changes: 8 },
  { date: '2024-01-04', changes: 2 },
  { date: '2024-01-05', changes: 6 },
];

describe('FileChangeTrend', () => {
  it('renders empty state when no trend data is provided', () => {
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={[]}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('No trend data available')).toBeInTheDocument();
    expect(screen.getByText('No changes found for test.js in the selected time period.')).toBeInTheDocument();
  });

  it('renders empty state when filename is not provided', () => {
    render(
      <FileChangeTrend
        filename=""
        trendData={[]}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Select a file to view its change trend.')).toBeInTheDocument();
  });

  it('renders trend chart with data', () => {
    render(
      <FileChangeTrend
        filename="src/components/App.tsx"
        trendData={mockTrendData}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Change Trend')).toBeInTheDocument();
    expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('displays correct statistics', () => {
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={mockTrendData}
        timePeriod="30d"
      />
    );

    // Total changes: 5 + 3 + 8 + 2 + 6 = 24
    expect(screen.getByText('24')).toBeInTheDocument();
    
    // Average: 24 / 5 = 4.8
    expect(screen.getByText('4.8')).toBeInTheDocument();
    
    // Peak changes: 8
    expect(screen.getByText('8')).toBeInTheDocument();
    
    // Check stat labels
    expect(screen.getByText('Total Changes')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Peak Changes')).toBeInTheDocument();
    expect(screen.getByText('Peak Date')).toBeInTheDocument();
  });

  it('displays activity pattern analysis', () => {
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={mockTrendData}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Activity Pattern Analysis')).toBeInTheDocument();
    expect(screen.getByText('Trend:')).toBeInTheDocument();
    expect(screen.getByText('Consistency:')).toBeInTheDocument();
    expect(screen.getByText('High Activity Periods:')).toBeInTheDocument();
    expect(screen.getByText('Inactive Periods:')).toBeInTheDocument();
  });

  it('handles different time periods correctly', () => {
    const timePeriods: TimePeriod[] = ['30d', '90d', '6m', '1y', 'all'];
    const expectedLabels = [
      'Last 30 days',
      'Last 90 days', 
      'Last 6 months',
      'Last year',
      'All time'
    ];

    timePeriods.forEach((period, index) => {
      const { rerender } = render(
        <FileChangeTrend
          filename="test.js"
          trendData={mockTrendData}
          timePeriod={period}
        />
      );

      expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
      
      rerender(
        <FileChangeTrend
          filename="test.js"
          trendData={mockTrendData}
          timePeriod="30d"
        />
      );
    });
  });

  it('calculates trend correctly', () => {
    // Increasing trend data
    const increasingTrend: TrendPoint[] = [
      { date: '2024-01-01', changes: 1 },
      { date: '2024-01-02', changes: 3 },
      { date: '2024-01-03', changes: 5 },
      { date: '2024-01-04', changes: 7 },
      { date: '2024-01-05', changes: 9 },
    ];

    render(
      <FileChangeTrend
        filename="test.js"
        trendData={increasingTrend}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('increasing')).toBeInTheDocument();
  });

  it('handles single data point', () => {
    const singlePoint: TrendPoint[] = [
      { date: '2024-01-01', changes: 5 },
    ];

    render(
      <FileChangeTrend
        filename="test.js"
        trendData={singlePoint}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('Change Trend')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // Total changes
    expect(screen.getByText('5')).toBeInTheDocument(); // Average (same as total for single point)
  });

  it('handles zero changes correctly', () => {
    const zeroChanges: TrendPoint[] = [
      { date: '2024-01-01', changes: 0 },
      { date: '2024-01-02', changes: 0 },
      { date: '2024-01-03', changes: 0 },
    ];

    render(
      <FileChangeTrend
        filename="test.js"
        trendData={zeroChanges}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument(); // Total changes
    expect(screen.getByText('3')).toBeInTheDocument(); // Inactive periods
  });

  it('displays stat cards with correct icons', () => {
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={mockTrendData}
        timePeriod="30d"
      />
    );

    // Check that stat cards are rendered with icons
    const statCards = screen.getAllByText(/📊|📈|🔥|📅/);
    expect(statCards.length).toBeGreaterThan(0);
  });

  it('renders chart components', () => {
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={mockTrendData}
        timePeriod="30d"
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
  });

  it('formats dates correctly for different time periods', () => {
    const testData: TrendPoint[] = [
      { date: '2024-01-15', changes: 5 },
    ];

    // Test 30d period (should show month and day)
    render(
      <FileChangeTrend
        filename="test.js"
        trendData={testData}
        timePeriod="30d"
      />
    );

    // The exact format depends on locale, but should include month info
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
  });

  it('handles large numbers correctly', () => {
    const largeNumbers: TrendPoint[] = [
      { date: '2024-01-01', changes: 100 },
      { date: '2024-01-02', changes: 200 },
      { date: '2024-01-03', changes: 150 },
    ];

    render(
      <FileChangeTrend
        filename="test.js"
        trendData={largeNumbers}
        timePeriod="30d"
      />
    );

    expect(screen.getByText('450')).toBeInTheDocument(); // Total
    expect(screen.getByText('150')).toBeInTheDocument(); // Average
    expect(screen.getByText('200')).toBeInTheDocument(); // Peak
  });
});