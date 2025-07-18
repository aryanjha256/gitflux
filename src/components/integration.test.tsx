import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MostChangedFiles } from './MostChangedFiles';
import * as githubApi from '@/lib/github-api';

// Mock GitHub API
const mockFetchCommitsWithFiles = jest.fn();
const mockFilterCommitsByTimePeriod = jest.fn();
const mockProcessFileChangeData = jest.fn();

jest.mock('@/lib/github-api', () => ({
  ...jest.requireActual('@/lib/github-api'),
  fetchCommitsWithFiles: (...args: any[]) => mockFetchCommitsWithFiles(...args),
  filterCommitsByTimePeriod: (...args: any[]) => mockFilterCommitsByTimePeriod(...args),
  processFileChangeData: (...args: any[]) => mockProcessFileChangeData(...args),
}));

// Mock Recharts
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
}));

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
      {
        filename: 'src/utils/helper.js',
        status: 'modified' as const,
        changes: 5,
        additions: 3,
        deletions: 2,
      },
    ],
  },
  {
    sha: 'def456',
    date: '2024-01-10T14:20:00Z',
    author: 'Jane Smith',
    message: 'Add new feature',
    files: [
      {
        filename: 'src/components/App.tsx',
        status: 'modified' as const,
        changes: 15,
        additions: 12,
        deletions: 3,
      },
      {
        filename: 'README.md',
        status: 'modified' as const,
        changes: 3,
        additions: 2,
        deletions: 1,
      },
    ],
  },
];

const mockAnalysisData = {
  files: [
    {
      filename: 'src/components/App.tsx',
      changeCount: 2,
      percentage: 50.0,
      lastChanged: '2024-01-15T10:30:00Z',
      fileType: 'TypeScript',
      isDeleted: false,
      trendData: [
        { date: '2024-01-10', changes: 1 },
        { date: '2024-01-15', changes: 1 },
      ],
    },
    {
      filename: 'src/utils/helper.js',
      changeCount: 1,
      percentage: 25.0,
      lastChanged: '2024-01-15T10:30:00Z',
      fileType: 'JavaScript',
      isDeleted: false,
      trendData: [
        { date: '2024-01-15', changes: 1 },
      ],
    },
    {
      filename: 'README.md',
      changeCount: 1,
      percentage: 25.0,
      lastChanged: '2024-01-10T14:20:00Z',
      fileType: 'Documentation',
      isDeleted: false,
      trendData: [
        { date: '2024-01-10', changes: 1 },
      ],
    },
  ],
  totalChanges: 4,
  analysisDate: '2024-01-20T00:00:00Z',
  timePeriod: '90d' as const,
  fileTypeBreakdown: [
    {
      extension: 'TypeScript',
      category: 'TypeScript',
      changeCount: 2,
      percentage: 50.0,
      color: '#3178c6',
    },
    {
      extension: 'JavaScript',
      category: 'JavaScript',
      changeCount: 1,
      percentage: 25.0,
      color: '#f7df1e',
    },
    {
      extension: 'Documentation',
      category: 'Documentation',
      changeCount: 1,
      percentage: 25.0,
      color: '#083fa1',
    },
  ],
};

