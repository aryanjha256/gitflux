import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { ContributorTrendlines } from './ContributorTrendlines';
import type { ContributorTrendData } from '@/lib/commit-activity-data';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the GitHub API
const mockFetchCommitsWithFiles = vi.fn();
vi.mock('@/lib/github-api', () => ({
  fetchCommitsWithFiles: mockFetchCommitsWithFiles,
}));

// Mock Recharts components to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: any) => (
    <div data-testid={`line-${dataKey}`} data-stroke={stroke} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

describe('ContributorTrendlines', () => {
  const mockProps = {
    owner: 'test-owner',
    repo: 'test-repo',
    timeRange: '30d' as const,
  };

  const mockContributorData: ContributorTrendData[] = [
    {
      contributor: 'alice',
      avatar: 'https://github.com/alice.png',
      dataPoints: [
        { date: '2024-01-01', commitCount: 5, trend: 'up' },
        { date: '2024-01-02', commitCount: 8, trend: 'up' },
        { date: '2024-01-03', commitCount: 3, trend: 'down' },
      ],
    },
    {
      contributor: 'bob',
      avatar: 'https://github.com/bob.png',
      dataPoints: [
        { date: '2024-01-01', commitCount: 2, trend: 'stable' },
        { date: '2024-01-02', commitCount: 4, trend: 'up' },
        { date: '2024-01-03', commitCount: 6, trend: 'up' },
      ],
    },
    {
      contributor: 'charlie',
      avatar: 'https://github.com/charlie.png',
      dataPoints: [
        { date: '2024-01-01', commitCount: 10, trend: 'stable' },
        { date: '2024-01-02', commitCount: 7, trend: 'down' },
        { date: '2024-01-03', commitCount: 4, trend: 'down' },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: [
        {
          sha: 'abc123',
          author: 'alice',
          date: '2024-01-01T10:00:00Z',
          message: 'Test commit',
          files: [],
        },
        {
          sha: 'def456',
          author: 'bob',
          date: '2024-01-02T10:00:00Z',
          message: 'Another commit',
          files: [],
        },
      ],
    });
  });

  describe('Rendering', () => {
    it('renders with provided data', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByText('Contributor Trends')).toBeInTheDocument();
      expect(screen.getByText('3 contributors • 3 active')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('shows loading state initially when no data provided', () => {
      render(<ContributorTrendlines {...mockProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /loading contributor trend data/i })).toBeInTheDocument();
    });

    it('renders chart components correctly', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });

    it('renders lines for each contributor', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByTestId('line-alice')).toBeInTheDocument();
      expect(screen.getByTestId('line-bob')).toBeInTheDocument();
      expect(screen.getByTestId('line-charlie')).toBeInTheDocument();
    });
  });

  describe('Legend Functionality', () => {
    it('renders interactive legend with contributor names', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByRole('button', { name: /toggle alice visibility/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle bob visibility/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle charlie visibility/i })).toBeInTheDocument();
    });

    it('shows commit counts in legend', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      // Alice: 5 + 8 + 3 = 16 commits
      expect(screen.getByText('(16)')).toBeInTheDocument();
      // Bob: 2 + 4 + 6 = 12 commits
      expect(screen.getByText('(12)')).toBeInTheDocument();
      // Charlie: 10 + 7 + 4 = 21 commits
      expect(screen.getByText('(21)')).toBeInTheDocument();
    });

    it('shows trend indicators in legend', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      // Should show trend arrows for contributors with trends
      const trendIndicators = screen.getAllByText(/[↗↘]/);
      expect(trendIndicators.length).toBeGreaterThan(0);
    });

    it('toggles contributor visibility when legend item is clicked', async () => {
      const user = userEvent.setup();
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      const aliceButton = screen.getByRole('button', { name: /toggle alice visibility/i });
      
      // Initially visible
      expect(aliceButton).toHaveClass('bg-gray-100');
      
      // Click to hide
      await user.click(aliceButton);
      
      // Should be hidden (different styling)
      expect(aliceButton).toHaveClass('bg-gray-50');
    });
  });

  describe('Error Handling', () => {
    it('displays error state when API fails', async () => {
      mockFetchCommitsWithFiles.mockResolvedValue({
        error: 'API rate limit exceeded',
      });

      render(<ContributorTrendlines {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading contributor trends')).toBeInTheDocument();
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('displays error state when network fails', async () => {
      mockFetchCommitsWithFiles.mockRejectedValue(new Error('Network error'));

      render(<ContributorTrendlines {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading contributor trends')).toBeInTheDocument();
        expect(screen.getByText('An unexpected error occurred while fetching commit data')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('displays empty state when no contributors', () => {
      render(<ContributorTrendlines {...mockProps} data={[]} />);
      
      expect(screen.getByText('No contributor data')).toBeInTheDocument();
      expect(screen.getByText('No contributor activity found for the selected time period.')).toBeInTheDocument();
    });

    it('displays empty state when API returns no data', async () => {
      mockFetchCommitsWithFiles.mockResolvedValue({
        data: [],
      });

      render(<ContributorTrendlines {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No contributor data')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      // Component should render without errors on mobile
      expect(screen.getByText('Contributor Trends')).toBeInTheDocument();
    });

    it('handles window resize events', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      // Trigger resize event
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });
      
      fireEvent(window, new Event('resize'));
      
      // Component should still be functional
      expect(screen.getByText('Contributor Trends')).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('processes time range correctly', async () => {
      render(<ContributorTrendlines {...mockProps} timeRange="3m" />);
      
      await waitFor(() => {
        expect(mockFetchCommitsWithFiles).toHaveBeenCalledWith(
          'test-owner',
          'test-repo',
          expect.any(String), // since date
          expect.any(String), // until date
          1,
          100,
          { maxCommits: 1000 }
        );
      });
    });

    it('transforms chart data correctly', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      const chartElement = screen.getByTestId('line-chart');
      const chartData = JSON.parse(chartElement.getAttribute('data-chart-data') || '[]');
      
      // Should have data points for each unique date
      expect(chartData).toHaveLength(3);
      expect(chartData[0]).toHaveProperty('date', '2024-01-01');
      expect(chartData[0]).toHaveProperty('alice', 5);
      expect(chartData[0]).toHaveProperty('bob', 2);
      expect(chartData[0]).toHaveProperty('charlie', 10);
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByRole('img', { name: /contributor trends chart/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle alice visibility.*16 total commits/i })).toBeInTheDocument();
    });

    it('includes screen reader accessible summary', () => {
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      expect(screen.getByText('Contributor Trends Summary')).toBeInTheDocument();
      expect(screen.getByText(/This chart shows commit trends for 3 contributors/)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ContributorTrendlines {...mockProps} data={mockContributorData} />);
      
      // Tab to chart
      await user.tab();
      expect(screen.getByRole('img', { name: /contributor trends chart/i })).toHaveFocus();
      
      // Tab to legend buttons
      await user.tab();
      expect(screen.getByRole('button', { name: /toggle alice visibility/i })).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', () => {
      const largeDataset: ContributorTrendData[] = Array.from({ length: 50 }, (_, i) => ({
        contributor: `contributor-${i}`,
        dataPoints: Array.from({ length: 30 }, (_, j) => ({
          date: `2024-01-${String(j + 1).padStart(2, '0')}`,
          commitCount: Math.floor(Math.random() * 10),
          trend: 'stable' as const,
        })),
      }));

      const { container } = render(<ContributorTrendlines {...mockProps} data={largeDataset} />);
      
      // Should render without performance issues
      expect(container).toBeInTheDocument();
      expect(screen.getByText('50 contributors • 50 active')).toBeInTheDocument();
    });

    it('limits legend display to top contributors', () => {
      const manyContributors: ContributorTrendData[] = Array.from({ length: 20 }, (_, i) => ({
        contributor: `contributor-${i}`,
        dataPoints: [
          { date: '2024-01-01', commitCount: 20 - i, trend: 'stable' }, // Descending order
        ],
      }));

      render(<ContributorTrendlines {...mockProps} data={manyContributors} />);
      
      // Should show message about additional contributors
      expect(screen.getByText(/Showing top 15 contributors. 5 more contributors in data./)).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('fetches and processes real API data', async () => {
      mockFetchCommitsWithFiles.mockResolvedValue({
        data: [
          {
            sha: 'abc123',
            author: 'alice',
            date: '2024-01-01T10:00:00Z',
            message: 'Test commit',
            files: [],
          },
          {
            sha: 'def456',
            author: 'alice',
            date: '2024-01-02T10:00:00Z',
            message: 'Another commit',
            files: [],
          },
          {
            sha: 'ghi789',
            author: 'bob',
            date: '2024-01-01T15:00:00Z',
            message: 'Bob commit',
            files: [],
          },
        ],
      });

      render(<ContributorTrendlines {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/contributors •.*active/)).toBeInTheDocument();
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('handles API rate limiting gracefully', async () => {
      mockFetchCommitsWithFiles.mockResolvedValue({
        error: 'GitHub API rate limit exceeded. Please try again later.',
        rateLimit: {
          remaining: 0,
          reset: Date.now() / 1000 + 3600,
          limit: 5000,
        },
      });

      render(<ContributorTrendlines {...mockProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading contributor trends')).toBeInTheDocument();
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });
    });
  });
});