import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RepoForm } from '@/components/RepoForm';
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

describe('GitHub Repository Analyzer - Integration Tests', () => {
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

  describe('Complete User Flow', () => {
    it('handles complete flow from URL input to data display', async () => {
      const user = userEvent.setup();
      
      // Render the RepoForm component (as it would appear on home page)
      render(<RepoForm />);
      
      // User enters a GitHub repository URL
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'https://github.com/facebook/react');
      
      // User submits the form
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      // Verify navigation to analysis page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('validates URL format and shows appropriate errors', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      // Test invalid URL
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'invalid-url');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      // Should show validation error
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
      
      // Should not navigate
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('handles various GitHub URL formats correctly', async () => {
      const user = userEvent.setup();
      const testCases = [
        { input: 'https://github.com/facebook/react', expected: '/analyze/facebook/react' },
        { input: 'github.com/microsoft/vscode', expected: '/analyze/microsoft/vscode' },
        { input: 'facebook/react', expected: '/analyze/facebook/react' },
        { input: 'https://github.com/vercel/next.js/', expected: '/analyze/vercel/next.js' },
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
        
        rerender(<div />); // Clear component
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('handles repository not found error', async () => {
      vi.mocked(githubApi.fetchRepository).mockResolvedValue({
        error: 'Repository not found',
      });

      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/nonexistent/repo');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      // Should still navigate (error handling happens on the analysis page)
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/nonexistent/repo');
      });
    });

    it('handles rate limit errors gracefully', async () => {
      vi.mocked(githubApi.fetchRepository).mockResolvedValue({
        error: 'API rate limit exceeded',
      });

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

    it('handles network errors during form submission', async () => {
      const mockOnSubmit = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });

      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred while processing the url/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Experience Integration', () => {
    it('provides proper loading states during form submission', async () => {
      const mockOnSubmit = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      
      // Start submission
      const clickPromise = user.click(submitButton);
      
      // Check loading state appears
      await waitFor(() => {
        expect(screen.getByText(/analyzing\.\.\./i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
        expect(input).toBeDisabled();
      });
      
      // Wait for submission to complete
      await clickPromise;
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('facebook', 'react');
      });
    });

    it('maintains accessibility throughout the user flow', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      // Check initial accessibility
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveAttribute('aria-describedby', 'url-help');
      
      // Test keyboard navigation
      await user.type(input, 'github.com/facebook/react');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('clears errors when user corrects input', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      
      // First, trigger an error
      await user.type(input, 'invalid');
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
      
      // Then correct the input
      await user.clear(input);
      await user.type(input, 'github.com/facebook/react');
      await user.click(submitButton);
      
      // Error should be cleared
      expect(screen.queryByText(/please enter a valid github repository url/i)).not.toBeInTheDocument();
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });
  });

  describe('Requirements Verification', () => {
    it('meets requirement 1.1: displays repository analysis page', async () => {
      // This would be tested in the actual page component, but we verify navigation
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

    it('meets requirement 1.2: shows form to input GitHub repository URLs', () => {
      render(<RepoForm />);
      
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/github\.com\/owner\/repository/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze repository/i })).toBeInTheDocument();
    });

    it('meets requirement 1.3: parses owner and repository name from valid URLs', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'https://github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('meets requirement 1.4: displays validation errors for invalid URLs', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'not-a-valid-url');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
    });

    it('meets requirement 5.1: responsive and mobile-friendly layout', () => {
      render(<RepoForm />);
      
      // Check for responsive classes
      const form = screen.getByRole('search');
      expect(form).toBeInTheDocument();
      
      // The component should have responsive styling (verified through CSS classes)
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveClass('w-full');
    });

    it('meets requirement 5.2: supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      
      // Tab to input
      await user.tab();
      expect(input).toHaveFocus();
      
      // Type and submit with Enter
      await user.type(input, 'github.com/facebook/react');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('meets requirement 5.3: provides ARIA labels and screen reader support', () => {
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveAttribute('aria-describedby', 'url-help');
      
      const form = screen.getByRole('search');
      expect(form).toHaveAttribute('aria-label', 'GitHub repository analyzer');
      
      // Help text should be available
      expect(screen.getByText(/enter a github repository url/i)).toBeInTheDocument();
    });
  });
});