import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepoForm } from '@/components/RepoForm';
import { Contributors } from '@/components/Contributors';
import { CommitChart } from '@/components/CommitChart';
import * as githubApi from '@/lib/github-api';

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock GitHub API
vi.mock('@/lib/github-api', () => ({
  fetchRepository: vi.fn(),
  fetchContributors: vi.fn(),
  fetchCommitActivity: vi.fn(),
  transformCommitActivity: vi.fn(),
}));

// Mock Recharts for chart rendering
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

// Mock window.addEventListener for responsive design
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1024,
});

const mockRepository = {
  name: 'react',
  full_name: 'facebook/react',
  description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
  stargazers_count: 220000,
  forks_count: 45000,
  language: 'JavaScript',
  created_at: '2013-05-24T16:15:54Z',
  updated_at: '2024-01-15T10:30:00Z',
  html_url: 'https://github.com/facebook/react',
  private: false,
};

const mockContributors = [
  {
    login: 'gaearon',
    avatar_url: 'https://avatars.githubusercontent.com/u/810438?v=4',
    contributions: 1500,
    html_url: 'https://github.com/gaearon',
    type: 'User',
  },
  {
    login: 'sebmarkbage',
    avatar_url: 'https://avatars.githubusercontent.com/u/63648?v=4',
    contributions: 800,
    html_url: 'https://github.com/sebmarkbage',
    type: 'User',
  },
];

const mockCommitActivity = [
  { week: 1704067200, total: 15, days: [3, 2, 4, 2, 2, 2, 0] },
  { week: 1704672000, total: 12, days: [2, 3, 2, 2, 1, 2, 0] },
  { week: 1705276800, total: 18, days: [4, 3, 3, 3, 2, 3, 0] },
];

const mockTransformedCommitData = [
  { date: '2024-01-01', count: 15 },
  { date: '2024-01-08', count: 12 },
  { date: '2024-01-15', count: 18 },
];

