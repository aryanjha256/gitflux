import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MostChangedFiles } from './MostChangedFiles';
import * as githubApi from '@/lib/github-api';

// Mock all the sub-components
jest.mock('./TimePeriodFilter', () => ({
  TimePeriodFilter: ({ selectedPeriod, onPeriodChange, isLoading }: any) => (
    <div data-testid="time-period-filter">
      <span>Selected: {selectedPeriod}</span>
      <span>Loading: {isLoading.toString()}</span>
      <button onClick={() => onPeriodChange('30d')}>Change to 30d</button>
    </div>
  ),
}));

jest.mock('./FileChangeList', () => ({
  FileChangeList: ({ files, isLoading, onFileSelect, selectedFile }: any) => (
    <div data-testid="file-change-list">
      <span>Files count: {files.length}</span>
      <span>Loading: {isLoading.toString()}</span>
      <span>Selected: {selectedFile || 'none'}</span>
      <button onClick={() => onFileSelect('test.js')}>Select test.js</button>
    </div>
  ),
}));

jest.mock('./FileChangeTrend', () => ({
  FileChangeTrend: ({ filename, trendData, timePeriod }: any) => (
    <div data-testid="file-change-trend">
      <span>Filename: {filename}</span>
      <span>Trend data points: {trendData.length}</span>
      <span>Time period: {timePeriod}</span>
    </div>
  ),
}));

jest.mock('./FileTypeBreakdown', () => ({
  FileTypeBreakdown: ({ typeData, isLoading }: any) => (
    <div data-testid="file-type-breakdown">
      <span>Type data count: {typeData.length}</span>
      <span>Loading: {isLoading.toString()}</span>
    </div>
  ),
}));

// Mock GitHub API functions
const mockCommitFileData = [
  {
    sha: 'abc123',
    date: '2024-01-15T10:30:00Z',
    author: 'John Doe',
    message: 'Update component',
    files: [
      {
        filename: 'src/components/App.tsx',
        status: 'modified' as const,
        changes: 10,
        additions: 8,
        deletions: 2,
      },
    ],
  },
  {
    sha: 'def456',
    date: '2024-01-10T14:20:00Z',
    author: 'Jane Smith',
    message: 'Fix bug',
    files: [
      {
        filename: 'src/utils/helper.js',
        status: 'modified' as const,
        changes: 5,
        additions: 3,
        deletions: 2,
      },
    ],
  },
];

const mockFetchCommitsWithFiles = jest.fn();
const mockFilterCommitsByTimePeriod = jest.fn();
const mockProcessFileChangeData = jest.fn();

// Mock the GitHub API module
jest.mock('@/lib/github-api', () => ({
  ...jest.requireActual('@/lib/github-api'),
  fetchCommitsWithFiles: (...args: any[]) => mockFetchCommitsWithFiles(...args),
  filterCommitsByTimePeriod: (...args: any[]) => mockFilterCommitsByTimePeriod(...args),
  processFileChangeData: (...args: any[]) => mockProcessFileChangeData(...args),
}));

