import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyzePage from '@/app/analyze/[owner]/[repo]/page';
import { Contributors } from '@/components/Contributors';
import { CommitChart } from '@/components/CommitChart';
import { RepoForm } from '@/components/RepoForm';
import * as githubApi from '@/lib/github-api';

// Mock Next.js navigation
const mockNotFound = vi.fn();
vi.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
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
];

const mockTransformedCommitData = [
  { date: '2024-01-01', count: 15 },
  { date: '2024-01-08', count: 12 },
];

describe('Analysis Page Integration Tests', () => {
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

  describe('Complete Page Integration', () => {
    it('renders all components with repository data', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Check repository header
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText(/A declarative, efficient, and flexible JavaScript library/)).toBeInTheDocument();
      
      // Check repository stats
      expect(screen.getByText('220,000 stars')).toBeInTheDocument();
      expect(screen.getByText('45,000 forks')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      
      // Check that RepoForm is present
      expect(screen.getByText('Analyze Another Repository')).toBeInTheDocument();
      expect(screen.getByLabelText(/GitHub Repository URL/i)).toBeInTheDocument();
      
      // Check that Contributors component is rendered
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      
      // Check that CommitChart component is rendered
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('handles repository not found error', async () => {
      vi.mocked(githubApi.fetchRepository).mockResolvedValue({
        error: 'Repository not found',
      });

      const params = Promise.resolve({ owner: 'nonexistent', repo: 'repo' });
      
      // This should trigger notFound()
      await expect(async () => {
        render(await AnalyzePage({ params }));
      }).rejects.toThrow();
      
      expect(mockNotFound).toHaveBeenCalled();
    });

    it('handles API errors by throwing', async () => {
      vi.mocked(githubApi.fetchRepository).mockResolvedValue({
        error: 'API rate limit exceeded',
      });

      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      await expect(async () => {
        render(await AnalyzePage({ params }));
      }).rejects.toThrow('API rate limit exceeded');
    });

    it('handles missing contributors data gracefully', async () => {
      vi.mocked(githubApi.fetchContributors).mockResolvedValue({
        data: null,
      });

      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Should still render with empty contributors
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText('Contributors (0)')).toBeInTheDocument();
    });

    it('handles missing commit activity data gracefully', async () => {
      vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
        data: null,
      });

      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Should still render with empty activity
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Total commits should be 0
    });
  });

  describe('Component Integration', () => {
    it('passes correct props to Contributors component', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Contributors component should receive the data
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.getByText('sebmarkbage')).toBeInTheDocument();
    });

    it('passes correct props to CommitChart component', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Chart should be rendered with data
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('passes correct initial values to RepoForm component', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // RepoForm should be pre-filled with current repository
      const input = screen.getByLabelText(/GitHub Repository URL/i);
      expect(input).toHaveValue('https://github.com/facebook/react');
    });
  });

  describe('Requirements Verification', () => {
    it('meets requirement 2.1: displays repository information', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Repository name and description
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      expect(screen.getByText(/A declarative, efficient, and flexible JavaScript library/)).toBeInTheDocument();
      
      // Repository stats
      expect(screen.getByText('220,000 stars')).toBeInTheDocument();
      expect(screen.getByText('45,000 forks')).toBeInTheDocument();
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      
      // Repository dates
      expect(screen.getByText('5/24/2013')).toBeInTheDocument(); // Created date
      expect(screen.getByText('1/15/2024')).toBeInTheDocument(); // Updated date
    });

    it('meets requirement 3.1: displays contributor information', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      expect(screen.getByText('Contributors (2)')).toBeInTheDocument();
      expect(screen.getByText('gaearon')).toBeInTheDocument();
      expect(screen.getByText('1,500 contributions')).toBeInTheDocument();
      expect(screen.getByText('sebmarkbage')).toBeInTheDocument();
      expect(screen.getByText('800 contributions')).toBeInTheDocument();
    });

    it('meets requirement 4.1: displays commit activity visualization', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Chart components should be present
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      
      // Total commits should be calculated
      expect(screen.getByText('27')).toBeInTheDocument(); // 15 + 12 = 27 total commits
    });

    it('meets requirement 5.1: responsive design', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Check for responsive grid classes
      const statsSection = screen.getByLabelText('Repository statistics');
      expect(statsSection).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });
  });

  describe('Error Boundary Integration', () => {
    it('handles component errors gracefully', async () => {
      // Mock Contributors component to throw an error
      vi.mocked(githubApi.fetchContributors).mockRejectedValue(new Error('Network error'));

      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Page should still render with repository info
      expect(screen.getByText('facebook/react')).toBeInTheDocument();
      
      // Contributors component should handle its own error
      expect(screen.getByText('Contributors (0)')).toBeInTheDocument();
    });
  });

  describe('Accessibility Integration', () => {
    it('provides proper ARIA labels and semantic structure', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Check for proper semantic structure
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('main')).toBeInTheDocument(); // main content
      
      // Check for ARIA labels
      expect(screen.getByLabelText('Repository search')).toBeInTheDocument();
      expect(screen.getByLabelText('Repository statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Repository contributors')).toBeInTheDocument();
      expect(screen.getByLabelText('Commit activity visualization')).toBeInTheDocument();
    });

    it('provides proper time elements with datetime attributes', async () => {
      const params = Promise.resolve({ owner: 'facebook', repo: 'react' });
      
      render(await AnalyzePage({ params }));
      
      // Check for time elements with proper datetime attributes
      const createdTime = screen.getByText('5/24/2013').closest('time');
      expect(createdTime).toHaveAttribute('dateTime', '2013-05-24T16:15:54Z');
      
      const updatedTime = screen.getByText('1/15/2024').closest('time');
      expect(updatedTime).toHaveAttribute('dateTime', '2024-01-15T10:30:00Z');
    });
  });
});