import { render, screen, waitFor } from '@testing-library/react';
import { BranchPRStats } from './BranchPRStats';
import * as githubApi from '@/lib/github-api';

// Mock performance monitoring
const mockPerformanceMonitor = {
  startTimer: jest.fn(() => ({ stop: jest.fn(() => 1000) })),
  measureMemory: jest.fn(() => Promise.resolve(50 * 1024 * 1024)), // 50MB
  trackDataPoints: jest.fn(),
};

jest.mock('@/lib/performance-monitor', () => ({
  PerformanceMonitor: jest.fn(() => mockPerformanceMonitor),
}));

// Mock all the sub-components
jest.mock('./BranchPRFilter', () => ({
  BranchPRFilter: ({ selectedPeriod }: any) => (
    <div data-testid="branch-pr-filter">Filter: {selectedPeriod}</div>
  ),
}));

jest.mock('./BranchStatistics', () => ({
  BranchStatistics: ({ branches }: any) => (
    <div data-testid="branch-statistics">
      Branches: {branches?.length || 0}
    </div>
  ),
}));

jest.mock('./PRAnalytics', () => ({
  PRAnalytics: ({ pullRequests }: any) => (
    <div data-testid="pr-analytics">
      PRs: {pullRequests?.length || 0}
    </div>
  ),
}));

jest.mock('./PRTimeline', () => ({
  PRTimeline: ({ timelineData }: any) => (
    <div data-testid="pr-timeline">
      Timeline: {timelineData?.length || 0} points
    </div>
  ),
}));

jest.mock('./ReviewStatistics', () => ({
  ReviewStatistics: ({ reviewData }: any) => (
    <div data-testid="review-statistics">
      Reviews: {reviewData?.totalReviews || 0}
    </div>
  ),
}));

// Mock GitHub API functions
const mockFetchRepository = jest.fn();
const mockFetchBranches = jest.fn();
const mockFetchPullRequests = jest.fn();
const mockFetchPRReviews = jest.fn();
const mockGenerateBranchPRAnalysis = jest.fn();

jest.mock('@/lib/github-api', () => ({
  ...jest.requireActual('@/lib/github-api'),
  fetchRepository: (...args: any[]) => mockFetchRepository(...args),
  fetchBranches: (...args: any[]) => mockFetchBranches(...args),
  fetchPullRequests: (...args: any[]) => mockFetchPullRequests(...args),
  fetchPRReviews: (...args: any[]) => mockFetchPRReviews(...args),
  generateBranchPRAnalysis: (...args: any[]) => mockGenerateBranchPRAnalysis(...args),
}));

