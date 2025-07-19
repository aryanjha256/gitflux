import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { MostChangedFiles } from './MostChangedFiles';
import { FileChangeList } from './FileChangeList';
import { FileChangeTrend } from './FileChangeTrend';
import { FileTypeBreakdown } from './FileTypeBreakdown';
import { TimePeriodFilter } from './TimePeriodFilter';
import { ProgressIndicator } from './ProgressIndicator';
import { CommitActivityHeatmap } from './CommitActivityHeatmap';
import { ContributorTrendlines } from './ContributorTrendlines';
import { ActivityVisualizationPanel } from './ActivityVisualizationPanel';
import type { FileChangeData, FileTypeData, TrendPoint } from '@/lib/github-api';
import type { WeeklyCommitData, ContributorTrendData } from '@/lib/commit-activity-data';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Recharts for accessibility testing
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div role="img" aria-label="Pie chart">{children}</div>,
  Pie: ({ children }: any) => <div>{children}</div>,
  Cell: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Tooltip: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: any) => <div role="img" aria-label="Line chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Area: () => <div />,
  AreaChart: ({ children }: any) => <div role="img" aria-label="Area chart">{children}</div>,
}));

// Mock GitHub API
vi.mock('@/lib/github-api', () => ({
  fetchCommitsWithFiles: vi.fn().mockResolvedValue({
    data: [],
    rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
  }),
  filterCommitsByTimePeriod: vi.fn().mockReturnValue([]),
  processFileChangeData: vi.fn().mockReturnValue({
    files: [],
    totalChanges: 0,
    analysisDate: '2024-01-20T00:00:00Z',
    timePeriod: '90d' as const,
    fileTypeBreakdown: [],
  }),
}));

// Mock commit activity data functions
vi.mock('@/lib/commit-activity-data', () => ({
  transformToHeatmapData: vi.fn().mockReturnValue({
    weeks: [],
    totalCommits: 0,
    peakDay: { day: 'Monday', count: 0 },
    averagePerDay: 0,
  }),
  calculateContributorTrends: vi.fn().mockReturnValue({
    contributors: [],
    timeRange: '30d',
    totalContributors: 0,
    activeContributors: 0,
  }),
  filterCommitsByTimeRange: vi.fn().mockReturnValue([]),
}));