describe('MostChangedFiles Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetchCommitsWithFiles.mockResolvedValue({
      data: mockCommitFileData,
      rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
    });
    
    mockFilterCommitsByTimePeriod.mockReturnValue(mockCommitFileData);
    mockProcessFileChangeData.mockReturnValue(mockAnalysisData);
  });

  describe('Complete User Workflow', () => {
    it('completes full analysis workflow successfully', async () => {
      const user = userEvent.setup();
      
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // 1. Initial loading state
      expect(screen.getByText('Most Changed Files')).toBeInTheDocument();
      expect(screen.getByText('Analyze file change patterns and identify code churn hotspots')).toBeInTheDocument();

      // 2. Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });

      // 3. Verify all components are rendered
      expect(screen.getByText('Most Changed Files')).toBeInTheDocument();
      expect(screen.getByText('File Type Distribution')).toBeInTheDocument();
      expect(screen.getByText('Change Trend')).toBeInTheDocument();

      // 4. Verify file list shows correct data
      expect(screen.getByText('3 files • 4 total changes')).toBeInTheDocument();
      expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      expect(screen.getByText('src/utils/helper.js')).toBeInTheDocument();
      expect(screen.getByText('README.md')).toBeInTheDocument();

      // 5. Test file selection
      const appTsxButton = screen.getByText('src/components/App.tsx').closest('button');
      await user.click(appTsxButton!);

      // 6. Verify trend chart updates
      expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();

      // 7. Test time period change
      const timePeriodButton = screen.getByText('30 Days');
      await user.click(timePeriodButton);

      // 8. Verify data updates for new time period
      await waitFor(() => {
        expect(mockFilterCommitsByTimePeriod).toHaveBeenCalledWith(mockCommitFileData, '30d');
        expect(mockProcessFileChangeData).toHaveBeenCalledWith(mockCommitFileData, '30d');
      });

      // 9. Verify summary statistics
      expect(screen.getByText('Analysis Summary')).toBeInTheDocument();
      expect(screen.getByText('Total Files')).toBeInTheDocument();
      expect(screen.getByText('Total Changes')).toBeInTheDocument();
      expect(screen.getByText('File Types')).toBeInTheDocument();
    });

    it('handles empty repository gracefully', async () => {
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

      render(<MostChangedFiles owner="empty-owner" repo="empty-repo" />);

      await waitFor(() => {
        expect(screen.getByText('No file changes found')).toBeInTheDocument();
        expect(screen.getByText('No file type data available')).toBeInTheDocument();
        expect(screen.getByText('No trend data available')).toBeInTheDocument();
      });
    });

    it('handles API errors with retry functionality', async () => {
      const user = userEvent.setup();
      
      mockFetchCommitsWithFiles.mockResolvedValueOnce({
        error: 'Repository not found',
        rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
      });

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText('Error Loading File Change Data')).toBeInTheDocument();
        expect(screen.getByText('Repository not found')).toBeInTheDocument();
      });

      // Test retry functionality
      mockFetchCommitsWithFiles.mockResolvedValueOnce({
        data: mockCommitFileData,
        rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
      });

      const retryButton = screen.getByText('Try Again');
      await user.click(retryButton);

      // Verify successful retry
      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });
    });

    it('displays progress indicator during long operations', async () => {
      let progressCallback: ((processed: number, total: number) => void) | undefined;
      
      mockFetchCommitsWithFiles.mockImplementation((...args: any[]) => {
        const options = args[5] || {};
        progressCallback = options.onProgress;
        
        return new Promise(resolve => {
          // Simulate progress updates
          setTimeout(() => {
            if (progressCallback) {
              progressCallback(25, 100);
            }
          }, 50);
          
          setTimeout(() => {
            if (progressCallback) {
              progressCallback(50, 100);
            }
          }, 100);
          
          setTimeout(() => {
            if (progressCallback) {
              progressCallback(100, 100);
            }
            resolve({
              data: mockCommitFileData,
              rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
            });
          }, 150);
        });
      });

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Should show progress indicator
      await waitFor(() => {
        expect(screen.getByText(/Processing commits/)).toBeInTheDocument();
      });

      // Progress should update
      await waitFor(() => {
        expect(screen.getByText('25 of 100 processed')).toBeInTheDocument();
      });

      // Eventually complete
      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });
    });

    it('handles rate limit warnings appropriately', async () => {
      mockFetchCommitsWithFiles.mockResolvedValue({
        data: mockCommitFileData,
        rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 },
        rateLimitWarning: true,
      });

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('Rate limit warning')).toBeInTheDocument();
        expect(screen.getByText('Analysis may be incomplete due to GitHub API rate limits')).toBeInTheDocument();
      });

      // Data should still be displayed
      expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    it('synchronizes file selection across components', async () => {
      const user = userEvent.setup();
      
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });

      // Select a file
      const fileButton = screen.getByText('src/components/App.tsx').closest('button');
      await user.click(fileButton!);

      // Verify trend chart shows selected file
      expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();

      // Deselect by clicking again
      await user.click(fileButton!);

      // Verify trend chart shows empty state
      expect(screen.getByText('Select a file to view its change trend.')).toBeInTheDocument();
    });

    it('updates all components when time period changes', async () => {
      const user = userEvent.setup();
      
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });

      // Change time period
      const periodButton = screen.getByText('30 Days');
      await user.click(periodButton);

      // Verify all components update
      await waitFor(() => {
        expect(mockFilterCommitsByTimePeriod).toHaveBeenCalledWith(mockCommitFileData, '30d');
        expect(mockProcessFileChangeData).toHaveBeenCalledWith(mockCommitFileData, '30d');
      });
    });

    it('maintains component state during interactions', async () => {
      const user = userEvent.setup();
      
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
      });

      // Select a file
      const fileButton = screen.getByText('src/components/App.tsx').closest('button');
      await user.click(fileButton!);

      // Change time period - should reset file selection
      const periodButton = screen.getByText('30 Days');
      await user.click(periodButton);

      // File selection should be reset
      await waitFor(() => {
        expect(screen.getByText('Select a file to view its change trend.')).toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('handles large datasets efficiently', async () => {
      // Create large dataset
      const largeCommitData = Array.from({ length: 1000 }, (_, i) => ({
        sha: `commit-${i}`,
        date: `2024-01-${String(i % 30 + 1).padStart(2, '0')}T10:00:00Z`,
        author: `Author ${i}`,
        message: `Commit ${i}`,
        files: [
          {
            filename: `src/file-${i % 100}.js`,
            status: 'modified' as const,
            changes: Math.floor(Math.random() * 20) + 1,
            additions: Math.floor(Math.random() * 15) + 1,
            deletions: Math.floor(Math.random() * 5),
          },
        ],
      }));

      mockFetchCommitsWithFiles.mockResolvedValue({
        data: largeCommitData,
        rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
      });

      mockFilterCommitsByTimePeriod.mockReturnValue(largeCommitData);

      const largeAnalysisData = {
        ...mockAnalysisData,
        files: Array.from({ length: 100 }, (_, i) => ({
          filename: `src/file-${i}.js`,
          changeCount: Math.floor(Math.random() * 50) + 1,
          percentage: Math.random() * 100,
          lastChanged: '2024-01-15T10:30:00Z',
          fileType: 'JavaScript',
          isDeleted: false,
          trendData: [{ date: '2024-01-15', changes: 1 }],
        })),
        totalChanges: 5000,
      };

      mockProcessFileChangeData.mockReturnValue(largeAnalysisData);

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Should handle large dataset without performance issues
      await waitFor(() => {
        expect(screen.getByText('100 files • 5000 total changes')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('cleans up resources on unmount', () => {
      const { unmount } = render(<MostChangedFiles owner="test-owner" repo="test-repo" />);
      
      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('recovers from partial API failures', async () => {
      // Mock partial failure - some commits succeed, others fail
      mockFetchCommitsWithFiles.mockImplementation((...args: any[]) => {
        const options = args[5] || {};
        const onProgress = options.onProgress;
        
        return new Promise(resolve => {
          setTimeout(() => {
            if (onProgress) {
              onProgress(50, 100);
            }
            resolve({
              data: mockCommitFileData.slice(0, 1), // Only partial data
              rateLimit: { remaining: 10, reset: Date.now() + 3600000, limit: 5000 },
              rateLimitWarning: true,
            });
          }, 100);
        });
      });

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('Rate limit warning')).toBeInTheDocument();
      });

      // Should still show available data
      expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
    });

    it('handles network interruptions gracefully', async () => {
      mockFetchCommitsWithFiles.mockRejectedValue(new Error('Network error'));

      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      await waitFor(() => {
        expect(screen.getByText('An unexpected error occurred while fetching file change data.')).toBeInTheDocument();
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });
});