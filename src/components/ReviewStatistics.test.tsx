import { render, screen } from '@testing-library/react';
import { ReviewStatistics } from './ReviewStatistics';
import { ReviewAnalyticsData } from '@/lib/github-api';

// Mock Recharts components
jest.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockReviewData: ReviewAnalyticsData = {
  totalReviews: 150,
  averageReviewsPerPR: 2.5,
  averageTimeToFirstReview: 8.5, // 8.5 hours
  averageTimeToApproval: 24.0, // 24 hours
  topReviewers: [
    {
      username: 'alice',
      reviewCount: 45,
      approvalRate: 85.5,
      averageResponseTime: 6.0,
      changeRequestRate: 14.5,
    },
    {
      username: 'bob',
      reviewCount: 38,
      approvalRate: 92.1,
      averageResponseTime: 4.5,
      changeRequestRate: 7.9,
    },
    {
      username: 'charlie',
      reviewCount: 32,
      approvalRate: 78.3,
      averageResponseTime: 12.0,
      changeRequestRate: 21.7,
    },
    {
      username: 'diana',
      reviewCount: 25,
      approvalRate: 88.0,
      averageResponseTime: 8.0,
      changeRequestRate: 12.0,
    },
    {
      username: 'eve',
      reviewCount: 10,
      approvalRate: 90.0,
      averageResponseTime: 5.5,
      changeRequestRate: 10.0,
    },
  ],
  reviewPatterns: [
    {
      date: '2024-01-01',
      reviewsGiven: 12,
      approvalsGiven: 8,
      changeRequestsGiven: 4,
    },
    {
      date: '2024-01-02',
      reviewsGiven: 15,
      approvalsGiven: 12,
      changeRequestsGiven: 3,
    },
    {
      date: '2024-01-03',
      reviewsGiven: 8,
      approvalsGiven: 6,
      changeRequestsGiven: 2,
    },
    {
      date: '2024-01-04',
      reviewsGiven: 18,
      approvalsGiven: 14,
      changeRequestsGiven: 4,
    },
    {
      date: '2024-01-05',
      reviewsGiven: 10,
      approvalsGiven: 7,
      changeRequestsGiven: 3,
    },
  ],
};

