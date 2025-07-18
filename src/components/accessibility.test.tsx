import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { MostChangedFiles } from './MostChangedFiles';
import { FileChangeList } from './FileChangeList';
import { FileChangeTrend } from './FileChangeTrend';
import { FileTypeBreakdown } from './FileTypeBreakdown';
import { TimePeriodFilter } from './TimePeriodFilter';
import { ProgressIndicator } from './ProgressIndicator';
import type { FileChangeData, FileTypeData, TrendPoint } from '@/lib/github-api';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock Recharts for accessibility testing
jest.mock('recharts', () => ({
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
jest.mock('@/lib/github-api', () => ({
  ...jest.requireActual('@/lib/github-api'),
  fetchCommitsWithFiles: jest.fn().mockResolvedValue({
    data: [],
    rateLimit: { remaining: 100, reset: Date.now() + 3600000, limit: 5000 },
  }),
  filterCommitsByTimePeriod: jest.fn().mockReturnValue([]),
  processFileChangeData: jest.fn().mockReturnValue({
    files: [],
    totalChanges: 0,
    analysisDate: '2024-01-20T00:00:00Z',
    timePeriod: '90d' as const,
    fileTypeBreakdown: [],
  }),
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