'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CommitActivityHeatmap } from './CommitActivityHeatmap';
import { ContributorTrendlines } from './ContributorTrendlines';
import { type TimeRange } from '@/lib/commit-activity-data';

interface ActivityVisualizationPanelProps {
  owner: string;
  repo: string;
  initialTimeRange?: TimeRange;
}

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '30d', label: '30 Days', description: 'Last 30 days' },
  { value: '3m', label: '3 Months', description: 'Last 3 months' },
  { value: '6m', label: '6 Months', description: 'Last 6 months' },
  { value: '1y', label: '1 Year', description: 'Last 12 months' },
];

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ActivityErrorBoundary extends React.Component<
  React.PropsWithChildren<{ onError?: (error: Error) => void }>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ onError?: (error: Error) => void }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ActivityVisualizationPanel Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-sm px-4">
                <div className="text-red-600 dark:text-red-400 mb-4" role="img" aria-label="Error icon">
                  <svg
                    className="mx-auto h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <p className="text-red-800 dark:text-red-200 font-medium text-sm mb-2">
                  Something went wrong
                </p>
                <p className="text-red-600 dark:text-red-300 text-xs leading-relaxed mb-4">
                  {this.state.error?.message || 'An unexpected error occurred while loading the activity visualizations.'}
                </p>
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined });
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-800 dark:text-red-200 dark:border-red-600 dark:hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Memoized component for performance optimization
export const ActivityVisualizationPanel = React.memo(function ActivityVisualizationPanel({ 
  owner, 
  repo, 
  initialTimeRange = '30d' 
}: ActivityVisualizationPanelProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive design
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle time range change
  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
  }, []);

  // Handle error boundary errors
  const handleError = useCallback((error: Error) => {
    console.error('Activity visualization error:', error);
  }, []);

  // Memoize the selected time range option for display
  const selectedOption = useMemo(() => 
    TIME_RANGE_OPTIONS.find(option => option.value === timeRange) || TIME_RANGE_OPTIONS[0],
    [timeRange]
  );

  return (
    <ActivityErrorBoundary onError={handleError}>
      <div className="w-full space-y-6">
        {/* Header with time range controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Commit Activity Analysis
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Visualize commit patterns and contributor trends for {owner}/{repo}
            </p>
          </div>

          {/* Time Range Filter */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Period Selection
            </legend>
            <div 
              className="flex flex-wrap gap-2" 
              role="radiogroup" 
              aria-label="Select time period for analysis"
              onKeyDown={(e) => {
                // Handle arrow key navigation for radio group
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const currentIndex = TIME_RANGE_OPTIONS.findIndex(opt => opt.value === timeRange);
                  const nextIndex = (currentIndex + 1) % TIME_RANGE_OPTIONS.length;
                  handleTimeRangeChange(TIME_RANGE_OPTIONS[nextIndex].value);
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const currentIndex = TIME_RANGE_OPTIONS.findIndex(opt => opt.value === timeRange);
                  const prevIndex = currentIndex === 0 ? TIME_RANGE_OPTIONS.length - 1 : currentIndex - 1;
                  handleTimeRangeChange(TIME_RANGE_OPTIONS[prevIndex].value);
                }
              }}
            >
              {TIME_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTimeRangeChange(option.value)}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    ${
                      timeRange === option.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                    }
                  `}
                  title={option.description}
                  aria-pressed={timeRange === option.value}
                  aria-label={`Filter by ${option.description}`}
                  role="radio"
                  aria-checked={timeRange === option.value}
                  tabIndex={timeRange === option.value ? 0 : -1}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div 
              className="text-xs text-gray-500 dark:text-gray-400"
              aria-live="polite"
              aria-label="Currently selected time period"
            >
              Currently showing: {selectedOption.description}
            </div>
          </fieldset>
        </div>

        {/* Visualizations Container */}
        <div className={`
          grid gap-6
          ${isMobile 
            ? 'grid-cols-1' 
            : 'grid-cols-1 lg:grid-cols-2'
          }
        `}>
          {/* Heatmap */}
          <div className={isMobile ? 'order-1' : 'order-1'}>
            <CommitActivityHeatmap
              owner={owner}
              repo={repo}
              timeRange={timeRange}
            />
          </div>

          {/* Trendlines */}
          <div className={isMobile ? 'order-2' : 'order-2'}>
            <ContributorTrendlines
              owner={owner}
              repo={repo}
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* Screen reader accessible summary */}
        <div className="sr-only" aria-live="polite" role="region" aria-label="Activity analysis overview">
          <h3>Activity Analysis Summary</h3>
          <p>
            Showing commit activity analysis for {owner}/{repo} repository 
            over the {selectedOption.description.toLowerCase()}.
            The analysis includes a weekly commit activity heatmap and contributor trend lines.
          </p>
          <p>
            Navigation instructions: Use Tab to navigate between time period controls and visualization components.
            Each visualization has its own keyboard navigation controls.
          </p>
        </div>
      </div>
    </ActivityErrorBoundary>
  );
});