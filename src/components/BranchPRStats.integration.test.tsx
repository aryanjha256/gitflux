import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchPRStats } from './BranchPRStats';
import * as githubApi from '@/lib/github-api';

// Mock all the sub-components with realistic implementations
jest.mock('./BranchPRFilter', () => ({
  BranchPRFilter: ({ selectedPeriod, onPeriodChange, isLoading }: any) => (
    <div data-testid="branch-pr-filter">
      <label htmlFor="period-select">Time Period</label>
      <select 
        id="period-select"
        value={selectedPeriod}
        onChange={(e) => onPeriodChange(e.target.value)}
        disabled={isLoading}
      >
        <option value="7d">7 days</option>
        <option value="30d">30 days</option>
        <option value="90d">90 days</option>
        <option value="180d">180 days</option>
        <option value="365d">1 year</option>
      </select>
    </div>
  ),
}));

jest.mock('./BranchStatistics', () => ({
  BranchStatistics: ({ branches, isLoading, timePeriod }: any) => (
    <div data-testid="branch-statistics">
      <h3>Branch Statistics</h3>
      {isLoading ? (
        <div>Loading branches...</div>
      ) : (
        <div>
          <p>Total Branches: {branches?.totalBranches || 0}</p>
          <p>Active Branches: {branches?.activeBranches || 0}</p>
          <p>Time Period: {timePeriod}</p>
        </div>
      )}
    </div>
  ),
}));

jest.mock('./PRAnalytics', () => ({
  PRAnalytics: ({ pullRequests, isLoading, timePeriod }: any) => (
    <div data-testid="pr-analytics">
      <h3>Pull Request Analytics</h3>
      {isLoading ? (
        <div>Loading pull requests...</div>
      ) : (
        <div>
          <p>Total PRs: {pullRequests?.totalPRs || 0}</p>
          <p>Open PRs: {pullRequests?.openPRs || 0}</p>
          <p>Time Period: {timePeriod}</p>
        </div>
      )}
    </div>
  ),
}));

jest.mock('./PRTimeline', () => ({
  PRTimeline: ({ timelineData, isLoading, timePeriod }: any) => (
    <div data-testid="pr-timeline">
      <h3>Pull Request Timeline</h3>
      {isLoading ? (
        <div>Loading timeline...</div>
      ) : (
        <div>
          <p>Timeline Points: {timelineData?.length || 0}</p>
          <p>Time Period: {timePeriod}</p>
        </div>
      )}
    </div>
  ),
}));