// Generate large dataset for performance testing
const generateLargeDataset = (size: number) => {
  const branches = Array.from({ length: size }, (_, i) => ({
    name: `branch-${i}`,
    status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'merged' : 'stale',
    lastCommitDate: new Date(Date.now() - i * 86400000).toISOString(),
  }));

  const pullRequests = Array.from({ length: size }, (_, i) => ({
    number: i + 1,
    title: `PR ${i + 1}`,
    state: i % 3 === 0 ? 'open' : i % 3 === 1 ? 'merged' : 'closed',
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    merged_at: i % 3 === 1 ? new Date(Date.now() - i * 86400000 + 3600000).toISOString() : null,
  }));

  const timeline = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
    opened: Math.floor(Math.random() * 10),
    merged: Math.floor(Math.random() * 8),
    closed: Math.floor(Math.random() * 5),
  }));

  const reviews = Array.from({ length: size * 2 }, (_, i) => ({
    id: i + 1,
    user: { login: `reviewer-${i % 10}` },
    state: i % 3 === 0 ? 'APPROVED' : i % 3 === 1 ? 'CHANGES_REQUESTED' : 'COMMENTED',
    submitted_at: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  return { branches, pullRequests, timeline, reviews };
};

const mockRepositoryData = {
  data: {
    default_branch: 'main',
    name: 'test-repo',
    full_name: 'owner/test-repo',
  },
};

describe('BranchPRStats Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchRepository.mockResolvedValue(mockRepositoryData);
  });

  it('should handle small datasets efficiently', async () => {
    const smallDataset = generateLargeDataset(10);
    
    mockFetchBranches.mockResolvedValue({ data: smallDataset.branches });
    mockFetchPullRequests.mockResolvedValue({ data: smallDataset.pullRequests });
    mockFetchPRReviews.mockResolvedValue({ data: smallDataset.reviews });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: smallDataset.branches.length,
        branches: smallDataset.branches,
        branchActivity: [],
        activeBranches: 4,
        mergedBranches: 3,
        staleBranches: 3,
      },
      pullRequests: {
        totalPRs: smallDataset.pullRequests.length,
        pullRequests: smallDataset.pullRequests,
        timeline: smallDataset.timeline,
        openPRs: 4,
        closedPRs: 3,
        mergedPRs: 3,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: smallDataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    const startTime = performance.now();
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render small datasets quickly (under 100ms)
    expect(renderTime).toBeLessThan(100);
    
    // Should track performance metrics
    expect(mockPerformanceMonitor.startTimer).toHaveBeenCalled();
    expect(mockPerformanceMonitor.trackDataPoints).toHaveBeenCalledWith(
      smallDataset.branches.length + smallDataset.pullRequests.length + smallDataset.reviews.length
    );
  });

  it('should handle medium datasets with good performance', async () => {
    const mediumDataset = generateLargeDataset(100);
    
    mockFetchBranches.mockResolvedValue({ data: mediumDataset.branches });
    mockFetchPullRequests.mockResolvedValue({ data: mediumDataset.pullRequests });
    mockFetchPRReviews.mockResolvedValue({ data: mediumDataset.reviews });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: mediumDataset.branches.length,
        branches: mediumDataset.branches,
        branchActivity: [],
        activeBranches: 34,
        mergedBranches: 33,
        staleBranches: 33,
      },
      pullRequests: {
        totalPRs: mediumDataset.pullRequests.length,
        pullRequests: mediumDataset.pullRequests,
        timeline: mediumDataset.timeline,
        openPRs: 34,
        closedPRs: 33,
        mergedPRs: 33,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: mediumDataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    const startTime = performance.now();
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render medium datasets reasonably quickly (under 500ms)
    expect(renderTime).toBeLessThan(500);
    
    // Should show performance metrics
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });
  });

  it('should handle large datasets with reduced scope optimization', async () => {
    const largeDataset = generateLargeDataset(1000);
    
    // Mock large repository
    mockFetchRepository.mockResolvedValue({
      data: {
        ...mockRepositoryData.data,
        size: 150000, // Large repository
      },
    });
    
    mockFetchBranches.mockResolvedValue({ data: largeDataset.branches });
    mockFetchPullRequests.mockResolvedValue({ data: largeDataset.pullRequests });
    mockFetchPRReviews.mockResolvedValue({ data: largeDataset.reviews });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: largeDataset.branches.length,
        branches: largeDataset.branches.slice(0, 100), // Reduced scope
        branchActivity: [],
        activeBranches: 334,
        mergedBranches: 333,
        staleBranches: 333,
      },
      pullRequests: {
        totalPRs: largeDataset.pullRequests.length,
        pullRequests: largeDataset.pullRequests.slice(0, 100), // Reduced scope
        timeline: largeDataset.timeline,
        openPRs: 334,
        closedPRs: 333,
        mergedPRs: 333,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: largeDataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show large repository warning
    await waitFor(() => {
      expect(screen.getByText('Large Repository Detected')).toBeInTheDocument();
    });
    
    // Should show reduced scope option
    expect(screen.getByLabelText('Use reduced scope (faster analysis)')).toBeInTheDocument();
    
    // Should track large dataset performance
    expect(mockPerformanceMonitor.trackDataPoints).toHaveBeenCalledWith(
      expect.any(Number)
    );
  });

  it('should measure and display memory usage', async () => {
    const dataset = generateLargeDataset(50);
    
    mockFetchBranches.mockResolvedValue({ data: dataset.branches });
    mockFetchPullRequests.mockResolvedValue({ data: dataset.pullRequests });
    mockFetchPRReviews.mockResolvedValue({ data: dataset.reviews });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: dataset.branches.length,
        branches: dataset.branches,
        branchActivity: [],
        activeBranches: 17,
        mergedBranches: 16,
        staleBranches: 17,
      },
      pullRequests: {
        totalPRs: dataset.pullRequests.length,
        pullRequests: dataset.pullRequests,
        timeline: dataset.timeline,
        openPRs: 17,
        closedPRs: 16,
        mergedPRs: 17,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: dataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    });
    
    // Should display memory usage
    expect(screen.getByText('50.0 MB')).toBeInTheDocument();
    
    // Should call memory measurement
    expect(mockPerformanceMonitor.measureMemory).toHaveBeenCalled();
  });

  it('should handle API rate limiting gracefully', async () => {
    const dataset = generateLargeDataset(20);
    
    // Mock rate limit response
    mockFetchBranches.mockResolvedValue({
      data: dataset.branches,
      rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 },
    });
    mockFetchPullRequests.mockResolvedValue({
      data: dataset.pullRequests,
      rateLimit: { remaining: 5, reset: Date.now() + 3600000, limit: 5000 },
    });
    mockFetchPRReviews.mockResolvedValue({
      data: dataset.reviews,
      rateLimit: { remaining: 2, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: dataset.branches.length,
        branches: dataset.branches,
        branchActivity: [],
        activeBranches: 7,
        mergedBranches: 6,
        staleBranches: 7,
      },
      pullRequests: {
        totalPRs: dataset.pullRequests.length,
        pullRequests: dataset.pullRequests,
        timeline: dataset.timeline,
        openPRs: 7,
        closedPRs: 6,
        mergedPRs: 7,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: dataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show rate limit warning
    await waitFor(() => {
      expect(screen.getByText('API Rate Limit Warning')).toBeInTheDocument();
    });
    
    // Should still render data
    expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
  });

  it('should optimize rendering with React.memo and useMemo', async () => {
    const dataset = generateLargeDataset(30);
    
    mockFetchBranches.mockResolvedValue({ data: dataset.branches });
    mockFetchPullRequests.mockResolvedValue({ data: dataset.pullRequests });
    mockFetchPRReviews.mockResolvedValue({ data: dataset.reviews });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: dataset.branches.length,
        branches: dataset.branches,
        branchActivity: [],
        activeBranches: 10,
        mergedBranches: 10,
        staleBranches: 10,
      },
      pullRequests: {
        totalPRs: dataset.pullRequests.length,
        pullRequests: dataset.pullRequests,
        timeline: dataset.timeline,
        openPRs: 10,
        closedPRs: 10,
        mergedPRs: 10,
        averageTimeToMerge: 24,
        averageReviewTime: 12,
        averagePRSize: 100,
        topContributors: [],
      },
      reviews: {
        totalReviews: dataset.reviews.length,
        averageReviewsPerPR: 2,
        averageTimeToFirstReview: 8,
        averageTimeToApproval: 16,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });

    const { rerender } = render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
    });
    
    const initialRenderCount = mockGenerateBranchPRAnalysis.mock.calls.length;
    
    // Re-render with same props - should not trigger new analysis
    rerender(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should not call analysis again due to memoization
    expect(mockGenerateBranchPRAnalysis.mock.calls.length).toBe(initialRenderCount);
  });
});