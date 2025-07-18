import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BranchPRStats } from './BranchPRStats';
import * as githubApi from '@/lib/github-api';

// Mock all the sub-components
jest.mock('./BranchPRFilter', () => ({
  BranchPRFilter: ({ selectedPeriod, onPeriodChange, isLoading }: any) => (
    <div data-testid="branch-pr-filter">
      <span>Period: {selectedPeriod}</span>
      <button onClick={() => onPeriodChange('90d')} disabled={isLoading}>
        Change Period
      </button>
    </div>
  ),
}));

jest.mock('./BranchStatistics', () => ({
  BranchStatistics: ({ branches, isLoading, timePeriod }: any) => (
    <div data-testid="branch-statistics">
      <span>Branches: {branches.length}</span>
      <span>Loading: {isLoading.toString()}</span>
      <span>Period: {timePeriod}</span>
    </div>
  ),
}));

jest.mock('./PRAnalytics', () => ({
  PRAnalytics: ({ pullRequests, isLoading, timePeriod }: any) => (
    <div data-testid="pr-analytics">
      <span>PRs: {pullRequests.length}</span>
      <span>Loading: {isLoading.toString()}</span>
      <span>Period: {timePeriod}</span>
    </div>
  ),
}));

jest.mock('./PRTimeline', () => ({
  PRTimeline: ({ timelineData, timePeriod, isLoading }: any) => (
    <div data-testid="pr-timeline">
      <span>Timeline: {timelineData.length}</span>
      <span>Period: {timePeriod}</span>
      <span>Loading: {isLoading.toString()}</span>
    </div>
  ),
}));

