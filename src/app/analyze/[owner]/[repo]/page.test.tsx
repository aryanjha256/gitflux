import { render, screen } from '@testing-library/react';
import AnalyzePage from './page';
import * as githubApi from '@/lib/github-api';

// Mock all the components
jest.mock('@/components/CommitChart', () => ({
  CommitChart: ({ owner, repo }: any) => (
    <div data-testid="commit-chart">CommitChart for {owner}/{repo}</div>
  ),
}));

jest.mock('@/components/Contributors', () => ({
  Contributors: ({ owner, repo }: any) => (
    <div data-testid="contributors">Contributors for {owner}/{repo}</div>
  ),
}));

jest.mock('@/components/RepoForm', () => ({
  RepoForm: ({ initialOwner, initialRepo }: any) => (
    <div data-testid="repo-form">RepoForm {initialOwner}/{initialRepo}</div>
  ),
}));

jest.mock('@/components/MostChangedFiles', () => ({
  MostChangedFiles: ({ owner, repo }: any) => (
    <div data-testid="most-changed-files">MostChangedFiles for {owner}/{repo}</div>
  ),
}));

// Mock GitHub API functions
const mockFetchRepository = jest.fn();
const mockFetchContributors = jest.fn();
const mockFetchCommitActivity = jest.fn();
const mockTransformCommitActivity = jest.fn();

jest.mock('@/lib/github-api', () => ({
  fetchRepository: (...args: any[]) => mockFetchRepository(...args),
  fetchContributors: (...args: any[]) => mockFetchContributors(...args),
  fetchCommitActivity: (...args: any[]) => mockFetchCommitActivity(...args),
  transformCommitActivity: (...args: any[]) => mockTransformCommitActivity(...args),
}));

const mockRepository = {
  name: 'test-repo',
  full_name: 'test-owner/test-repo',
  description: 'A test repository',
  stargazers_count: 100,
  forks_count: 25,
  language: 'TypeScript',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  private: false,
  html_url: 'https://github.com/test-owner/test-repo',
};

const mockContributors = [
  {
    login: 'contributor1',
    avatar_url: 'https://github.com/contributor1.png',
    contributions: 50,
    html_url: 'https://github.com/contributor1',
    type: 'User',
  },
];

const mockCommitActivity = [
  { week: 1640995200, total: 10, days: [1, 2, 3, 4, 0, 0, 0] },
];

const mockTransformedActivity = [
  { date: '2022-01-01', count: 10 },
];

describe('AnalyzePage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetchRepository.mockResolvedValue({
      data: mockRepository,
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockFetchContributors.mockResolvedValue({
      data: mockContributors,
      rateLimit: { remaining: 99, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockFetchCommitActivity.mockResolvedValue({
      data: mockCommitActivity,
      rateLimit: { remaining: 98, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockTransformCommitActivity.mockReturnValue(mockTransformedActivity);
  });

  it('renders all components including MostChangedFiles', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    // Check that all main sections are rendered
    expect(screen.getByText('Analyze Another Repository')).toBeInTheDocument();
    expect(screen.getByText('test-owner/test-repo')).toBeInTheDocument();
    expect(screen.getByText('A test repository')).toBeInTheDocument();
    
    // Check that all components are rendered
    expect(screen.getByTestId('repo-form')).toBeInTheDocument();
    expect(screen.getByTestId('contributors')).toBeInTheDocument();
    expect(screen.getByTestId('commit-chart')).toBeInTheDocument();
    expect(screen.getByTestId('most-changed-files')).toBeInTheDocument();
    
    // Verify MostChangedFiles receives correct props
    expect(screen.getByText('MostChangedFiles for test-owner/test-repo')).toBeInTheDocument();
  });

  it('displays repository statistics correctly', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    expect(screen.getByText('100 stars')).toBeInTheDocument();
    expect(screen.getByText('25 forks')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('displays contributor and activity counts', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    expect(screen.getByText('1')).toBeInTheDocument(); // Contributors count
    expect(screen.getByText('10')).toBeInTheDocument(); // Total commits
  });

  it('has proper section structure and accessibility', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    // Check ARIA labels
    expect(screen.getByLabelText('Repository search')).toBeInTheDocument();
    expect(screen.getByLabelText('Repository statistics')).toBeInTheDocument();
    expect(screen.getByLabelText('Repository contributors')).toBeInTheDocument();
    expect(screen.getByLabelText('Commit activity visualization')).toBeInTheDocument();
    expect(screen.getByLabelText('File change analysis')).toBeInTheDocument();
  });

  it('handles private repositories correctly', async () => {
    mockFetchRepository.mockResolvedValue({
      data: { ...mockRepository, private: true },
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });

    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('passes correct props to all components', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    render(await AnalyzePage({ params }));

    // Verify RepoForm gets initial values
    expect(screen.getByText('RepoForm test-owner/test-repo')).toBeInTheDocument();
    
    // Verify other components get owner/repo
    expect(screen.getByText('Contributors for test-owner/test-repo')).toBeInTheDocument();
    expect(screen.getByText('CommitChart for test-owner/test-repo')).toBeInTheDocument();
    expect(screen.getByText('MostChangedFiles for test-owner/test-repo')).toBeInTheDocument();
  });

  it('has responsive layout classes', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    const { container } = render(await AnalyzePage({ params }));

    // Check for responsive container
    expect(container.querySelector('.max-w-7xl')).toBeInTheDocument();
    
    // Check for responsive grid
    expect(container.querySelector('.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-3')).toBeInTheDocument();
  });

  it('maintains consistent styling with existing components', async () => {
    const params = Promise.resolve({ owner: 'test-owner', repo: 'test-repo' });
    
    const { container } = render(await AnalyzePage({ params }));

    // Check that MostChangedFiles section has consistent styling
    const mostChangedSection = screen.getByLabelText('File change analysis');
    expect(mostChangedSection).toHaveClass('mb-6');
    
    const mostChangedContainer = mostChangedSection.querySelector('div');
    expect(mostChangedContainer).toHaveClass(
      'bg-white',
      'dark:bg-gray-800',
      'rounded-lg',
      'shadow-sm',
      'border',
      'border-gray-200',
      'dark:border-gray-700',
      'p-4',
      'sm:p-6'
    );
  });
});