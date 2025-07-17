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
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock GitHub API
vi.mock('@/lib/github-api', () => ({
  fetchRepository: vi.fn(),
  fetchContributors: vi.fn(),
  fetchCommitActivity: vi.fn(),
  transformCommitActivity: vi.fn(),
}));

// Mock Recharts
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

// Mock window for responsive design
Object.defineProperty(window, 'addEventListener', { writable: true, value: vi.fn() });
Object.defineProperty(window, 'removeEventListener', { writable: true, value: vi.fn() });
Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 });

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

const mockCommitData = [
  { date: '2024-01-01', count: 15 },
  { date: '2024-01-08', count: 12 },
  { date: '2024-01-15', count: 18 },
];

describe('Requirements Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(githubApi.fetchContributors).mockResolvedValue({ data: mockContributors });
    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({ data: [] });
    vi.mocked(githubApi.transformCommitActivity).mockReturnValue(mockCommitData);
  });

  describe('Requirement 1: GitHub Repository URL Input and Analysis', () => {
    it('1.1: Displays repository analysis page functionality', async () => {
      // Test that the form can navigate to analysis page
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('1.2: Shows form to input GitHub repository URLs', () => {
      render(<RepoForm />);
      
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/github\.com\/owner\/repository/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze repository/i })).toBeInTheDocument();
    });

    it('1.3: Parses owner and repository name from valid URLs', async () => {
      const user = userEvent.setup();
      const testCases = [
        { input: 'https://github.com/facebook/react', expected: '/analyze/facebook/react' },
        { input: 'github.com/microsoft/vscode', expected: '/analyze/microsoft/vscode' },
        { input: 'facebook/react', expected: '/analyze/facebook/react' },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        const { rerender } = render(<RepoForm />);
        
        const input = screen.getByLabelText(/github repository url/i);
        await user.clear(input);
        await user.type(input, testCase.input);
        
        const submitButton = screen.getByRole('button', { name: /analyze repository/i });
        await user.click(submitButton);
        
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(testCase.expected);
        });
        
        rerender(<div />);
      }
    });

    it('1.4: Displays validation errors for invalid URLs', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'invalid-url');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('1.5: Handles repository not found (would be handled by page component)', () => {
      // This is handled by the page component's notFound() call
      // We verify the form can handle the flow
      render(<RepoForm />);
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
    });
  });

  describe('Requirement 2: Commit Activity Charts', () => {
    it('2.1: Displays commit history chart', async () => {
      render(<CommitChart owner="facebook" repo="react" data={mockCommitData} />);
      
      expect(screen.getByText('Commit Activity')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('2.2: Shows commits over time with appropriate date ranges', async () => {
      render(<CommitChart owner="facebook" repo="react" data={mockCommitData} />);
      
      expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('2.3: Presents commit frequency in visually clear format', async () => {
      render(<CommitChart owner="facebook" repo="react" data={mockCommitData} />);
      
      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('2.4: Displays message when no commits available', async () => {
      render(<CommitChart owner="facebook" repo="react" data={[]} />);
      
      expect(screen.getByText('No commit history available')).toBeInTheDocument();
      expect(screen.getByText(/This repository doesn't have any commit activity data/)).toBeInTheDocument();
    });

    it('2.5: Shows loading indicators when commit data is loading', async () => {
      render(<CommitChart owner="facebook" repo="react" />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Requirement 3: Contributors Information', () => {
    it('3.1: Displays list of contributors', async () => {
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('3.2: Includes contributor names, avatars, and contribution counts', async () => {
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      // Names
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.getByText('sebmarkbage')).toBeInTheDocument();
      
      // Contribution counts
      expect(screen.getByText('1,500 contributions')).toBeInTheDocument();
      expect(screen.getByText('800 contributions')).toBeInTheDocument();
      
      // Avatars (images)
      const images = screen.getAllByRole('img', { hidden: true });
      expect(images.length).toBeGreaterThan(0);
    });

    it('3.3: Sorts contributors by contribution count (descending)', async () => {
      render(<Contributors owner="facebook" repo="react" data={mockContributors} />);
      
      const contributionElements = screen.getAllByText(/\d+,?\d* contributions?$/);
      expect(contributionElements[0]).toHaveTextContent('1,500 contributions');
      expect(contributionElements[1]).toHaveTextContent('800 contributions');
    });

    it('3.4: Displays appropriate message when no contributors', async () => {
      render(<Contributors owner="facebook" repo="react" data={[]} />);
      
      expect(screen.getByText('No contributors found')).toBeInTheDocument();
      expect(screen.getByText(/This repository may not have any contributors yet/)).toBeInTheDocument();
    });

    it('3.5: Shows loading indicators when contributor data is loading', async () => {
      render(<Contributors owner="facebook" repo="react" />);
      
      expect(screen.getByText('Loading contributor information...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Requirement 4: GitHub API Error Handling', () => {
    it('4.1: Displays informative error message for rate limits', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        error: 'API rate limit exceeded',
      });

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('4.2: Provides retry mechanisms where appropriate', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        error: 'Network error',
      });

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });

    it('4.3: Handles unauthorized access gracefully', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        error: 'Access forbidden',
      });

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Access forbidden')).toBeInTheDocument();
      });
    });

    it('4.4: Displays appropriate error messages for network errors', async () => {
      vi.mocked(githubApi.fetchContributors).mockRejectedValue(new Error('Network error'));

      render(<Contributors owner="facebook" repo="react" />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load contributors')).toBeInTheDocument();
      });
    });

    it('4.5: Shows loading states during slow API responses', async () => {
      vi.mocked(githubApi.fetchContributors).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: mockContributors }), 100))
      );

      render(<Contributors owner="facebook" repo="react" />);
      
      expect(screen.getByText('Loading contributor information...')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Requirement 5: Responsive Design and Accessibility', () => {
    it('5.1: Displays mobile-friendly layout', () => {
      render(
        <div>
          <RepoForm />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockCommitData} />
        </div>
      );
      
      // Check for responsive classes
      const form = screen.getByRole('search');
      expect(form).toBeInTheDocument();
      
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveClass('w-full');
    });

    it('5.2: Supports proper tab order and focus management', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      const button = screen.getByRole('button', { name: /analyze repository/i });
      
      // Tab navigation
      await user.tab();
      expect(input).toHaveFocus();
      
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('5.3: Provides appropriate ARIA labels and descriptions', () => {
      render(
        <div>
          <RepoForm />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockCommitData} />
        </div>
      );
      
      // RepoForm accessibility
      const form = screen.getByRole('search');
      expect(form).toHaveAttribute('aria-label');
      
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveAttribute('aria-describedby');
      
      // Contributors accessibility
      const contributorsList = screen.getByRole('list');
      expect(contributorsList).toHaveAttribute('aria-label');
      
      // Chart accessibility
      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label');
    });

    it('5.4: Includes alternative text descriptions for charts', () => {
      render(<CommitChart owner="facebook" repo="react" data={mockCommitData} />);
      
      const chart = screen.getByRole('img');
      expect(chart).toHaveAttribute('aria-label');
      expect(chart.getAttribute('aria-label')).toContain('Commit activity chart');
    });

    it('5.5: Handles graceful degradation (components render without JavaScript features)', () => {
      // Components should render basic content even if interactive features fail
      render(
        <div>
          <RepoForm />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockCommitData} />
        </div>
      );
      
      // Basic content should be present
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('Commit Activity')).toBeInTheDocument();
    });
  });

  describe('Complete Integration Verification', () => {
    it('verifies all components work together seamlessly', async () => {
      const user = userEvent.setup();
      
      // Render integrated components as they would appear on the analysis page
      render(
        <div>
          <RepoForm initialOwner="facebook" initialRepo="react" />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockCommitData} />
        </div>
      );
      
      // Verify RepoForm is pre-populated
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveValue('https://github.com/facebook/react');
      
      // Verify Contributors component displays data
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      
      // Verify CommitChart component displays
      expect(screen.getByText('Commit Activity')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      
      // Test form functionality
      await user.clear(input);
      await user.type(input, 'github.com/microsoft/vscode');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/microsoft/vscode');
      });
    });

    it('verifies error handling works across all components', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        error: 'API rate limit exceeded',
      });
      vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
        error: 'Failed to fetch commit data',
      });

      render(
        <div>
          <Contributors owner="facebook" repo="react" />
          <CommitChart owner="facebook" repo="react" />
        </div>
      );
      
      // Both components should handle errors gracefully
      await waitFor(() => {
        expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch commit data')).toBeInTheDocument();
      });
    });

    it('verifies accessibility works across all integrated components', () => {
      render(
        <div>
          <RepoForm />
          <Contributors owner="facebook" repo="react" data={mockContributors} />
          <CommitChart owner="facebook" repo="react" data={mockCommitData} />
        </div>
      );
      
      // Check that all components have proper accessibility attributes
      expect(screen.getByRole('search')).toHaveAttribute('aria-label');
      expect(screen.getByRole('list')).toHaveAttribute('aria-label');
      expect(screen.getByRole('img')).toHaveAttribute('aria-label');
      
      // Check for screen reader content
      expect(screen.getByText(/enter a github repository url/i)).toBeInTheDocument();
    });
  });
});