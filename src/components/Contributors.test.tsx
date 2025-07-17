import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Contributors } from './Contributors';
import * as githubApi from '@/lib/github-api';

// Mock the GitHub API module
vi.mock('@/lib/github-api', () => ({
  fetchContributors: vi.fn(),
}));

const mockContributors = [
  {
    login: 'user1',
    avatar_url: 'https://github.com/user1.png',
    contributions: 50,
    html_url: 'https://github.com/user1',
    type: 'User',
  },
  {
    login: 'user2',
    avatar_url: 'https://github.com/user2.png',
    contributions: 25,
    html_url: 'https://github.com/user2',
    type: 'User',
  },
  {
    login: 'user3',
    avatar_url: 'https://github.com/user3.png',
    contributions: 75,
    html_url: 'https://github.com/user3',
    type: 'User',
  },
];

describe('Contributors', () => {
  const mockFetchContributors = vi.mocked(githubApi.fetchContributors);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially when no data is provided', () => {
    mockFetchContributors.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { container } = render(<Contributors owner="testowner" repo="testrepo" />);
    
    expect(screen.getByText('Contributors')).toBeInTheDocument();
    // Check for loading skeleton elements
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders contributors when data is provided as prop', () => {
    render(<Contributors owner="testowner" repo="testrepo" data={mockContributors} />);
    
    expect(screen.getByText('Contributors (3)')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument();
  });

  it('sorts contributors by contribution count in descending order', async () => {
    mockFetchContributors.mockResolvedValue({
      data: mockContributors,
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Contributors (3)')).toBeInTheDocument();
    });

    const contributorElements = screen.getAllByText(/\d+ contribution/);
    expect(contributorElements[0]).toHaveTextContent('75 contributions');
    expect(contributorElements[1]).toHaveTextContent('50 contributions');
    expect(contributorElements[2]).toHaveTextContent('25 contributions');
  });

  it('displays correct contribution count text (singular vs plural)', async () => {
    const singleContribution = [{
      ...mockContributors[0],
      contributions: 1,
    }];

    mockFetchContributors.mockResolvedValue({
      data: singleContribution,
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('1 contribution')).toBeInTheDocument();
    });
  });

  it('renders contributor avatars with correct attributes', async () => {
    mockFetchContributors.mockResolvedValue({
      data: [mockContributors[0]],
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      const avatar = screen.getByAltText("user1's avatar");
      expect(avatar).toHaveAttribute('src', 'https://github.com/user1.png');
      expect(avatar).toHaveAttribute('loading', 'lazy');
    });
  });

  it('renders contributor links with correct href and accessibility attributes', async () => {
    mockFetchContributors.mockResolvedValue({
      data: [mockContributors[0]],
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      const profileLink = screen.getByLabelText("View user1's GitHub profile");
      expect(profileLink).toHaveAttribute('href', 'https://github.com/user1');
      expect(profileLink).toHaveAttribute('target', '_blank');
      expect(profileLink).toHaveAttribute('rel', 'noopener noreferrer');
      
      const nameLink = screen.getByRole('link', { name: 'user1' });
      expect(nameLink).toHaveAttribute('href', 'https://github.com/user1');
    });
  });

  it('displays error state when API call fails', async () => {
    mockFetchContributors.mockResolvedValue({
      error: 'Repository not found',
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Repository not found')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('displays empty state when no contributors are found', async () => {
    mockFetchContributors.mockResolvedValue({
      data: [],
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('No contributors found')).toBeInTheDocument();
      expect(screen.getByText('This repository may not have any contributors yet.')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    mockFetchContributors.mockRejectedValue(new Error('Network error'));

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load contributors')).toBeInTheDocument();
    });
  });

  it('does not fetch data when data prop is provided', () => {
    render(<Contributors owner="testowner" repo="testrepo" data={mockContributors} />);
    
    expect(mockFetchContributors).not.toHaveBeenCalled();
  });

  it('fetches data when no data prop is provided', () => {
    mockFetchContributors.mockResolvedValue({ data: [] });
    
    render(<Contributors owner="testowner" repo="testrepo" />);
    
    expect(mockFetchContributors).toHaveBeenCalledWith('testowner', 'testrepo');
  });

  it('displays contribution badges with correct styling', async () => {
    mockFetchContributors.mockResolvedValue({
      data: [mockContributors[0]],
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      const badge = screen.getByText('50');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  it('applies hover effects and transitions', async () => {
    mockFetchContributors.mockResolvedValue({
      data: [mockContributors[0]],
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      const contributorRow = screen.getByText('user1').closest('div');
      expect(contributorRow).toHaveClass('hover:bg-gray-50', 'transition-colors');
    });
  });

  it('handles scrollable content when many contributors', async () => {
    const manyContributors = Array.from({ length: 20 }, (_, i) => ({
      login: `user${i}`,
      avatar_url: `https://github.com/user${i}.png`,
      contributions: 10 - i,
      html_url: `https://github.com/user${i}`,
      type: 'User',
    }));

    mockFetchContributors.mockResolvedValue({
      data: manyContributors,
    });

    render(<Contributors owner="testowner" repo="testrepo" />);
    
    await waitFor(() => {
      expect(screen.getByText('Contributors (20)')).toBeInTheDocument();
      const scrollContainer = screen.getByText('user0').closest('.space-y-4');
      expect(scrollContainer).toHaveClass('max-h-96', 'overflow-y-auto');
    });
  });
});