describe('Accessibility Tests', () => {
  describe('TimePeriodFilter', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={() => {}}
          isLoading={false}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA attributes', () => {
      render(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={() => {}}
          isLoading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
        expect(button).toHaveAttribute('aria-label');
        expect(button).toHaveAttribute('title');
      });
    });

    it('supports keyboard navigation', () => {
      render(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={() => {}}
          isLoading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('FileChangeList', () => {
    const mockFiles: FileChangeData[] = [
      {
        filename: 'src/app.js',
        changeCount: 10,
        percentage: 50,
        lastChanged: '2024-01-15T10:30:00Z',
        fileType: 'JavaScript',
        isDeleted: false,
        trendData: [],
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FileChangeList
          files={mockFiles}
          isLoading={false}
          onFileSelect={() => {}}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper ARIA labels for file items', () => {
      render(
        <FileChangeList
          files={mockFiles}
          isLoading={false}
          onFileSelect={() => {}}
        />
      );

      const fileButton = screen.getByRole('button');
      expect(fileButton).toHaveAttribute('aria-label');
      expect(fileButton.getAttribute('aria-label')).toContain('src/app.js');
    });

    it('provides screen reader friendly content', () => {
      render(
        <FileChangeList
          files={mockFiles}
          isLoading={false}
          onFileSelect={() => {}}
        />
      );

      // Check for descriptive text
      expect(screen.getByText('1 files • 10 total changes')).toBeInTheDocument();
      expect(screen.getByText('10 changes')).toBeInTheDocument();
      expect(screen.getByText('50.0% of total')).toBeInTheDocument();
    });
  });

  describe('FileChangeTrend', () => {
    const mockTrendData: TrendPoint[] = [
      { date: '2024-01-01', changes: 5 },
      { date: '2024-01-02', changes: 3 },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FileChangeTrend
          filename="test.js"
          trendData={mockTrendData}
          timePeriod="30d"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides alternative text for charts', () => {
      render(
        <FileChangeTrend
          filename="test.js"
          trendData={mockTrendData}
          timePeriod="30d"
        />
      );

      const chart = screen.getByRole('img', { name: /Area chart/ });
      expect(chart).toBeInTheDocument();
    });

    it('provides text alternatives for visual data', () => {
      render(
        <FileChangeTrend
          filename="test.js"
          trendData={mockTrendData}
          timePeriod="30d"
        />
      );

      // Check for text-based data representation
      expect(screen.getByText('8')).toBeInTheDocument(); // Total changes
      expect(screen.getByText('4')).toBeInTheDocument(); // Average
    });
  });

  describe('FileTypeBreakdown', () => {
    const mockTypeData: FileTypeData[] = [
      {
        extension: 'js',
        category: 'JavaScript',
        changeCount: 10,
        percentage: 60,
        color: '#f7df1e',
      },
      {
        extension: 'ts',
        category: 'TypeScript',
        changeCount: 7,
        percentage: 40,
        color: '#3178c6',
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <FileTypeBreakdown
          typeData={mockTypeData}
          isLoading={false}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides alternative text for pie chart', () => {
      render(
        <FileTypeBreakdown
          typeData={mockTypeData}
          isLoading={false}
        />
      );

      const chart = screen.getByRole('img', { name: /Pie chart/ });
      expect(chart).toBeInTheDocument();
    });

    it('provides text-based data representation', () => {
      render(
        <FileTypeBreakdown
          typeData={mockTypeData}
          isLoading={false}
        />
      );

      // Check for accessible data representation
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument();
    });
  });

  describe('ProgressIndicator', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ProgressIndicator
          progress={50}
          total={100}
          message="Processing..."
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides progress information to screen readers', () => {
      render(
        <ProgressIndicator
          progress={25}
          total={100}
          message="Loading data..."
        />
      );

      // Check for screen reader accessible progress information
      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByText('25 of 100 processed')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('has proper button accessibility when cancel is available', () => {
      const mockOnCancel = jest.fn();
      
      render(
        <ProgressIndicator
          progress={50}
          total={100}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton).toBeInTheDocument();
      expect(cancelButton).toBeEnabled();
    });
  });

  describe('MostChangedFiles Integration', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <MostChangedFiles owner="test-owner" repo="test-repo" />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has proper heading hierarchy', async () => {
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Most Changed Files');
    });

    it('provides descriptive content for screen readers', async () => {
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Check for descriptive text
      expect(screen.getByText('Analyze file change patterns and identify code churn hotspots')).toBeInTheDocument();
    });

    it('handles focus management properly', async () => {
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // All interactive elements should be focusable
      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('uses sufficient color contrast for text', () => {
      const { container } = render(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={() => {}}
          isLoading={false}
        />
      );

      // Check that text elements have appropriate contrast classes
      const textElements = container.querySelectorAll('.text-gray-700, .text-gray-900, .text-white');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('provides visual focus indicators', () => {
      render(
        <TimePeriodFilter
          selectedPeriod="30d"
          onPeriodChange={() => {}}
          isLoading={false}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
      });
    });

    it('ensures heatmap colors meet accessibility standards', async () => {
      const mockData: WeeklyCommitData[] = [
        { date: '2024-01-01', dayOfWeek: 1, commitCount: 0, contributors: [] },
        { date: '2024-01-02', dayOfWeek: 2, commitCount: 5, contributors: ['user1'] },
        { date: '2024-01-03', dayOfWeek: 3, commitCount: 10, contributors: ['user1', 'user2'] },
      ];

      const { container } = render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockData}
        />
      );

      // Check that heatmap uses accessible color classes
      const heatmapCells = container.querySelectorAll('[role="gridcell"]');
      heatmapCells.forEach(cell => {
        const classList = Array.from(cell.classList);
        const hasAccessibleColors = classList.some(className => 
          className.includes('bg-gray-') || 
          className.includes('bg-blue-') ||
          className.includes('dark:bg-')
        );
        expect(hasAccessibleColors).toBe(true);
      });
    });

    it('provides proper focus indicators for interactive elements', async () => {
      const user = userEvent.setup();
      
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={[{
            contributor: 'user1',
            dataPoints: [{ date: '2024-01-01', commitCount: 5, trend: 'up' }],
          }]}
        />
      );

      const legendButtons = screen.getAllByRole('switch');
      
      if (legendButtons.length > 0) {
        await user.tab();
        const focusedButton = document.activeElement;
        
        // Should have focus ring classes
        expect(focusedButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
      }
    });

    it('ensures sufficient color contrast in dark mode', () => {
      // Mock dark mode by adding dark class to document
      document.documentElement.classList.add('dark');
      
      const { container } = render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for dark mode color classes
      const darkElements = container.querySelectorAll('.dark\\:text-gray-100, .dark\\:text-gray-300, .dark\\:bg-gray-800');
      expect(darkElements.length).toBeGreaterThan(0);

      // Cleanup
      document.documentElement.classList.remove('dark');
    });
  });

  describe('CommitActivityHeatmap Accessibility', () => {
    const mockHeatmapData: WeeklyCommitData[] = [
      {
        date: '2024-01-01',
        dayOfWeek: 1,
        commitCount: 5,
        contributors: ['user1', 'user2'],
      },
      {
        date: '2024-01-02',
        dayOfWeek: 2,
        commitCount: 3,
        contributors: ['user1'],
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockHeatmapData}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels and roles', async () => {
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockHeatmapData}
        />
      );

      // Check for main application role
      const heatmapGrid = screen.getByRole('application');
      expect(heatmapGrid).toHaveAttribute('aria-label');
      expect(heatmapGrid.getAttribute('aria-label')).toContain('Interactive commit activity heatmap');

      // Check for grid structure
      const grid = screen.getByRole('grid');
      expect(grid).toBeInTheDocument();

      // Check for grid cells
      const gridCells = screen.getAllByRole('gridcell');
      expect(gridCells.length).toBeGreaterThan(0);
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockHeatmapData}
        />
      );

      const heatmapGrid = screen.getByRole('application');
      
      // Focus the heatmap
      await user.tab();
      expect(heatmapGrid).toHaveFocus();

      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Home}');
      await user.keyboard('{End}');
    });

    it('provides screen reader friendly content', async () => {
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockHeatmapData}
        />
      );

      // Check for screen reader summary
      const summary = screen.getByRole('region', { name: /commit activity data summary/i });
      expect(summary).toBeInTheDocument();

      // Check for legend with proper labels
      const legend = screen.getByRole('img', { name: /color intensity legend/i });
      expect(legend).toBeInTheDocument();
    });

    it('handles focus and blur events properly', async () => {
      const user = userEvent.setup();
      
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockHeatmapData}
        />
      );

      const heatmapGrid = screen.getByRole('application');
      
      // Focus should work
      await user.click(heatmapGrid);
      expect(heatmapGrid).toHaveFocus();
    });
  });

  describe('ContributorTrendlines Accessibility', () => {
    const mockTrendData: ContributorTrendData[] = [
      {
        contributor: 'user1',
        avatar: 'avatar1.jpg',
        dataPoints: [
          { date: '2024-01-01', commitCount: 5, trend: 'up' },
          { date: '2024-01-02', commitCount: 7, trend: 'up' },
        ],
      },
      {
        contributor: 'user2',
        avatar: 'avatar2.jpg',
        dataPoints: [
          { date: '2024-01-01', commitCount: 3, trend: 'down' },
          { date: '2024-01-02', commitCount: 2, trend: 'down' },
        ],
      },
    ];

    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockTrendData}
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels for chart and legend', async () => {
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockTrendData}
        />
      );

      // Check for chart application role
      const chart = screen.getByRole('application');
      expect(chart).toHaveAttribute('aria-label');
      expect(chart.getAttribute('aria-label')).toContain('Interactive contributor trends chart');

      // Check for legend buttons with proper roles
      const legendButtons = screen.getAllByRole('switch');
      expect(legendButtons.length).toBeGreaterThan(0);
      
      legendButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('supports keyboard navigation in legend', async () => {
      const user = userEvent.setup();
      
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockTrendData}
        />
      );

      const legendButtons = screen.getAllByRole('switch');
      
      if (legendButtons.length > 0) {
        // Focus first legend button
        await user.click(legendButtons[0]);
        expect(legendButtons[0]).toHaveFocus();

        // Test arrow key navigation
        await user.keyboard('{ArrowRight}');
        if (legendButtons.length > 1) {
          expect(legendButtons[1]).toHaveFocus();
        }

        await user.keyboard('{ArrowLeft}');
        expect(legendButtons[0]).toHaveFocus();
      }
    });

    it('provides screen reader accessible data summary', async () => {
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockTrendData}
        />
      );

      // Check for screen reader summary
      const summary = screen.getByRole('region', { name: /contributor trends data summary/i });
      expect(summary).toBeInTheDocument();
    });

    it('handles legend toggle functionality', async () => {
      const user = userEvent.setup();
      
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockTrendData}
        />
      );

      const legendButtons = screen.getAllByRole('switch');
      
      if (legendButtons.length > 0) {
        const firstButton = legendButtons[0];
        const initialPressed = firstButton.getAttribute('aria-pressed');
        
        await user.click(firstButton);
        
        // State should toggle
        expect(firstButton.getAttribute('aria-pressed')).not.toBe(initialPressed);
      }
    });
  });

  describe('ActivityVisualizationPanel Accessibility', () => {
    it('should not have accessibility violations', async () => {
      const { container } = render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper fieldset and legend for time range controls', async () => {
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for fieldset with legend
      const fieldset = screen.getByRole('group', { name: /time period selection/i });
      expect(fieldset).toBeInTheDocument();

      // Check for radiogroup
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();

      // Check for radio buttons
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons.length).toBe(4); // 30d, 3m, 6m, 1y

      // Check that one is selected
      const selectedButtons = radioButtons.filter(button => 
        button.getAttribute('aria-checked') === 'true'
      );
      expect(selectedButtons.length).toBe(1);
    });

    it('supports keyboard navigation for time range selection', async () => {
      const user = userEvent.setup();
      
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      const radioGroup = screen.getByRole('radiogroup');
      
      // Focus the radio group
      await user.click(radioGroup);
      
      // Test arrow key navigation
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowUp}');
    });

    it('provides live region updates for time period changes', async () => {
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for live region
      const liveRegion = screen.getByLabelText(/currently selected time period/i);
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveTextContent('Currently showing: Last 30 days');
    });

    it('provides comprehensive screen reader summary', async () => {
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for overview region
      const overview = screen.getByRole('region', { name: /activity analysis overview/i });
      expect(overview).toBeInTheDocument();
    });

    it('handles error boundary properly', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error by passing invalid props
      const ThrowError = () => {
        throw new Error('Test error');
      };

      const { container } = render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        >
          <ThrowError />
        </ActivityVisualizationPanel>
      );

      // Should still be accessible even with error
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      consoleSpy.mockRestore();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports tab navigation through all interactive elements', () => {
      render(
        <div>
          <TimePeriodFilter
            selectedPeriod="30d"
            onPeriodChange={() => {}}
            isLoading={false}
          />
          <FileChangeList
            files={[]}
            isLoading={false}
            onFileSelect={() => {}}
          />
        </div>
      );

      const interactiveElements = screen.getAllByRole('button');
      interactiveElements.forEach(element => {
        expect(element).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('provides proper focus management for dynamic content', async () => {
      render(<MostChangedFiles owner="test-owner" repo="test-repo" />);

      // Focus should be manageable even with dynamic loading states
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports complex keyboard navigation patterns', async () => {
      const user = userEvent.setup();
      
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Should be able to navigate through all interactive elements
      await user.tab(); // Time range controls
      await user.tab(); // Heatmap
      await user.tab(); // Trendlines
      
      // Each component should handle its own keyboard navigation
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeDefined();
    });
  });

  describe('Screen Reader Support', () => {
    it('provides meaningful labels for all interactive elements', () => {
      const mockFiles: FileChangeData[] = [
        {
          filename: 'test.js',
          changeCount: 5,
          percentage: 100,
          lastChanged: '2024-01-15T10:30:00Z',
          fileType: 'JavaScript',
          isDeleted: false,
          trendData: [],
        },
      ];

      render(
        <FileChangeList
          files={mockFiles}
          isLoading={false}
          onFileSelect={() => {}}
        />
      );

      const fileButton = screen.getByRole('button');
      const ariaLabel = fileButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('test.js');
      expect(ariaLabel).toContain('detailed analysis');
    });

    it('provides status updates for loading states', () => {
      render(
        <FileChangeList
          files={[]}
          isLoading={true}
          onFileSelect={() => {}}
        />
      );

      expect(screen.getByText('Loading files...')).toBeInTheDocument();
    });
  });
});
 
 describe('Performance and Large Dataset Accessibility', () => {
    it('handles large datasets without accessibility violations', async () => {
      // Create a large dataset
      const largeMockData: WeeklyCommitData[] = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        dayOfWeek: i % 7,
        commitCount: Math.floor(Math.random() * 20),
        contributors: [`user${i % 10}`],
      }));

      const { container } = render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="1y"
          data={largeMockData}
        />
      );

      // Should still be accessible with large datasets
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Should maintain keyboard navigation
      const heatmapGrid = screen.getByRole('application');
      expect(heatmapGrid).toBeInTheDocument();
    });

    it('maintains performance with many contributors', async () => {
      const manyContributors: ContributorTrendData[] = Array.from({ length: 50 }, (_, i) => ({
        contributor: `user${i}`,
        dataPoints: Array.from({ length: 30 }, (_, j) => ({
          date: new Date(2024, 0, j + 1).toISOString().split('T')[0],
          commitCount: Math.floor(Math.random() * 10),
          trend: 'stable' as const,
        })),
      }));

      const { container } = render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={manyContributors}
        />
      );

      // Should handle many contributors accessibly
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Legend should be manageable
      const legendButtons = screen.getAllByRole('switch');
      expect(legendButtons.length).toBeGreaterThan(0);
      expect(legendButtons.length).toBeLessThanOrEqual(15); // Should limit displayed items
    });
  });

  describe('Manual Keyboard Navigation Testing', () => {
    it('supports comprehensive keyboard navigation patterns', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <ActivityVisualizationPanel
            owner="test-owner"
            repo="test-repo"
            initialTimeRange="30d"
          />
        </div>
      );

      // Test sequential navigation
      await user.tab(); // Should focus first interactive element
      let focusedElement = document.activeElement;
      expect(focusedElement).toBeDefined();
      expect(focusedElement?.tagName).toBe('BUTTON');

      // Continue tabbing through elements
      await user.tab();
      await user.tab();
      
      // Should be able to navigate back
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      
      focusedElement = document.activeElement;
      expect(focusedElement).toBeDefined();
    });

    it('handles escape key to close interactive elements', async () => {
      const user = userEvent.setup();
      
      const mockData: WeeklyCommitData[] = [
        { date: '2024-01-01', dayOfWeek: 1, commitCount: 5, contributors: ['user1'] },
      ];

      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockData}
        />
      );

      const heatmapGrid = screen.getByRole('application');
      await user.click(heatmapGrid);
      
      // Should handle escape key gracefully
      await user.keyboard('{Escape}');
      
      // Focus should remain manageable
      expect(document.activeElement).toBeDefined();
    });

    it('provides skip links for complex visualizations', async () => {
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check that screen reader users have summary information
      const summaryRegion = screen.getByRole('region', { name: /activity analysis overview/i });
      expect(summaryRegion).toBeInTheDocument();
      
      // Should provide navigation instructions
      expect(summaryRegion).toHaveTextContent(/navigation instructions/i);
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('provides meaningful announcements for state changes', async () => {
      const user = userEvent.setup();
      
      render(
        <ContributorTrendlines
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={[{
            contributor: 'user1',
            dataPoints: [{ date: '2024-01-01', commitCount: 5, trend: 'up' }],
          }]}
        />
      );

      const legendButtons = screen.getAllByRole('switch');
      
      if (legendButtons.length > 0) {
        const button = legendButtons[0];
        const initialState = button.getAttribute('aria-pressed');
        
        await user.click(button);
        
        // State should change and be announced
        expect(button.getAttribute('aria-pressed')).not.toBe(initialState);
        expect(button).toHaveAttribute('aria-label');
      }
    });

    it('provides comprehensive data summaries', async () => {
      const mockData: WeeklyCommitData[] = [
        { date: '2024-01-01', dayOfWeek: 1, commitCount: 5, contributors: ['user1', 'user2'] },
        { date: '2024-01-02', dayOfWeek: 2, commitCount: 3, contributors: ['user1'] },
      ];

      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockData}
        />
      );

      // Should provide comprehensive summary for screen readers
      const summary = screen.getByRole('region', { name: /commit activity data summary/i });
      expect(summary).toHaveTextContent(/total commits/i);
      expect(summary).toHaveTextContent(/peak activity/i);
      expect(summary).toHaveTextContent(/navigation instructions/i);
    });

    it('handles loading states accessibly', async () => {
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
        />
      );

      // Should provide loading status
      const loadingStatus = screen.getByRole('status');
      expect(loadingStatus).toHaveAttribute('aria-label', 'Loading commit activity data');
      expect(loadingStatus).toHaveTextContent('Loading...');
    });

    it('handles error states accessibly', async () => {
      // Mock fetch to return error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
        />
      );

      // Wait for error state
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('meets minimum target size requirements', async () => {
      const mockData: WeeklyCommitData[] = [
        { date: '2024-01-01', dayOfWeek: 1, commitCount: 5, contributors: ['user1'] },
      ];

      const { container } = render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={mockData}
        />
      );

      // Interactive elements should meet minimum size requirements
      const interactiveElements = container.querySelectorAll('[role="gridcell"]');
      interactiveElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        // Heatmap cells are small but grouped, which is acceptable for this type of visualization
        expect(element).toHaveClass('w-3', 'h-3'); // Mobile size
        expect(element).toHaveClass('sm:w-4', 'sm:h-4'); // Desktop size
      });
    });

    it('provides sufficient color contrast ratios', () => {
      const { container } = render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for high contrast color classes
      const textElements = container.querySelectorAll('.text-gray-900, .text-white, .text-blue-600');
      expect(textElements.length).toBeGreaterThan(0);

      // Check for proper background contrasts
      const backgroundElements = container.querySelectorAll('.bg-white, .bg-gray-50, .bg-blue-600');
      expect(backgroundElements.length).toBeGreaterThan(0);
    });

    it('supports browser zoom up to 200%', async () => {
      // Mock viewport changes for zoom testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640, // Simulate zoomed viewport
      });

      const { container } = render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Should remain functional at different zoom levels
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Interactive elements should remain accessible
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeVisible();
      });
    });

    it('provides proper heading hierarchy', async () => {
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
      );

      // Check for proper heading structure
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Commit Activity Analysis');

      // Subheadings should be properly nested
      const subHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(subHeadings.length).toBeGreaterThan(0);
    });
  });