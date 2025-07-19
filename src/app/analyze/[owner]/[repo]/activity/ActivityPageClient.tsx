'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ActivityVisualizationPanel } from '@/components/ActivityVisualizationPanel';
import { type TimeRange } from '@/lib/commit-activity-data';

interface ActivityPageClientProps {
  owner: string;
  repo: string;
  initialTimeRange: TimeRange;
}

export function ActivityPageClient({ owner, repo, initialTimeRange }: ActivityPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // Update URL when time range changes
  const updateTimeRangeInUrl = useCallback((newTimeRange: TimeRange) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newTimeRange === '30d') {
      // Remove the parameter for default value to keep URLs clean
      params.delete('timeRange');
    } else {
      params.set('timeRange', newTimeRange);
    }
    
    const newUrl = params.toString() 
      ? `/analyze/${owner}/${repo}/activity?${params.toString()}`
      : `/analyze/${owner}/${repo}/activity`;
    
    router.replace(newUrl, { scroll: false });
  }, [owner, repo, router, searchParams]);

  // Handle time range changes from the component
  const handleTimeRangeChange = useCallback((newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange);
    updateTimeRangeInUrl(newTimeRange);
  }, [updateTimeRangeInUrl]);

  // Sync with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlTimeRange = searchParams.get('timeRange') as TimeRange;
    const validTimeRanges: TimeRange[] = ['30d', '3m', '6m', '1y'];
    
    if (urlTimeRange && validTimeRanges.includes(urlTimeRange) && urlTimeRange !== timeRange) {
      setTimeRange(urlTimeRange);
    }
  }, [searchParams, timeRange]);

  return (
    <ActivityVisualizationPanelWithUrlSync
      owner={owner}
      repo={repo}
      timeRange={timeRange}
      onTimeRangeChange={handleTimeRangeChange}
    />
  );
}

// Wrapper component to handle time range changes
interface ActivityVisualizationPanelWithUrlSyncProps {
  owner: string;
  repo: string;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
}

function ActivityVisualizationPanelWithUrlSync({ 
  owner, 
  repo, 
  timeRange, 
  onTimeRangeChange 
}: ActivityVisualizationPanelWithUrlSyncProps) {
  // We need to override the internal time range handling of ActivityVisualizationPanel
  // Since it manages its own state, we'll create a custom version here
  
  return (
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
        <TimeRangeFilter 
          timeRange={timeRange} 
          onTimeRangeChange={onTimeRangeChange} 
        />
      </div>

      {/* Use the original ActivityVisualizationPanel but with controlled time range */}
      <ActivityVisualizationPanel
        owner={owner}
        repo={repo}
        initialTimeRange={timeRange}
        key={timeRange} // Force re-render when time range changes
      />
    </div>
  );
}

// Time range filter component
interface TimeRangeFilterProps {
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
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

function TimeRangeFilter({ timeRange, onTimeRangeChange }: TimeRangeFilterProps) {
  const selectedOption = TIME_RANGE_OPTIONS.find(option => option.value === timeRange) || TIME_RANGE_OPTIONS[0];

  return (
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
            onTimeRangeChange(TIME_RANGE_OPTIONS[nextIndex].value);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            const currentIndex = TIME_RANGE_OPTIONS.findIndex(opt => opt.value === timeRange);
            const prevIndex = currentIndex === 0 ? TIME_RANGE_OPTIONS.length - 1 : currentIndex - 1;
            onTimeRangeChange(TIME_RANGE_OPTIONS[prevIndex].value);
          }
        }}
      >
        {TIME_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onTimeRangeChange(option.value)}
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
  );
}