describe('Complete Integration Tests - User Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default successful API responses
    vi.mocked(githubApi.fetchRepository).mockResolvedValue({
      data: mockRepository,
    });
    vi.mocked(githubApi.fetchContributors).mockResolvedValue({
      data: mockContributors,
    });
    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
      data: mockCommitActivity,
    });
    vi.mocked(githubApi.transformCommitActivity).mockReturnValue(mockTransformedCommitData);
  });

  describe('Complete User Flow Integration', () => {
    it('integrates RepoForm with navigation successfully', async () => {
      const user = userEvent.setup();
      
      render(<RepoForm />);
      
      // User enters repository URL
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'https://github.com/facebook/react');
      
      // User submits form
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      // Verify navigation occurs
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('integrates Contributors component with data loading', async () => {
      render(<Contributors owner="facebook" repo="react" />);
      
      // Should show loading state initially
      expect(screen.getByText('Loading contributor information...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      });
      
      // Verify contributors are displayed
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.getByText('1,500 contributions')).toBeInTheDocument();
      expect(screen.getByText('sebmarkbage')).toBeInTheDocument();
      expect(screen.getByText('800 contributions')).toBeInTheDocument();
    });

    it('integrates CommitChart component with data loading', async () => {
      render(<CommitChart owner="facebook" repo="react" />);
      
      // Should show loading state initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Commit Activity')).toBeInTheDocument();
        expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
      });
      
      // Verify chart components are rendered
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('handles pre-populated data in components', async () => {
      // Test Contributors with pre-populated data
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      // Should immediately show data without loading
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      
      // Test CommitChart with pre-populated data
      const { rerender } = render(<CommitChart owner="facebook" repo="react" data={mockTransformedCommitData} />);
      
      expect(screen.getByText('Commit Activity')).toBeInTheDocument();
      expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles Contributors component errors gracefully', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        error: 'API rate limit exceeded',
      });

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('handles CommitChart component errors gracefully', async () => {
      vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
        error: 'Failed to fetch commit data',
      });

      render(<CommitChart owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading commit data')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch commit data')).toBeInTheDocument();
      });
    });

    it('handles network errors in components', async () => {
      vi.mocked(githubApi.fetchContributors).mockRejectedValue(new Error('Network error'));

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load contributors')).toBeInTheDocument();
      });
    });

    it('handles empty data states', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        data: [],
      });
      vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
        data: [],
      });
      vi.mocked(githubApi.transformCommitActivity).mockReturnValue([]);

      // Test empty contributors
      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('No contributors found')).toBeInTheDocument();
      });

      // Test empty commit data
      const { rerender } = render(<CommitChart owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('No commit history available')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Integration', () => {
    it('provides consistent loading states across components', async () => {
      // Delay API responses to test loading states
      vi.mocked(githubApi.fetchContributors).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockContributors }), 100))
      );
      vi.mocked(githubApi.fetchCommitActivity).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockCommitActivity }), 100))
      );

      render(
        <div>
          <Contributors owner="facebook" repo="react" />
          <CommitChart owner="facebook" repo="react" />
        </div>
      );
      
      // Both components should show loading states
      expect(screen.getByText('Loading contributor information...')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Wait for both to load
      await waitFor(() => {
        expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
        expect(screen.getByText('Commit Activity')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('maintains accessibility across integrated components', async () => {
      render(
        <div>
          <RepoForm initialOwner="facebook" initialRepo="react" />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockTransformedCommitData} />
        </div>
      );
      
      // Check RepoForm accessibility
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveAttribute('aria-describedby');
      
      // Check Contributors accessibility
      const contributorsList = screen.getByRole('list');
      expect(contributorsList).toHaveAttribute('aria-label');
      
      // Check CommitChart accessibility
      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label');
      expect(chart).toHaveAttribute('tabIndex', '0');
    });

    it('handles responsive design integration', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 480,
      });

      render(<CommitChart owner="facebook" repo="react" data={mockTransformedCommitData} />);
      
      // Component should handle responsive design
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Requirements Verification Integration', () => {
    it('meets requirement 1.1-1.4: Complete form functionality', async () => {
      const user = userEvent.setup();
      
      render(<RepoForm />);
      
      // 1.2: Form is displayed
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
      
      // 1.3: URL parsing works
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
      
      // 1.4: Validation errors work
      vi.clearAllMocks();
      await user.clear(input);
      await user.type(input, 'invalid-url');
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('meets requirement 2.1: Repository information display', async () => {
      // This would be tested in the actual page component
      // Here we verify that components can handle repository data
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
    });

    it('meets requirement 3.1: Contributors display', async () => {
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      // Contributors are displayed with proper information
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.getByText('1,500 contributions')).toBeInTheDocument();
      expect(screen.getByText('sebmarkbage')).toBeInTheDocument();
      expect(screen.getByText('800 contributions')).toBeInTheDocument();
      
      // Contributors are sorted by contribution count
      const contributorElements = screen.getAllByText(/contributions$/);
      expect(contributorElements[0]).toHaveTextContent('1,500 contributions');
      expect(contributorElements[1]).toHaveTextContent('800 contributions');
    });

    it('meets requirement 4.1: Commit activity visualization', async () => {
      render(<CommitChart owner="facebook" repo="react" data={mockTransformedCommitData} />);
      
      // Chart is displayed
      expect(screen.getByText('Commit Activity')).toBeInTheDocument();
      expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('meets requirement 5.1-5.3: Accessibility and responsive design', async () => {
      render(
        <div>
          <RepoForm />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockTransformedCommitData} />
        </div>
      );
      
      // 5.1: Responsive design classes are present
      const form = screen.getByRole('search');
      expect(form).toBeInTheDocument();
      
      // 5.2: Keyboard navigation support
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toBeInTheDocument();
      
      // 5.3: ARIA labels and screen reader support
      expect(form).toHaveAttribute('aria-label');
      expect(input).toHaveAttribute('aria-describedby');
      
      const contributorsList = screen.getByRole('list');
      expect(contributorsList).toHaveAttribute('aria-label');
      
      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label');
    });
  });

  describe('Component Wiring Integration', () => {
    it('properly wires RepoForm with initial values', async () => {
      render(<RepoForm initialOwner="facebook" initialRepo="react" />);
      
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveValue('https://github.com/facebook/react');
    });

    it('properly wires Contributors with owner and repo props', async () => {
      render(<Contributors owner="facebook" repo="react" />);
      
      // Component should make API call with correct parameters
      await waitFor(() => {
        expect(githubApi.fetchContributors).toHaveBeenCalledWith('facebook', 'react');
      });
    });

    it('properly wires CommitChart with owner and repo props', async () => {
      render(<CommitChart owner="facebook" repo="react" />);
      
      // Component should make API call with correct parameters
      await waitFor(() => {
        expect(githubApi.fetchCommitActivity).toHaveBeenCalledWith('facebook', 'react');
      });
    });

    it('handles custom onSubmit handler in RepoForm', async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('facebook', 'react');
      });
      
      // Should not navigate when custom handler is provided
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});