describe('MostChangedFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: mockCommitFileData,
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockFilterCommitsByTimePeriod.mockReturnValue(mockCommitFileData);
    
    mockProcessFileChangeData.mockReturnValue({
      files: [
        {
          filename: 'src/components/App.tsx',
          changeCount: 10,
          percentage: 66.7,
          lastChanged: '2024-01-15T10:30:00Z',
          fileType: 'TypeScript',
          isDeleted: false,
          trendData: [{ date: '2024-01-15', changes: 10 }],
        },
        {
          filename: 'src/utils/helper.js',
          changeCount: 5,
          percentage: 33.3,
          lastChanged: '2024-01-10T14:20:00Z',
          fileType: 'JavaScript',
          isDeleted: false,
          trendData: [{ date: '2024-01-10', changes: 5 }],
        },
      ],
      totalChanges: 15,
      analysisDate: '2024-01-20T00:00:00Z',
      timePeriod: '90d' as const,
      fileTypeBreakdown: [
        {
          extension: 'TypeScript',
          category: 'TypeScript',
          changeCount: 10,
          percentage: 66.7,
          color: '#3178c6',
        },
        {
          extension: 'JavaScript',
          category: 'JavaScript',
          changeCount: 5,
          percentage: 33.3,
          color: '#f7df1e',
        },
      ],
    });
  });

  it('renders the component with initial loading state', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    expect(screen.getByText('Most Changed Files')).toBeInTheDocument();
    expect(screen.getByText('Analyze file change patterns and identify code churn hotspots')).toBeInTheDocument();
    
    // Should show loading state initially
    expect(screen.getByText('Loading: true')).toBeInTheDocument();
  });

  it('fetches and displays file change data', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(mockFetchCommitsWithFiles).toHaveBeenCalledWith(
        'test-owner',
        'test-repo',
        undefined,
        undefined,
        1,
        100
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    expect(screen.getByText('Files count: 2')).toBeInTheDocument();
    expect(screen.getByText('Type data count: 2')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetchCommitsWithFiles.mockResolvedValue({
      error: 'Repository not found',
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });

    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading File Change Data')).toBeInTheDocument();
      expect(screen.getByText('Repository not found')).toBeInTheDocument();
    });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('handles time period changes', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    const changePeriodButton = screen.getByText('Change to 30d');
    fireEvent.click(changePeriodButton);

    expect(screen.getByText('Selected: 30d')).toBeInTheDocument();
    expect(screen.getByText('Time period: 30d')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    const selectFileButton = screen.getByText('Select test.js');
    fireEvent.click(selectFileButton);

    expect(screen.getByText('Selected: test.js')).toBeInTheDocument();
    expect(screen.getByText('Filename: test.js')).toBeInTheDocument();
  });

  it('displays rate limit warning when appropriate', async () => {
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: mockCommitFileData,
      rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 }, // Low remaining
    });

    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Rate limit warning')).toBeInTheDocument();
      expect(screen.getByText('Analysis may be incomplete due to GitHub API rate limits')).toBeInTheDocument();
    });
  });

  it('displays summary statistics when data is loaded', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Files')).toBeInTheDocument();
    expect(screen.getByText('Total Changes')).toBeInTheDocument();
    expect(screen.getByText('File Types')).toBeInTheDocument();
    expect(screen.getByText('Time Period')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    mockFetchCommitsWithFiles.mockResolvedValueOnce({
      error: 'Network error',
    });

    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Reset mock to return successful response
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: mockCommitFileData,
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Files count: 2')).toBeInTheDocument();
    });
  });

  it('handles empty data gracefully', async () => {
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: [],
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });

    mockProcessFileChangeData.mockReturnValue({
      files: [],
      totalChanges: 0,
      analysisDate: '2024-01-20T00:00:00Z',
      timePeriod: '90d' as const,
      fileTypeBreakdown: [],
    });

    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Files count: 0')).toBeInTheDocument();
      expect(screen.getByText('Type data count: 0')).toBeInTheDocument();
    });
  });

  it('uses initial time period prop', () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" timePeriod="1y" />);

    expect(screen.getByText('Selected: 1y')).toBeInTheDocument();
  });

  it('resets selected file when time period changes', async () => {
    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument();
    });

    // Select a file first
    const selectFileButton = screen.getByText('Select test.js');
    fireEvent.click(selectFileButton);
    expect(screen.getByText('Selected: test.js')).toBeInTheDocument();

    // Change time period
    const changePeriodButton = screen.getByText('Change to 30d');
    fireEvent.click(changePeriodButton);

    // Selected file should be reset
    expect(screen.getByText('Selected: none')).toBeInTheDocument();
  });

  it('handles multiple pages of commits', async () => {
    // Mock multiple pages
    mockFetchCommitsWithFiles
      .mockResolvedValueOnce({
        data: new Array(100).fill(mockCommitFileData[0]), // Full page
        rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
      })
      .mockResolvedValueOnce({
        data: [mockCommitFileData[1]], // Partial page
        rateLimit: { remaining: 90, reset: Date.now() + 3600000, limit: 5000 },
      });

    render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

    await waitFor(() => {
      expect(mockFetchCommitsWithFiles).toHaveBeenCalledTimes(2);
    });
  });
});