jest.mock('./ReviewStatistics', () => ({
  ReviewStatistics: ({ reviewData, isLoading }: any) => (
    <div data-testid="review-statistics">
      <h3>Review Statistics</h3>
      {isLoading ? (
        <div>Loading reviews...</div>
      ) : (
        <div>
          <p>Total Reviews: {reviewData?.totalReviews || 0}</p>
          <p>Top Reviewers: {reviewData?.topReviewers?.length || 0}</p>
        </div>
      )}
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

const mockRepositoryData = {
  data: {
    default_branch: 'main',
    name: 'test-repo',
    full_name: 'owner/test-repo',
    size: 50000,
  },
};

const mockBranchesData = {
  data: [
    { name: 'main', commit: { sha: 'abc123' } },
    { name: 'feature-1', commit: { sha: 'def456' } },
    { name: 'feature-2', commit: { sha: 'ghi789' } },
  ],
};

const mockPullRequestsData = {
  data: [
    { number: 1, title: 'PR 1', state: 'open', created_at: '2024-01-01T00:00:00Z' },
    { number: 2, title: 'PR 2', state: 'merged', created_at: '2024-01-02T00:00:00Z', merged_at: '2024-01-03T00:00:00Z' },
    { number: 3, title: 'PR 3', state: 'closed', created_at: '2024-01-04T00:00:00Z' },
  ],
};

const mockReviewsData = {
  data: [
    { id: 1, user: { login: 'reviewer1' }, state: 'APPROVED', submitted_at: '2024-01-02T12:00:00Z' },
    { id: 2, user: { login: 'reviewer2' }, state: 'CHANGES_REQUESTED', submitted_at: '2024-01-03T10:00:00Z' },
    { id: 3, user: { login: 'reviewer1' }, state: 'APPROVED', submitted_at: '2024-01-04T14:00:00Z' },
  ],
};

const mockAnalysisResult = {
  branches: {
    totalBranches: 3,
    activeBranches: 2,
    mergedBranches: 1,
    staleBranches: 0,
    branches: mockBranchesData.data,
    branchActivity: [],
  },
  pullRequests: {
    totalPRs: 3,
    openPRs: 1,
    closedPRs: 1,
    mergedPRs: 1,
    averageTimeToMerge: 24,
    averageReviewTime: 12,
    averagePRSize: 100,
    pullRequests: mockPullRequestsData.data,
    timeline: [
      { date: '2024-01-01', opened: 1, merged: 0, closed: 0 },
      { date: '2024-01-02', opened: 1, merged: 0, closed: 0 },
      { date: '2024-01-03', opened: 0, merged: 1, closed: 0 },
      { date: '2024-01-04', opened: 1, merged: 0, closed: 1 },
    ],
    topContributors: [],
  },
  reviews: {
    totalReviews: 3,
    averageReviewsPerPR: 1,
    averageTimeToFirstReview: 8,
    averageTimeToApproval: 16,
    topReviewers: [
      { username: 'reviewer1', reviewCount: 2, approvalRate: 100, averageResponseTime: 6, changeRequestRate: 0 },
      { username: 'reviewer2', reviewCount: 1, approvalRate: 0, averageResponseTime: 10, changeRequestRate: 100 },
    ],
    reviewPatterns: [],
  },
  analysisDate: '2024-01-01T00:00:00.000Z',
  timePeriod: '30d' as const,
};

describe('BranchPRStats Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockFetchRepository.mockResolvedValue(mockRepositoryData);
    mockFetchBranches.mockResolvedValue(mockBranchesData);
    mockFetchPullRequests.mockResolvedValue(mockPullRequestsData);
    mockFetchPRReviews.mockResolvedValue(mockReviewsData);
    mockGenerateBranchPRAnalysis.mockReturnValue(mockAnalysisResult);
  });

  it('should complete full analysis workflow successfully', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show loading state initially
    expect(screen.getByText('Fetching repository information...')).toBeInTheDocument();
    
    // Should complete analysis and show all components
    await waitFor(() => {
      expect(screen.getByText('Branch Statistics')).toBeInTheDocument();
      expect(screen.getByText('Pull Request Analytics')).toBeInTheDocument();
      expect(screen.getByText('Pull Request Timeline')).toBeInTheDocument();
      expect(screen.getByText('Review Statistics')).toBeInTheDocument();
    });
    
    // Should show correct data
    expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    expect(screen.getByText('Total PRs: 3')).toBeInTheDocument();
    expect(screen.getByText('Timeline Points: 4')).toBeInTheDocument();
    expect(screen.getByText('Total Reviews: 3')).toBeInTheDocument();
    
    // Should show performance metrics
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    
    // Should call all API functions
    expect(mockFetchRepository).toHaveBeenCalledWith('testowner', 'testrepo');
    expect(mockFetchBranches).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Object));
    expect(mockFetchPullRequests).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Object));
    expect(mockFetchPRReviews).toHaveBeenCalledWith('testowner', 'testrepo', expect.any(Array));
    expect(mockGenerateBranchPRAnalysis).toHaveBeenCalled();
  });

  it('should handle time period changes correctly', async () => {
    const user = userEvent.setup();
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    });
    
    // Change time period
    const periodSelect = screen.getByLabelText('Time Period');
    await user.selectOptions(periodSelect, '90d');
    
    // Should trigger new analysis
    await waitFor(() => {
      expect(mockFetchRepository).toHaveBeenCalledTimes(2);
    });
    
    // Should update all components with new time period
    expect(screen.getAllByText('Time Period: 90d')).toHaveLength(3); // Branch, PR, Timeline components
  });

  it('should handle large repository workflow', async () => {
    const user = userEvent.setup();
    
    // Mock large repository
    mockFetchRepository.mockResolvedValue({
      data: {
        ...mockRepositoryData.data,
        size: 150000, // Large repository
      },
    });
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show large repository warning
    await waitFor(() => {
      expect(screen.getByText('Large Repository Detected')).toBeInTheDocument();
    });
    
    // Should show reduced scope option
    const checkbox = screen.getByLabelText('Use reduced scope (faster analysis)');
    expect(checkbox).toBeInTheDocument();
    
    // Toggle reduced scope
    await user.click(checkbox);
    
    // Should show reduced scope message
    expect(screen.getByText('Reduced scope: Analyzing fewer branches, PRs, and reviews for faster processing.')).toBeInTheDocument();
    
    // Should still complete analysis
    await waitFor(() => {
      expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    });
    
    // Performance metrics should show reduced scope
    expect(screen.getByText('Reduced')).toBeInTheDocument();
  });

  it('should handle error recovery workflow', async () => {
    const user = userEvent.setup();
    
    // Start with error
    mockFetchRepository.mockResolvedValue({ error: 'Repository not found' });
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    });
    
    // Should show retry button
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    
    // Fix the error and retry
    mockFetchRepository.mockResolvedValue(mockRepositoryData);
    await user.click(retryButton);
    
    // Should recover and show data
    await waitFor(() => {
      expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    });
    
    // Error should be gone
    expect(screen.queryByText('Error Loading Data')).not.toBeInTheDocument();
  });

  it('should handle partial error scenarios', async () => {
    // Repository succeeds, but branches fail
    mockFetchBranches.mockResolvedValue({ error: 'Failed to fetch branches' });
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    });
    
    // Should show specific error for branches
    expect(screen.getByText('• Branches: Failed to fetch branches')).toBeInTheDocument();
    
    // Should still show other components that succeeded
    expect(screen.getByText('Pull Request Analytics')).toBeInTheDocument();
    expect(screen.getByText('Review Statistics')).toBeInTheDocument();
  });

  it('should handle cancellation workflow', async () => {
    const user = userEvent.setup();
    
    // Mock slow API calls
    mockFetchRepository.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockRepositoryData), 1000)));
    mockFetchBranches.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockBranchesData), 1000)));
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByTitle('Cancel operation')).toBeInTheDocument();
    });
    
    // Cancel the operation
    const cancelButton = screen.getByTitle('Cancel operation');
    await user.click(cancelButton);
    
    // Should show cancellation message
    await waitFor(() => {
      expect(screen.getByText('Analysis was cancelled by user.')).toBeInTheDocument();
    });
    
    // Should not show loading anymore
    expect(screen.queryByTitle('Cancel operation')).not.toBeInTheDocument();
  });

  it('should handle rate limiting workflow', async () => {
    // Mock rate limit responses
    mockFetchBranches.mockResolvedValue({
      ...mockBranchesData,
      rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 },
    });
    mockFetchPullRequests.mockResolvedValue({
      ...mockPullRequestsData,
      rateLimit: { remaining: 5, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show rate limit warning
    await waitFor(() => {
      expect(screen.getByText('API Rate Limit Warning')).toBeInTheDocument();
    });
    
    // Should still complete analysis
    expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
  });

  it('should handle empty repository workflow', async () => {
    // Mock empty responses
    mockFetchBranches.mockResolvedValue({ data: [] });
    mockFetchPullRequests.mockResolvedValue({ data: [] });
    mockFetchPRReviews.mockResolvedValue({ data: [] });
    
    mockGenerateBranchPRAnalysis.mockReturnValue({
      branches: {
        totalBranches: 0,
        activeBranches: 0,
        mergedBranches: 0,
        staleBranches: 0,
        branches: [],
        branchActivity: [],
      },
      pullRequests: {
        totalPRs: 0,
        openPRs: 0,
        closedPRs: 0,
        mergedPRs: 0,
        averageTimeToMerge: 0,
        averageReviewTime: 0,
        averagePRSize: 0,
        pullRequests: [],
        timeline: [],
        topContributors: [],
      },
      reviews: {
        totalReviews: 0,
        averageReviewsPerPR: 0,
        averageTimeToFirstReview: 0,
        averageTimeToApproval: 0,
        topReviewers: [],
        reviewPatterns: [],
      },
      analysisDate: new Date().toISOString(),
      timePeriod: '30d' as const,
    });
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No Data Available')).toBeInTheDocument();
    });
    
    // Should show helpful message
    expect(screen.getByText('This repository doesn\'t have enough branch or pull request activity to generate analytics.')).toBeInTheDocument();
  });

  it('should maintain state consistency across re-renders', async () => {
    const { rerender } = render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    });
    
    const initialCallCount = mockFetchRepository.mock.calls.length;
    
    // Re-render with same props
    rerender(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Should not trigger new API calls
    expect(mockFetchRepository.mock.calls.length).toBe(initialCallCount);
    
    // Data should still be displayed
    expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
  });

  it('should handle prop changes correctly', async () => {
    const { rerender } = render(<BranchPRStats owner="testowner" repo="testrepo" />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Total Branches: 3')).toBeInTheDocument();
    });
    
    const initialCallCount = mockFetchRepository.mock.calls.length;
    
    // Change props
    rerender(<BranchPRStats owner="testowner" repo="newrepo" />);
    
    // Should trigger new API calls
    await waitFor(() => {
      expect(mockFetchRepository.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
    
    // Should call with new repo
    expect(mockFetchRepository).toHaveBeenLastCalledWith('testowner', 'newrepo');
  });
});