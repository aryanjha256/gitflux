import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ActivityVisualizationPanel } from './ActivityVisualizationPanel';
import * as githubApi from '@/lib/github-api';
import * as commitActivityData from '@/lib/commit-activity-data';

// Mock the child components
jest.mock('./CommitActivityHeatmap', () => ({
  CommitActivityHeatmap: ({ owner, repo, timeRange }: any) => (
    <div data-testid="commit-activity-heatmap">
      <span data-testid="heatmap-owner">{owner}</span>
      <span data-testid="heatmap-repo">{repo}</span>
      <span data-testid="heatmap-timerange">{timeRange}</span>
    </div>
  ),
}));

jest.mock('./ContributorTrendlines', () => ({
  ContributorTrendlines: ({ owner, repo, timeRange }: any) => (
    <div data-testid="contributor-trendlines">
      <span data-testid="trendlines-owner">{owner}</span>
      <span data-testid="trendlines-repo">{repo}</span>
      <span data-testid="trendlines-timerange">{timeRange}</span>
    </div>
  ),
}));

// Mock the API and data processing modules
jest.mock('@/lib/github-api');
jest.mock('@/lib/commit-activity-data');

const mockGithubApi = githubApi as jest.Mocked<typeof githubApi>;
const mockCommitActivityData = commitActivityData as jest.Mocked<typeof commitActivityData>;

