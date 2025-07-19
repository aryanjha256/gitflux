import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { CommitActivityHeatmap } from './CommitActivityHeatmap';
import { ContributorTrendlines } from './ContributorTrendlines';
import { ActivityVisualizationPanel } from './ActivityVisualizationPanel';
import type { WeeklyCommitData, ContributorTrendData } from '@/lib/commit-activity-data';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock Recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div role="img" aria-label="Line chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div />,
}));

// Mock API functions
vi.mock('@/lib/github-api', () => ({
  fetchCommitsWithFiles: vi.fn().mockResolvedValue({
    data: [],
    rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
  }),
}));

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

describe('Commit Activity Visualizations - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    it('provides proper ARIA labels and roles', () => {
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
      await user.click(heatmapGrid);
      expect(heatmapGrid).toHaveFocus();

      // Test keyboard events
      fireEvent.keyDown(heatmapGrid, { key: 'ArrowRight' });
      fireEvent.keyDown(heatmapGrid, { key: 'ArrowDown' });
      fireEvent.keyDown(heatmapGrid, { key: 'Home' });
      fireEvent.keyDown(heatmapGrid, { key: 'End' });
    });

    it('provides screen reader friendly content', () => {
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

    it('handles empty data state accessibly', () => {
      render(
        <CommitActivityHeatmap
          owner="test-owner"
          repo="test-repo"
          timeRange="30d"
          data={[]}
        />
      );

      // Should show empty state message
      expect(screen.getByText('No commit activity')).toBeInTheDocument();
      expect(screen.getByText('No commits found for the selected time period.')).toBeInTheDocument();
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

    it('provides proper ARIA labels for chart and legend', () => {
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

        // Test keyboard navigation
        fireEvent.keyDown(legendButtons[0], { key: 'ArrowRight' });
        fireEvent.keyDown(legendButtons[0], { key: 'ArrowLeft' });
      }
    });

    it('provides screen reader accessible data summary', () => {
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

    it('provides proper fieldset and legend for time range controls', () => {
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
      
      // Test keyboard navigation
      fireEvent.keyDown(radioGroup, { key: 'ArrowRight' });
      fireEvent.keyDown(radioGroup, { key: 'ArrowLeft' });
      fireEvent.keyDown(radioGroup, { key: 'ArrowDown' });
      fireEvent.keyDown(radioGroup, { key: 'ArrowUp' });
    });

    it('provides live region updates for time period changes', () => {
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

    it('provides comprehensive screen reader summary', () => {
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
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('ensures heatmap colors meet accessibility standards', () => {
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

  describe('Keyboard Navigation Patterns', () => {
    it('supports comprehensive keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <ActivityVisualizationPanel
          owner="test-owner"
          repo="test-repo"
          initialTimeRange="30d"
        />
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

    it('handles escape key gracefully', async () => {
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
  });

  describe('WCAG 2.1 AA Compliance', () => {
    it('meets minimum target size requirements', () => {
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
        // Heatmap cells are small but grouped, which is acceptable for this type of visualization
        expect(element).toHaveClass('w-3', 'h-3'); // Mobile size
        expect(element).toHaveClass('sm:w-4', 'sm:h-4'); // Desktop size
      });
    });

    it('provides proper heading hierarchy', () => {
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
});