jest.mock('./ReviewStatistics', () => ({
  ReviewStatistics: ({ reviewData, isLoading }: any) => (
    <div data-testid="review-statistics">
      <span>Reviews: {reviewData.totalReviews}</span>
      <span>Loading: {isLoading.toString()}</span>
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
    { number: 1, title: 'PR 1', state: 'open' },
    { number: 2, title: 'PR 2', state: 'merged' },
    { number: 3, title: 'PR 3', state: 'closed' },
  ],
};

const mockReviewsData = {
  data: [
    { id: 1, state: 'APPROVED', user: { login: 'reviewer1' } },
    { id: 2, state: 'CHANGES_REQUESTED', user: { login: 'reviewer2' } },
  ],
};

const mockAnalysisResult = {
  branches: {
    totalBranches: 3,
    activeBranches: 2,
    mergedBranches: 1,
    staleBranches: 0,
    branches: [
      { name: 'main', status: 'active', lastCommitDate: '2024-01-01' },
      { name: 'feature-1', status: 'active', lastCommitDate: '2024-01-02' },
      { name: 'feature-2', status: 'merged', lastCommitDate: '2024-01-03' },
    ],
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
    pullRequests: [
      { number: 1, title: 'PR 1', state: 'open' },
      { number: 2, title: 'PR 2', state: 'merged' },
      { number: 3, title: 'PR 3', state: 'closed' },
    ],
    timeline: [
      { date: '2024-01-01', opened: 1, merged: 0, closed: 0 },
      { date: '2024-01-02', opened: 0, merged: 1, closed: 0 },
      { date: '2024-01-03', opened: 0, merged: 0, closed: 1 },
    ],
    topContributors: [],
  },
  reviews: {
    totalReviews: 5,
    averageReviewsPerPR: 1.7,
    averageTimeToFirstReview: 8,
    averageTimeToApproval: 16,
    topReviewers: [
      { username: 'reviewer1', reviewCount: 3, approvalRate: 80, averageResponseTime: 6, changeRequestRate: 20 },
      { username: 'reviewer2', reviewCount: 2, approvalRate: 60, averageResponseTime: 10, changeRequestRate: 40 },
    ],
    reviewPatterns: [],
  },
  analysisDate: '2024-01-01T00:00:00.000Z',
  timePeriod: '30d' as const,
};

describe('BranchPRStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockFetchRepository.mockResolvedValue(mockRepositoryData);
    mockFetchBranches.mockResolvedValue(mockBranchesData);
    mockFetchPullRequests.mockResolvedValue(mockPullRequestsData);
    mockFetchPRReviews.mockResolvedValue(mockReviewsData);
    mockGenerateBranchPRAnalysis.mockReturnValue(mockAnalysisResult);
  });

  it('renders the main component with header', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    expect(screen.getByText('Branch & Pull Request Analytics')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive insights into development workflow and collaboration patterns')).toBeInTheDocument();
  });

  it('renders all sub-components', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-pr-filter')).toBeInTheDocument();
      expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
      expect(screen.getByTestId('pr-analytics')).toBeInTheDocument();
      expect(screen.getByTestId('pr-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('review-statistics')).toBeInTheDocument();
    });
  });

  it('fetches data on mount', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(mockFetchRepository).toHaveBeenCalledWith('testowner', 'testrepo');
      expect(mockFetchBranches).toHaveBeenCalledWith('testowner', 'testrepo', 1, 100);
      expect(mockFetchPullRequests).toHaveBeenCalledWith('testowner', 'testrepo', 'all', 1, 100);
    });
  });

  it('passes correct data to sub-components', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Branches: 3')).toBeInTheDocument();
      expect(screen.getByText('PRs: 3')).toBeInTheDocument();
      expect(screen.getByText('Timeline: 3')).toBeInTheDocument();
      expect(screen.getByText('Reviews: 5')).toBeInTheDocument();
    });
  });

  it('shows loading states correctly', async () => {
    // Make API calls hang to test loading state
    mockFetchRepository.mockImplementation(() => new Promise(() => {}));
    
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    expect(screen.getByText('Loading Analytics...')).toBeInTheDocument();
    expect(screen.getByText('• Fetching branches')).toBeInTheDocument();
    expect(screen.getByText('• Fetching pull requests')).toBeInTheDocument();
    expect(screen.getByText('• Fetching reviews')).toBeInTheDocument();
  });

  it('handles repository fetch error', async () => {
    mockFetchRepository.mockResolvedValue({ error: 'Repository not found' });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText('• Repository not found')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('handles branches fetch error', async () => {
    mockFetchBranches.mockResolvedValue({ error: 'Failed to fetch branches' });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText('• Branches: Failed to fetch branches')).toBeInTheDocument();
    });
  });

  it('handles pull requests fetch error', async () => {
    mockFetchPullRequests.mockResolvedValue({ error: 'Failed to fetch pull requests' });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText('• Pull Requests: Failed to fetch pull requests')).toBeInTheDocument();
    });
  });

  it('shows rate limit warning', async () => {
    mockFetchBranches.mockResolvedValue({
      ...mockBranchesData,
      rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 },
    });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('API Rate Limit Warning')).toBeInTheDocument();
      expect(screen.getByText(/Approaching GitHub API rate limits/)).toBeInTheDocument();
    });
  });

  it('handles time period changes', async () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Period: 30d')).toBeInTheDocument();
    });

    // Change time period
    fireEvent.click(screen.getByText('Change Period'));

    await waitFor(() => {
      expect(screen.getByText('Period: 90d')).toBeInTheDocument();
    });

    // Should refetch data with new period
    expect(mockFetchRepository).toHaveBeenCalledTimes(2);
  });

  it('shows empty state when no data available', async () => {
    const emptyAnalysisResult = {
      ...mockAnalysisResult,
      branches: { ...mockAnalysisResult.branches, totalBranches: 0 },
      pullRequests: { ...mockAnalysisResult.pullRequests, totalPRs: 0 },
    };
    mockGenerateBranchPRAnalysis.mockReturnValue(emptyAnalysisResult);

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('No Data Available')).toBeInTheDocument();
      expect(screen.getByText('This repository doesn\'t have enough branch or pull request activity to generate analytics.')).toBeInTheDocument();
    });
  });

  it('handles retry functionality', async () => {
    mockFetchRepository.mockResolvedValueOnce({ error: 'Network error' });
    mockFetchRepository.mockResolvedValueOnce(mockRepositoryData);

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('Branches: 3')).toBeInTheDocument();
    });

    expect(mockFetchRepository).toHaveBeenCalledTimes(2);
  });

  it('uses initial time period prop', () => {
    render(<BranchPRStats owner="testowner" repo="testrepo" initialTimePeriod="1y" />);

    expect(screen.getByText('Period: 1y')).toBeInTheDocument();
  });

  it('limits API calls to prevent excessive usage', async () => {
    // Mock many pages of data
    const manyBranches = Array.from({ length: 100 }, (_, i) => ({
      name: `branch-${i}`,
      commit: { sha: `sha-${i}` },
    }));

    mockFetchBranches
      .mockResolvedValueOnce({ data: manyBranches })
      .mockResolvedValueOnce({ data: manyBranches })
      .mockResolvedValueOnce({ data: manyBranches });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByTestId('branch-statistics')).toBeInTheDocument();
    });

    // Should limit to reasonable number of API calls
    expect(mockFetchBranches).toHaveBeenCalledTimes(3);
  });

  it('handles review data fetching for recent PRs only', async () => {
    const manyPRs = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `PR ${i + 1}`,
      state: 'open',
    }));

    mockFetchPullRequests.mockResolvedValue({ data: manyPRs });

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByTestId('review-statistics')).toBeInTheDocument();
    });

    // Should only fetch reviews for first 50 PRs to avoid rate limits
    expect(mockFetchPRReviews).toHaveBeenCalledTimes(50);
  });

  it('passes loading states correctly to sub-components', async () => {
    // Make branches loading hang
    mockFetchBranches.mockImplementation(() => new Promise(() => {}));

    render(<BranchPRStats owner="testowner" repo="testrepo" />);

    await waitFor(() => {
      expect(screen.getByText('Loading: true')).toBeInTheDocument();
    });
  });
});