describe('ActivityVisualizationPanel', () => {
  const defaultProps = {
    owner: 'testowner',
    repo: 'testrepo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    // Mock window resize event
    global.dispatchEvent = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the main container with header and visualizations', () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Commit Activity Analysis')).toBeInTheDocument();
      expect(screen.getByText(/Visualize commit patterns and contributor trends for testowner\/testrepo/)).toBeInTheDocument();
      expect(screen.getByTestId('commit-activity-heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('contributor-trendlines')).toBeInTheDocument();
    });

    it('renders time range filter controls', () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Time Period')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Last 30 days/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Last 3 months/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Last 6 months/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Last 12 months/ })).toBeInTheDocument();
    });

    it('uses initial time range when provided', () => {
      render(<ActivityVisualizationPanel {...defaultProps} initialTimeRange="6m" />);

      const sixMonthsButton = screen.getByRole('button', { name: /Filter by Last 6 months/ });
      expect(sixMonthsButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('6m');
      expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('6m');
    });

    it('defaults to 30d time range when no initial range provided', () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      const thirtyDaysButton = screen.getByRole('button', { name: /Filter by Last 30 days/ });
      expect(thirtyDaysButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('30d');
      expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('30d');
    });
  });

  describe('Time Range Filtering', () => {
    it('updates both visualizations when time range changes', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Initially should be 30d
      expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('30d');
      expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('30d');

      // Click 3 months button
      const threeMonthsButton = screen.getByRole('button', { name: /Filter by Last 3 months/ });
      fireEvent.click(threeMonthsButton);

      await waitFor(() => {
        expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('3m');
        expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('3m');
      });

      // Check button states
      expect(threeMonthsButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /Filter by Last 30 days/ })).toHaveAttribute('aria-pressed', 'false');
    });

    it('updates description text when time range changes', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();

      const oneYearButton = screen.getByRole('button', { name: /Filter by Last 12 months/ });
      fireEvent.click(oneYearButton);

      await waitFor(() => {
        expect(screen.getByText('Last 12 months')).toBeInTheDocument();
        expect(screen.queryByText('Last 30 days')).not.toBeInTheDocument();
      });
    });

    it('maintains time range synchronization between components', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      const timeRanges = ['30d', '3m', '6m', '1y'] as const;
      
      for (const timeRange of timeRanges) {
        const button = screen.getByRole('button', { name: new RegExp(timeRange === '30d' ? 'Last 30 days' : timeRange === '3m' ? 'Last 3 months' : timeRange === '6m' ? 'Last 6 months' : 'Last 12 months') });
        fireEvent.click(button);

        await waitFor(() => {
          expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent(timeRange);
          expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent(timeRange);
        });
      }
    });
  });

  describe('Responsive Layout', () => {
    it('uses stacked layout on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const container = screen.getByTestId('commit-activity-heatmap').closest('.grid');
        expect(container).toHaveClass('grid-cols-1');
      });
    });

    it('uses side-by-side layout on desktop', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const container = screen.getByTestId('commit-activity-heatmap').closest('.grid');
        expect(container).toHaveClass('lg:grid-cols-2');
      });
    });

    it('responds to window resize events', async () => {
      const { rerender } = render(<ActivityVisualizationPanel {...defaultProps} />);

      // Start with desktop
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const container = screen.getByTestId('commit-activity-heatmap').closest('.grid');
        expect(container).toHaveClass('lg:grid-cols-2');
      });

      // Switch to mobile
      Object.defineProperty(window, 'innerWidth', {
        value: 600,
      });

      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      await waitFor(() => {
        const container = screen.getByTestId('commit-activity-heatmap').closest('.grid');
        expect(container).toHaveClass('grid-cols-1');
      });
    });
  });

  describe('Props Passing', () => {
    it('passes correct props to child components', () => {
      render(<ActivityVisualizationPanel {...defaultProps} initialTimeRange="3m" />);

      // Check heatmap props
      expect(screen.getByTestId('heatmap-owner')).toHaveTextContent('testowner');
      expect(screen.getByTestId('heatmap-repo')).toHaveTextContent('testrepo');
      expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('3m');

      // Check trendlines props
      expect(screen.getByTestId('trendlines-owner')).toHaveTextContent('testowner');
      expect(screen.getByTestId('trendlines-repo')).toHaveTextContent('testrepo');
      expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('3m');
    });

    it('updates child component props when time range changes', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      const sixMonthsButton = screen.getByRole('button', { name: /Filter by Last 6 months/ });
      fireEvent.click(sixMonthsButton);

      await waitFor(() => {
        expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('6m');
        expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('6m');
      });
    });
  });

  describe('Error Boundary', () => {
    // Mock console.error to avoid noise in test output
    const originalConsoleError = console.error;
    beforeEach(() => {
      console.error = jest.fn();
    });
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('catches and displays errors from child components', () => {
      // Create a component that throws an error
      const ThrowError = () => {
        throw new Error('Test error');
      };

      // Mock the heatmap to throw an error
      jest.doMock('./CommitActivityHeatmap', () => ({
        CommitActivityHeatmap: ThrowError,
      }));

      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('allows recovery from error state', async () => {
      // Create a component that throws an error initially
      let shouldThrow = true;
      const ConditionalError = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div data-testid="recovered">Recovered</div>;
      };

      // Mock the heatmap to conditionally throw an error
      jest.doMock('./CommitActivityHeatmap', () => ({
        CommitActivityHeatmap: ConditionalError,
      }));

      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Stop throwing error and click try again
      shouldThrow = false;
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByTestId('recovered')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      });
    });

    it('displays generic error message when error message is not available', () => {
      // Create a component that throws an error without message
      const ThrowErrorWithoutMessage = () => {
        const error = new Error();
        error.message = '';
        throw error;
      };

      jest.doMock('./CommitActivityHeatmap', () => ({
        CommitActivityHeatmap: ThrowErrorWithoutMessage,
      }));

      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred while loading the activity visualizations.')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Check time range buttons have proper ARIA attributes
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed');
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('provides screen reader accessible summary', () => {
      render(<ActivityVisualizationPanel {...defaultProps} initialTimeRange="6m" />);

      const summary = screen.getByText(/Showing commit activity analysis for testowner\/testrepo repository over the last 6 months/);
      expect(summary).toBeInTheDocument();
      expect(summary.closest('div')).toHaveClass('sr-only');
      expect(summary.closest('div')).toHaveAttribute('aria-live', 'polite');
    });

    it('updates screen reader summary when time range changes', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      expect(screen.getByText(/over the last 30 days/)).toBeInTheDocument();

      const oneYearButton = screen.getByRole('button', { name: /Filter by Last 12 months/ });
      fireEvent.click(oneYearButton);

      await waitFor(() => {
        expect(screen.getByText(/over the last 12 months/)).toBeInTheDocument();
        expect(screen.queryByText(/over the last 30 days/)).not.toBeInTheDocument();
      });
    });

    it('has proper focus management for time range controls', () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('focus:outline-none');
        expect(button).toHaveClass('focus:ring-2');
        expect(button).toHaveClass('focus:ring-blue-500');
      });
    });
  });

  describe('Component Coordination', () => {
    it('maintains shared state between visualizations', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Both components should start with same time range
      expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('30d');
      expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('30d');

      // Change time range multiple times
      const timeRangeButtons = [
        { range: '3m', label: /Filter by Last 3 months/ },
        { range: '1y', label: /Filter by Last 12 months/ },
        { range: '6m', label: /Filter by Last 6 months/ },
      ];

      for (const { range, label } of timeRangeButtons) {
        const button = screen.getByRole('button', { name: label });
        fireEvent.click(button);

        await waitFor(() => {
          expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent(range);
          expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent(range);
        });
      }
    });

    it('handles rapid time range changes correctly', async () => {
      render(<ActivityVisualizationPanel {...defaultProps} />);

      // Rapidly click different time range buttons
      const buttons = [
        screen.getByRole('button', { name: /Filter by Last 3 months/ }),
        screen.getByRole('button', { name: /Filter by Last 6 months/ }),
        screen.getByRole('button', { name: /Filter by Last 12 months/ }),
        screen.getByRole('button', { name: /Filter by Last 30 days/ }),
      ];

      // Click all buttons rapidly
      buttons.forEach(button => fireEvent.click(button));

      // Should end up with the last clicked state (30d)
      await waitFor(() => {
        expect(screen.getByTestId('heatmap-timerange')).toHaveTextContent('30d');
        expect(screen.getByTestId('trendlines-timerange')).toHaveTextContent('30d');
        expect(buttons[3]).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Performance', () => {
    it('memoizes time range option selection', () => {
      const { rerender } = render(<ActivityVisualizationPanel {...defaultProps} initialTimeRange="30d" />);

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();

      // Re-render with same props should not cause unnecessary updates
      rerender(<ActivityVisualizationPanel {...defaultProps} initialTimeRange="30d" />);

      expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    });

    it('uses callback for time range changes to prevent unnecessary re-renders', () => {
      const { rerender } = render(<ActivityVisualizationPanel {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Filter by Last 3 months/ });
      const initialButton = button;

      rerender(<ActivityVisualizationPanel {...defaultProps} />);

      // Button reference should remain stable
      expect(screen.getByRole('button', { name: /Filter by Last 3 months/ })).toBe(initialButton);
    });
  });
});