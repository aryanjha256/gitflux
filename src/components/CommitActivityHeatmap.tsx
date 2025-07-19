'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  transformToHeatmapData,
  filterCommitsByTimeRange,
  type TimeRange,
  type HeatmapData,
  type WeeklyCommitData,
  type GitHubCommit
} from '@/lib/commit-activity-data';
import { fetchCommitsWithFiles, type GitHubApiResponse } from '@/lib/github-api';

interface CommitActivityHeatmapProps {
  owner: string;
  repo: string;
  timeRange: TimeRange;
  data?: WeeklyCommitData[];
}

interface HeatmapState {
  data: HeatmapData;
  loading: boolean;
  error: string | null;
}

interface TooltipData {
  date: string;
  dayOfWeek: number;
  commitCount: number;
  contributors: string[];
  x: number;
  y: number;
  visible: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Memoized component for performance optimization
export const CommitActivityHeatmap = React.memo(function CommitActivityHeatmap({ owner, repo, timeRange, data }: CommitActivityHeatmapProps) {
  const [state, setState] = useState<HeatmapState>({
    data: { weeks: data || [], totalCommits: 0, peakDay: { day: 'Sunday', count: 0 }, averagePerDay: 0 },
    loading: !data,
    error: null,
  });
  const [tooltip, setTooltip] = useState<TooltipData>({
    date: '',
    dayOfWeek: 0,
    commitCount: 0,
    contributors: [],
    x: 0,
    y: 0,
    visible: false,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Handle responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get time bounds for API calls
  const getTimeBounds = (range: TimeRange) => {
    const now = new Date();
    let since: string | undefined;

    switch (range) {
      case '30d':
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '3m':
        since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '6m':
        since = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '1y':
        since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    return { since, until: now.toISOString() };
  };

  // Memoized time bounds calculation
  const timeBounds = useMemo(() => getTimeBounds(timeRange), [timeRange]);

  // Memoized data transformation for provided data
  const transformedProvidedData = useMemo(() => {
    if (!data) return null;
    
    return transformToHeatmapData(
      data.map(d => ({
        sha: '',
        commit: {
          author: {
            name: 'Unknown',
            email: '',
            date: d.date,
          },
          message: '',
        },
        author: null,
      })),
      timeRange
    );
  }, [data, timeRange]);

  // Exponential backoff retry mechanism
  const getRetryDelay = useCallback((attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 seconds
  }, []);

  // Fetch data with retry mechanism
  const fetchDataWithRetry = useCallback(async (attempt: number = 0) => {
    const maxRetries = 3;
    
    if (attempt === 0) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      setIsRetrying(false);
    } else {
      setIsRetrying(true);
    }

    try {
      const response: GitHubApiResponse<any[]> = await fetchCommitsWithFiles(
        owner,
        repo,
        timeBounds.since,
        timeBounds.until,
        1,
        100,
        { maxCommits: 1000 }
      );

      if (response.error) {
        // Check if it's a rate limit error and should retry
        const isRateLimitError = response.error.includes('rate limit');
        const isNetworkError = response.error.includes('Network error') || response.error.includes('fetch');
        
        if ((isRateLimitError || isNetworkError) && attempt < maxRetries) {
          const delay = getRetryDelay(attempt);
          setTimeout(() => {
            setRetryCount(attempt + 1);
            fetchDataWithRetry(attempt + 1);
          }, delay);
          return;
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Failed to fetch commit data',
        }));
        setIsRetrying(false);
        return;
      }

      if (response.data) {
        // Transform the commit data to match GitHubCommit interface
        const commits: GitHubCommit[] = response.data.map(commit => ({
          sha: commit.sha,
          commit: {
            author: {
              name: commit.author,
              email: '',
              date: commit.date,
            },
            message: commit.message,
          },
          author: {
            login: commit.author,
            avatar_url: '',
          },
        }));

        const filteredCommits = filterCommitsByTimeRange(commits, timeRange);
        const heatmapData = transformToHeatmapData(filteredCommits, timeRange);
        
        setState({
          data: heatmapData,
          loading: false,
          error: null,
        });
        setRetryCount(0);
        setIsRetrying(false);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No commit data available',
        }));
        setIsRetrying(false);
      }
    } catch (error) {
      if (attempt < maxRetries) {
        const delay = getRetryDelay(attempt);
        setTimeout(() => {
          setRetryCount(attempt + 1);
          fetchDataWithRetry(attempt + 1);
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'An unexpected error occurred while fetching commit data',
        }));
        setIsRetrying(false);
      }
    }
  }, [owner, repo, timeBounds, timeRange, getRetryDelay]);

  useEffect(() => {
    // If data is provided as prop, use transformed data
    if (transformedProvidedData) {
      setState({ data: transformedProvidedData, loading: false, error: null });
      return;
    }

    // Fetch commit data with retry mechanism
    fetchDataWithRetry();
  }, [transformedProvidedData, fetchDataWithRetry]);

  // Memoized color intensity calculation
  const getColorIntensity = useCallback((count: number, maxCount: number): string => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    const intensity = Math.min(count / Math.max(maxCount, 1), 1);
    
    if (intensity <= 0.2) return 'bg-blue-200 dark:bg-blue-900';
    if (intensity <= 0.4) return 'bg-blue-300 dark:bg-blue-800';
    if (intensity <= 0.6) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity <= 0.8) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  }, []);

  // Handle cell hover
  const handleCellHover = (
    event: React.MouseEvent<HTMLDivElement>,
    weekData: WeeklyCommitData
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const date = new Date(weekData.date);
    
    setTooltip({
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      dayOfWeek: weekData.dayOfWeek,
      commitCount: weekData.commitCount,
      contributors: weekData.contributors,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      visible: true,
    });
  };

  // Handle cell leave
  const handleCellLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // Helper function to get week key
  const getWeekKey = (date: Date): string => {
    const year = date.getFullYear();
    const week = getISOWeek(date);
    return `${year}-W${String(week).padStart(2, '0')}`;
  };

  // Get ISO week number
  const getISOWeek = (date: Date): number => {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  };

  // Memoized grid data generation for expensive rendering operations
  const gridData = useMemo(() => {
    if (!state.data.weeks.length) return [];

    // Group weeks by week key and create a complete grid
    const weekMap = new Map<string, Map<number, WeeklyCommitData>>();
    let minDate = new Date();
    let maxDate = new Date(0);

    state.data.weeks.forEach(week => {
      const date = new Date(week.date);
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
      
      const weekKey = getWeekKey(date);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, new Map());
      }
      weekMap.get(weekKey)!.set(week.dayOfWeek, week);
    });

    // Generate complete grid with empty cells
    const weeks: (WeeklyCommitData | null)[][] = [];
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const weekKey = getWeekKey(currentDate);
      const weekData = weekMap.get(weekKey);
      const week: (WeeklyCommitData | null)[] = [];

      for (let day = 0; day < 7; day++) {
        const cellDate = new Date(currentDate);
        cellDate.setDate(currentDate.getDate() + day);
        
        if (weekData && weekData.has(day)) {
          week.push(weekData.get(day)!);
        } else {
          // Create empty cell
          week.push({
            date: cellDate.toISOString().split('T')[0],
            dayOfWeek: day,
            commitCount: 0,
            contributors: [],
          });
        }
      }

      weeks.push(week);
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
  }, [state.data.weeks]);

  // Memoized max commits calculation
  const maxCommits = useMemo(() => {
    return Math.max(...state.data.weeks.map(w => w.commitCount), 1);
  }, [state.data.weeks]);

  // Enhanced loading state with skeleton and retry information
  if (state.loading) {
    return (
      <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Commit Activity</h3>
            <div className="flex items-center space-x-2" role="status" aria-label="Loading commit activity data">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" aria-hidden="true"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isRetrying ? `Retrying... (${retryCount}/3)` : 'Loading...'}
              </span>
            </div>
          </div>
          
          {/* Enhanced skeleton with heatmap-like structure */}
          <div className="space-y-2" aria-hidden="true">
            {/* Day labels skeleton */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              ))}
            </div>
            
            {/* Grid skeleton */}
            {Array.from({ length: 8 }).map((_, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 dark:bg-gray-600 rounded-sm animate-pulse"
                    style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 50}ms` }}
                  ></div>
                ))}
              </div>
            ))}
            
            {/* Legend skeleton */}
            <div className="mt-4 flex items-center justify-between">
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
              <div className="flex items-center space-x-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-sm animate-pulse"></div>
                ))}
              </div>
              <div className="h-3 w-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (state.error) {
    return (
      <div className="w-full bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Commit Activity</h3>
          <div className="flex items-center justify-center h-32 sm:h-40">
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
              <p className="text-red-800 dark:text-red-200 font-medium text-sm mb-2">Error loading commit activity</p>
              <p className="text-red-600 dark:text-red-300 text-xs leading-relaxed mb-4" role="alert" aria-live="polite">
                {state.error}
              </p>
              <button
                onClick={() => {
                  setRetryCount(0);
                  fetchDataWithRetry();
                }}
                disabled={isRetrying}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-800 dark:text-red-200 dark:border-red-600 dark:hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRetrying ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (gridData.length === 0 || state.data.totalCommits === 0) {
    return (
      <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Weekly Commit Activity</h3>
          <div className="flex items-center justify-center h-32 sm:h-40">
            <div className="text-center max-w-sm px-4">
              <div className="text-gray-400 dark:text-gray-500 mb-4" role="img" aria-label="No data icon">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium text-sm mb-2">No commit activity</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                No commits found for the selected time period.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Commit Activity</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {state.data.totalCommits} commits • Peak: {state.data.peakDay.day} ({state.data.peakDay.count})
          </div>
        </div>

        {/* Day labels */}
        <div className="mb-2">
          <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 dark:text-gray-400 text-center">
            {DAY_LABELS.map((day, index) => (
              <div key={index} className={isMobile ? 'text-xs' : 'text-sm'}>
                {isMobile ? day[0] : day}
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap grid */}
        <div 
          className="relative"
          role="application"
          aria-label={`Interactive commit activity heatmap showing ${state.data.totalCommits} total commits across ${gridData.length} weeks. Use arrow keys to navigate between days.`}
          tabIndex={0}
          onKeyDown={(e) => {
            // Handle arrow key navigation
            const focusedElement = document.activeElement as HTMLElement;
            if (!focusedElement || !focusedElement.dataset.dayIndex) return;

            const [weekIndex, dayIndex] = focusedElement.dataset.dayIndex.split('-').map(Number);
            let newWeekIndex = weekIndex;
            let newDayIndex = dayIndex;

            switch (e.key) {
              case 'ArrowRight':
                e.preventDefault();
                newDayIndex = Math.min(dayIndex + 1, 6);
                break;
              case 'ArrowLeft':
                e.preventDefault();
                newDayIndex = Math.max(dayIndex - 1, 0);
                break;
              case 'ArrowDown':
                e.preventDefault();
                newWeekIndex = Math.min(weekIndex + 1, gridData.length - 1);
                break;
              case 'ArrowUp':
                e.preventDefault();
                newWeekIndex = Math.max(weekIndex - 1, 0);
                break;
              case 'Home':
                e.preventDefault();
                newWeekIndex = 0;
                newDayIndex = 0;
                break;
              case 'End':
                e.preventDefault();
                newWeekIndex = gridData.length - 1;
                newDayIndex = 6;
                break;
            }

            if (newWeekIndex !== weekIndex || newDayIndex !== dayIndex) {
              const newElement = document.querySelector(`[data-day-index="${newWeekIndex}-${newDayIndex}"]`) as HTMLElement;
              if (newElement) {
                newElement.focus();
              }
            }
          }}
        >
          <div className="space-y-1" role="grid" aria-label="Weekly commit activity grid">
            {gridData.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1" role="row">
                {week.map((day, dayIndex) => {
                  if (!day) return (
                    <div 
                      key={dayIndex} 
                      className="w-3 h-3 sm:w-4 sm:h-4" 
                      role="gridcell"
                      aria-hidden="true"
                    />
                  );
                  
                  const colorClass = getColorIntensity(day.commitCount, maxCommits);
                  const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`
                        w-3 h-3 sm:w-4 sm:h-4 rounded-sm cursor-pointer transition-all duration-200
                        hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 hover:scale-110
                        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none focus:scale-110
                        ${colorClass}
                      `}
                      onMouseEnter={(e) => handleCellHover(e, day)}
                      onMouseLeave={handleCellLeave}
                      tabIndex={-1}
                      role="gridcell"
                      data-day-index={`${weekIndex}-${dayIndex}`}
                      aria-label={`${formattedDate}, ${day.commitCount} ${day.commitCount === 1 ? 'commit' : 'commits'}${day.contributors.length > 0 ? ` by ${day.contributors.slice(0, 2).join(', ')}${day.contributors.length > 2 ? ` and ${day.contributors.length - 2} others` : ''}` : ''}`}
                      aria-describedby={day.commitCount > 0 ? `heatmap-cell-${weekIndex}-${dayIndex}` : undefined}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleCellHover(e as any, day);
                        }
                      }}
                      onFocus={(e) => {
                        // Show tooltip on focus for keyboard users
                        handleCellHover(e as any, day);
                      }}
                      onBlur={handleCellLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div 
          className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
          role="img"
          aria-label="Color intensity legend: darker colors represent more commits"
        >
          <span aria-hidden="true">Less</span>
          <div className="flex items-center space-x-1" role="list" aria-label="Commit intensity scale">
            <div 
              className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" 
              role="listitem"
              aria-label="No commits"
              title="No commits"
            ></div>
            <div 
              className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900" 
              role="listitem"
              aria-label="Low activity"
              title="Low activity (1-20% of peak)"
            ></div>
            <div 
              className="w-3 h-3 rounded-sm bg-blue-300 dark:bg-blue-800" 
              role="listitem"
              aria-label="Moderate activity"
              title="Moderate activity (21-40% of peak)"
            ></div>
            <div 
              className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-700" 
              role="listitem"
              aria-label="High activity"
              title="High activity (41-60% of peak)"
            ></div>
            <div 
              className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-600" 
              role="listitem"
              aria-label="Very high activity"
              title="Very high activity (61-80% of peak)"
            ></div>
            <div 
              className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" 
              role="listitem"
              aria-label="Peak activity"
              title="Peak activity (81-100% of peak)"
            ></div>
          </div>
          <span aria-hidden="true">More</span>
        </div>

        {/* Screen reader accessible data summary */}
        <div className="sr-only" aria-live="polite" role="region" aria-label="Commit activity data summary">
          <h4>Commit Activity Summary</h4>
          <p>
            This heatmap shows commit activity over {gridData.length} weeks.
            Total commits: {state.data.totalCommits}.
            Peak activity day: {state.data.peakDay.day} with {state.data.peakDay.count} commits.
            Average commits per day: {Math.round(state.data.averagePerDay)}.
          </p>
          <p>
            Navigation instructions: Use arrow keys to move between days, Home to go to first day, End to go to last day.
            Press Enter or Space to view details for the focused day.
          </p>
        </div>

        {/* Hidden descriptions for screen readers */}
        {gridData.map((week, weekIndex) => 
          week.map((day, dayIndex) => {
            if (!day || day.commitCount === 0) return null;
            return (
              <div
                key={`desc-${weekIndex}-${dayIndex}`}
                id={`heatmap-cell-${weekIndex}-${dayIndex}`}
                className="sr-only"
              >
                {day.contributors.length > 0 && (
                  <span>Contributors: {day.contributors.join(', ')}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className="font-medium">{tooltip.date}</div>
          <div className="text-gray-300">
            {tooltip.commitCount} {tooltip.commitCount === 1 ? 'commit' : 'commits'}
          </div>
          {tooltip.contributors.length > 0 && (
            <div className="text-gray-400 text-xs mt-1">
              {tooltip.contributors.slice(0, 3).join(', ')}
              {tooltip.contributors.length > 3 && ` +${tooltip.contributors.length - 3} more`}
            </div>
          )}
        </div>
      )}
    </div>
  );
});