import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommitChart } from './CommitChart';
import * as githubApi from '@/lib/github-api';

// Mock the github-api module
vi.mock('@/lib/github-api', () => ({
  fetchCommitActivity: vi.fn(),
  transformCommitActivity: vi.fn(),
}));

// Mock Recharts components
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

const mockCommitData = [
  { date: '2024-01-01', count: 5 },
  { date: '2024-01-08', count: 3 },
  { date: '2024-01-15', count: 8 },
];

const mockCommitActivity = [
  { week: 1704067200, total: 5, days: [1, 0, 2, 1, 1, 0, 0] },
  { week: 1704672000, total: 3, days: [0, 1, 0, 2, 0, 0, 0] },
  { week: 1705276800, total: 8, days: [2, 1, 1, 2, 1, 1, 0] },
];

describe('CommitChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with provided data', () => {
    render(<CommitChart owner="test-owner" repo="test-repo" data={mockCommitData} />);

    expect(screen.getByText('Commit Activity')).toBeInTheDocument();
    expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('shows loading state when fetching data', () => {
    vi.mocked(githubApi.fetchCommitActivity).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<CommitChart owner="test-owner" repo="test-repo" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Commit Activity')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('fetches and displays commit data successfully', async () => {
    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
      data: mockCommitActivity,
    });
    vi.mocked(githubApi.transformCommitActivity).mockReturnValue(mockCommitData);

    render(<CommitChart owner="test-owner" repo="test-repo" />);

    // Initially shows loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Last 3 weeks')).toBeInTheDocument();
    });

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(githubApi.fetchCommitActivity).toHaveBeenCalledWith('test-owner', 'test-repo');
    expect(githubApi.transformCommitActivity).toHaveBeenCalledWith(mockCommitActivity);
  });

  it('displays error state when API call fails', async () => {
    const errorMessage = 'Repository not found';
    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
      error: errorMessage,
    });

    render(<CommitChart owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading commit data')).toBeInTheDocument();
    });

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('displays empty state when no commit data is available', async () => {
    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
      data: [],
    });
    vi.mocked(githubApi.transformCommitActivity).mockReturnValue([]);

    render(<CommitChart owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('No commit history available')).toBeInTheDocument();
    });

    expect(
      screen.getByText("This repository doesn't have any commit activity data to display.")
    ).toBeInTheDocument();
    expect(screen.queryByTestId('responsive-container')).not.toBeInTheDocument();
  });

  it('handles unexpected errors gracefully', async () => {
    vi.mocked(githubApi.fetchCommitActivity).mockRejectedValue(
      new Error('Network error')
    );

    render(<CommitChart owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading commit data')).toBeInTheDocument();
    });

    expect(
      screen.getByText('An unexpected error occurred while fetching commit data')
    ).toBeInTheDocument();
  });

  it('includes accessibility features', () => {
    render(<CommitChart owner="test-owner" repo="test-repo" data={mockCommitData} />);

    // Check for ARIA label on chart container
    const chartContainer = screen.getByRole('img');
    expect(chartContainer).toHaveAttribute(
      'aria-label',
      'Commit activity chart showing 3 weeks of data'
    );

    // Check for screen reader content
    expect(screen.getByText('Commit Activity Data Summary')).toBeInTheDocument();
    expect(screen.getByText(/Total commits: 16/)).toBeInTheDocument();
    expect(screen.getByText(/Average commits per week: 5/)).toBeInTheDocument();
  });

  it('provides detailed screen reader data', () => {
    render(<CommitChart owner="test-owner" repo="test-repo" data={mockCommitData} />);

    // Check that each data point is listed for screen readers
    expect(screen.getByText(/Week of.*: 5 commits/)).toBeInTheDocument();
    expect(screen.getByText(/Week of.*: 3 commits/)).toBeInTheDocument();
    expect(screen.getByText(/Week of.*: 8 commits/)).toBeInTheDocument();
  });

  it('updates when owner or repo props change', async () => {
    const { rerender } = render(<CommitChart owner="owner1" repo="repo1" />);

    vi.mocked(githubApi.fetchCommitActivity).mockResolvedValue({
      data: mockCommitActivity,
    });
    vi.mocked(githubApi.transformCommitActivity).mockReturnValue(mockCommitData);

    await waitFor(() => {
      expect(githubApi.fetchCommitActivity).toHaveBeenCalledWith('owner1', 'repo1');
    });

    // Clear previous calls
    vi.clearAllMocks();

    // Re-render with different props
    rerender(<CommitChart owner="owner2" repo="repo2" />);

    await waitFor(() => {
      expect(githubApi.fetchCommitActivity).toHaveBeenCalledWith('owner2', 'repo2');
    });
  });
});