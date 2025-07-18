'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TimePeriod,
  FileChangeAnalysis,
  fetchCommitsWithFiles,
  getTimePeriodBounds,
  processFileChangeData,
  filterCommitsByTimePeriod,
  GitHubApiResponse,
  CommitFileData,
} from '@/lib/github-api';
import { TimePeriodFilter } from './TimePeriodFilter';
import { FileChangeList } from './FileChangeList';
import { FileChangeTrend } from './FileChangeTrend';
import { FileTypeBreakdown } from './FileTypeBreakdown';
import { ProgressIndicator } from './ProgressIndicator';

interface MostChangedFilesProps {
  owner: string;
  repo: string;
  timePeriod?: TimePeriod;
}

interface MostChangedFilesState {
  analysis: FileChangeAnalysis | null;
  loading: boolean;
  error: string | null;
  selectedFile: string | null;
  rawCommits: CommitFileData[];
  rateLimitWarning: boolean;
  progress: {
    current: number;
    total: number;
    message: string;
  } | null;
}

export function MostChangedFiles({ 
  owner, 
  repo, 
  timePeriod: initialTimePeriod = '90d' 
}: MostChangedFilesProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod);
  const [state, setState] = useState<MostChangedFilesState>({
    analysis: null,
    loading: true,
    error: null,
    selectedFile: null,
    rawCommits: [],
    rateLimitWarning: false,
    progress: null,
  });

  // Memoize the filtered analysis based on time period
  const filteredAnalysis = useMemo(() => {
    if (!state.rawCommits.length) return null;
    
    const filteredCommits = filterCommitsByTimePeriod(state.rawCommits, timePeriod);
    return processFileChangeData(filteredCommits, timePeriod);
  }, [state.rawCommits, timePeriod]);

  // Fetch commit data with file information
  const fetchFileChangeData = useCallback(async (abortSignal?: AbortSignal) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch commits in batches to handle large repositories
      const allCommits: CommitFileData[] = [];
      let page = 1;
      const perPage = 100;
      let hasMore = true;
      let rateLimitWarning = false;

      while (hasMore && page <= 10) { // Limit to 10 pages (1000 commits) for performance
        const response: GitHubApiResponse<CommitFileData[]> = await fetchCommitsWithFiles(
          owner,
          repo,
          undefined, // We'll filter by time period after fetching
          undefined,
          page,
          perPage,
          {
            maxCommits: 100, // Limit per page for performance
            rateLimitThreshold: 50,
            batchDelay: 100,
            onProgress: (processed, total) => {
              setState(prev => ({
                ...prev,
                progress: {
                  current: processed,
                  total,
                  message: `Processing commits (page ${page})...`,
                },
              }));
            },
            signal: abortSignal,
          }
        );

        if (response.error) {
          if (response.error === 'Request was cancelled') {
            return; // Don't update state if cancelled
          }
          setState(prev => ({
            ...prev,
            loading: false,
            error: response.error || 'Failed to fetch commit data',
          }));
          return;
        }

        if (response.data && response.data.length > 0) {
          allCommits.push(...response.data);
          hasMore = response.data.length === perPage;
          page++;

          // Check rate limit
          if (response.rateLimit && response.rateLimit.remaining < 50) {
            rateLimitWarning = true;
            hasMore = false; // Stop fetching to preserve rate limit
          }

          // Check for rate limit warning from the API
          if ((response as any).rateLimitWarning) {
            rateLimitWarning = true;
            hasMore = false;
          }
        } else {
          hasMore = false;
        }

        // Check if cancelled between requests
        if (abortSignal?.aborted) {
          return;
        }

        // Add a small delay between requests to be respectful
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setState(prev => ({
        ...prev,
        rawCommits: allCommits,
        loading: false,
        rateLimitWarning,
        progress: null, // Clear progress when done
      }));

    } catch (error) {
      if (abortSignal?.aborted) {
        return; // Don't update state if cancelled
      }
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'An unexpected error occurred while fetching file change data.',
      }));
    }
  }, [owner, repo]);

  // Initial data fetch with cleanup
  useEffect(() => {
    const abortController = new AbortController();
    fetchFileChangeData(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, [fetchFileChangeData]);

  // Handle time period changes
  const handleTimePeriodChange = useCallback((newPeriod: TimePeriod) => {
    setTimePeriod(newPeriod);
    setState(prev => ({ ...prev, selectedFile: null })); // Reset selected file
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((filename: string) => {
    setState(prev => ({
      ...prev,
      selectedFile: prev.selectedFile === filename ? null : filename,
    }));
  }, []);

  // Get selected file data
  const selectedFileData = useMemo(() => {
    if (!state.selectedFile || !filteredAnalysis) return null;
    return filteredAnalysis.files.find(file => file.filename === state.selectedFile);
  }, [state.selectedFile, filteredAnalysis]);

  // Handle retry
  const handleRetry = useCallback(() => {
    fetchFileChangeData();
  }, [fetchFileChangeData]);

  if (state.error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Most Changed Files
          </h2>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-red-600 dark:text-red-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Error Loading File Change Data
            </h3>
          </div>
          
          <p className="text-red-700 dark:text-red-300 mb-4">
            {state.error}
          </p>
          
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Most Changed Files
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analyze file change patterns and identify code churn hotspots
          </p>
        </div>
        
        {state.rateLimitWarning && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm font-medium">Rate limit warning</span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Analysis may be incomplete due to GitHub API rate limits
            </p>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      {state.progress && state.loading && (
        <ProgressIndicator
          progress={state.progress.current}
          total={state.progress.total}
          message={state.progress.message}
          onCancel={() => {
            // Cancel will be handled by the AbortController cleanup
            setState(prev => ({ ...prev, loading: false, progress: null }));
          }}
        />
      )}

      {/* Time Period Filter */}
      <TimePeriodFilter
        selectedPeriod={timePeriod}
        onPeriodChange={handleTimePeriodChange}
        isLoading={state.loading}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* File List - Takes up 1 column */}
        <div className="xl:col-span-1">
          <FileChangeList
            files={filteredAnalysis?.files || []}
            isLoading={state.loading}
            onFileSelect={handleFileSelect}
            selectedFile={state.selectedFile || undefined}
          />
        </div>

        {/* Charts and Analysis - Takes up 2 columns */}
        <div className="xl:col-span-2 space-y-6">
          {/* File Change Trend */}
          <FileChangeTrend
            filename={state.selectedFile || ''}
            trendData={selectedFileData?.trendData || []}
            timePeriod={timePeriod}
          />

          {/* File Type Breakdown */}
          <FileTypeBreakdown
            typeData={filteredAnalysis?.fileTypeBreakdown || []}
            isLoading={state.loading}
          />
        </div>
      </div>

      {/* Summary Statistics */}
      {filteredAnalysis && !state.loading && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Analysis Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              title="Total Files"
              value={filteredAnalysis.files.length.toString()}
              icon="📁"
              description="Files with changes"
            />
            <SummaryCard
              title="Total Changes"
              value={filteredAnalysis.totalChanges.toString()}
              icon="📊"
              description="Across all files"
            />
            <SummaryCard
              title="File Types"
              value={filteredAnalysis.fileTypeBreakdown.length.toString()}
              icon="🏷️"
              description="Different categories"
            />
            <SummaryCard
              title="Time Period"
              value={getTimePeriodLabel(timePeriod)}
              icon="📅"
              description="Analysis scope"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  description: string;
}

function SummaryCard({ title, value, icon, description }: SummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </div>
    </div>
  );
}

function getTimePeriodLabel(timePeriod: TimePeriod): string {
  switch (timePeriod) {
    case '30d': return '30 Days';
    case '90d': return '90 Days';
    case '6m': return '6 Months';
    case '1y': return '1 Year';
    case 'all': return 'All Time';
    default: return 'Custom';
  }
}