describe('ReviewStatistics', () => {
  it('renders loading state correctly', () => {
    render(
      <ReviewStatistics
        reviewData={{} as ReviewAnalyticsData}
        isLoading={true}
      />
    );

    expect(screen.getByText('Code Review Statistics')).toBeInTheDocument();
    expect(screen.getAllByText('Loading chart...')).toHaveLength(2);
    
    // Should show loading skeleton
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no review data is provided', () => {
    const emptyData: ReviewAnalyticsData = {
      totalReviews: 0,
      averageReviewsPerPR: 0,
      averageTimeToFirstReview: 0,
      averageTimeToApproval: 0,
      topReviewers: [],
      reviewPatterns: [],
    };

    render(
      <ReviewStatistics
        reviewData={emptyData}
        isLoading={false}
      />
    );

    expect(screen.getByText('No review data available')).toBeInTheDocument();
    expect(screen.getByText('This repository doesn\'t have enough pull request review activity to generate statistics.')).toBeInTheDocument();
  });

  it('renders review statistics correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Code Review Statistics')).toBeInTheDocument();
    expect(screen.getByText('150 total reviews analyzed')).toBeInTheDocument();
    
    // Check metric cards
    expect(screen.getByText('2.5')).toBeInTheDocument(); // Avg Reviews per PR
    expect(screen.getByText('9h')).toBeInTheDocument(); // Time to First Review (8.5h rounded)
    expect(screen.getByText('1d')).toBeInTheDocument(); // Time to Approval (24h = 1d)
    expect(screen.getByText('5')).toBeInTheDocument(); // Active Reviewers
  });

  it('displays metric cards with correct titles and icons', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Avg Reviews per PR')).toBeInTheDocument();
    expect(screen.getByText('Time to First Review')).toBeInTheDocument();
    expect(screen.getByText('Time to Approval')).toBeInTheDocument();
    expect(screen.getByText('Active Reviewers')).toBeInTheDocument();

    // Check that icons are present
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('⏱️')).toBeInTheDocument();
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('👥')).toBeInTheDocument();
  });

  it('renders charts correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    // Check chart components
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    expect(screen.getByText('Top Reviewers by Activity')).toBeInTheDocument();
    expect(screen.getByText('Review Distribution')).toBeInTheDocument();
    expect(screen.getByText('Review Activity Timeline')).toBeInTheDocument();
  });

  it('displays reviewer performance table correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Reviewer Performance')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
    expect(screen.getByText('Approval Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Change Request Rate')).toBeInTheDocument();

    // Check reviewer data
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
    expect(screen.getByText('diana')).toBeInTheDocument();
    expect(screen.getByText('eve')).toBeInTheDocument();

    // Check review counts
    expect(screen.getByText('45')).toBeInTheDocument(); // alice's reviews
    expect(screen.getByText('38')).toBeInTheDocument(); // bob's reviews
    expect(screen.getByText('32')).toBeInTheDocument(); // charlie's reviews
  });

  it('displays approval rates correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    // Check approval rates in table
    expect(screen.getByText('85.5%')).toBeInTheDocument(); // alice
    expect(screen.getByText('92.1%')).toBeInTheDocument(); // bob
    expect(screen.getByText('78.3%')).toBeInTheDocument(); // charlie
    expect(screen.getByText('88.0%')).toBeInTheDocument(); // diana
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // eve
  });

  it('formats response times correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    // Check formatted response times
    expect(screen.getByText('6h')).toBeInTheDocument(); // alice: 6.0 hours
    expect(screen.getByText('5h')).toBeInTheDocument(); // bob: 4.5 hours rounded
    expect(screen.getByText('12h')).toBeInTheDocument(); // charlie: 12.0 hours
    expect(screen.getByText('8h')).toBeInTheDocument(); // diana: 8.0 hours
    expect(screen.getByText('6h')).toBeInTheDocument(); // eve: 5.5 hours rounded
  });

  it('displays change request rates correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    // Check change request rates
    expect(screen.getByText('14.5%')).toBeInTheDocument(); // alice
    expect(screen.getByText('7.9%')).toBeInTheDocument(); // bob
    expect(screen.getByText('21.7%')).toBeInTheDocument(); // charlie
    expect(screen.getByText('12.0%')).toBeInTheDocument(); // diana
    expect(screen.getByText('10.0%')).toBeInTheDocument(); // eve
  });

  it('shows review quality insights', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Review Quality Insights')).toBeInTheDocument();
    expect(screen.getByText('Recommendations:')).toBeInTheDocument();
  });

  it('handles single reviewer correctly', () => {
    const singleReviewerData: ReviewAnalyticsData = {
      totalReviews: 10,
      averageReviewsPerPR: 1.0,
      averageTimeToFirstReview: 2.0,
      averageTimeToApproval: 6.0,
      topReviewers: [
        {
          username: 'solo-reviewer',
          reviewCount: 10,
          approvalRate: 100.0,
          averageResponseTime: 2.0,
          changeRequestRate: 0.0,
        },
      ],
      reviewPatterns: [
        {
          date: '2024-01-01',
          reviewsGiven: 10,
          approvalsGiven: 10,
          changeRequestsGiven: 0,
        },
      ],
    };

    render(
      <ReviewStatistics
        reviewData={singleReviewerData}
        isLoading={false}
      />
    );

    expect(screen.getByText('solo-reviewer')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroData: ReviewAnalyticsData = {
      totalReviews: 1,
      averageReviewsPerPR: 0.0,
      averageTimeToFirstReview: 0.0,
      averageTimeToApproval: 0.0,
      topReviewers: [
        {
          username: 'test-user',
          reviewCount: 1,
          approvalRate: 0.0,
          averageResponseTime: 0.0,
          changeRequestRate: 0.0,
        },
      ],
      reviewPatterns: [],
    };

    render(
      <ReviewStatistics
        reviewData={zeroData}
        isLoading={false}
      />
    );

    expect(screen.getByText('0.0')).toBeInTheDocument(); // Avg Reviews per PR
    expect(screen.getByText('0m')).toBeInTheDocument(); // Time to First Review
    expect(screen.getByText('0m')).toBeInTheDocument(); // Time to Approval
  });

  it('formats duration correctly for different time ranges', () => {
    const testData: ReviewAnalyticsData = {
      totalReviews: 5,
      averageReviewsPerPR: 1.0,
      averageTimeToFirstReview: 0.5, // 30 minutes
      averageTimeToApproval: 25.5, // 1 day 1.5 hours
      topReviewers: [
        {
          username: 'test-user',
          reviewCount: 5,
          approvalRate: 80.0,
          averageResponseTime: 72.0, // 3 days
          changeRequestRate: 20.0,
        },
      ],
      reviewPatterns: [],
    };

    render(
      <ReviewStatistics
        reviewData={testData}
        isLoading={false}
      />
    );

    expect(screen.getByText('30m')).toBeInTheDocument(); // 0.5 hours = 30 minutes
    expect(screen.getByText('1d 2h')).toBeInTheDocument(); // 25.5 hours = 1 day 1.5 hours (rounded to 2h)
    expect(screen.getByText('3d')).toBeInTheDocument(); // 72 hours = 3 days
  });

  it('displays rank information correctly', () => {
    render(
      <ReviewStatistics
        reviewData={mockReviewData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Rank #1')).toBeInTheDocument(); // alice
    expect(screen.getByText('Rank #2')).toBeInTheDocument(); // bob
    expect(screen.getByText('Rank #3')).toBeInTheDocument(); // charlie
    expect(screen.getByText('Rank #4')).toBeInTheDocument(); // diana
    expect(screen.getByText('Rank #5')).toBeInTheDocument(); // eve
  });

  it('handles empty review patterns correctly', () => {
    const noPatternData: ReviewAnalyticsData = {
      ...mockReviewData,
      reviewPatterns: [],
    };

    render(
      <ReviewStatistics
        reviewData={noPatternData}
        isLoading={false}
      />
    );

    // Should still render other components but not the timeline
    expect(screen.getByText('Code Review Statistics')).toBeInTheDocument();
    expect(screen.getByText('Top Reviewers by Activity')).toBeInTheDocument();
    expect(screen.getByText('Review Distribution')).toBeInTheDocument();
    
    // Timeline should not be rendered when no pattern data
    expect(screen.queryByText('Review Activity Timeline')).not.toBeInTheDocument();
  });
});