'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  TimePeriod, 
  BranchPRAnalysis,
  fetchBranches,
  fetchPullRequests,
  fetchPRReviews,
  fetchRepository,
  generateBranchPRAnalysis,
  GitHubApiResponse
} from '@/lib/github-api';
import { BranchPRFilter } from './BranchPRFilter';
import { BranchStatistics } from './BranchStatistics';
import { PRAnalytics } from './PRAnalytics';
import { PRTimeline } from './PRTimeline';
import { ReviewStatistics } from './ReviewStatistics';

interface BranchPRStatsProps {
  owner: string;
  repo: string;
  initialTimePeriod?: TimePeriod;
}

interface LoadingState {
  branches: boolean;
  pullRequests: boolean;
  reviews: boolean;
  overall: boolean;
}

interface ErrorState {
  branches?: string;
  pullRequests?: string;
  reviews?: string;
  general?: string;
}

interface ProgressState {
  phase: 'initializing' | 'fetching-repo' | 'fetching-branches' | 'fetching-prs' | 'fetching-reviews' | 'processing' | 'complete';
  progress: number; // 0-100
  message: string;
  canCancel: boolean;
  estimatedTimeRemaining?: number;
}

interface PerformanceMetrics {
  startTime: number;
  dataPoints: number;
  processingTime: number;
  memoryUsage?: number;
}

export function BranchPRStats({ owner, repo, initialTimePeriod = '30d' }: BranchPRStatsProps) {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(initialTimePeriod);
  const [analysis, setAnalysis] = useState<BranchPRAnalysis | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    branches: false,
    pullRequests: false,
    reviews: false,
    overall: false,
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [rateLimitWarning, setRateLimitWarning] = useState(false);
  
  // Enhanced state for performance optimizations
  const [progress, setProgress] = useState<ProgressState>({
    phase: 'initializing',
    progress: 0,
    message: 'Initializing...',
    canCancel: false,
  });
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    startTime: 0,
    dataPoints: 0,
    processingTime: 0,
  });
  const [isLargeRepository, setIsLargeRepository] = useState(false);
  const [reducedScope, setReducedScope] = useState(false);
  
  // Refs for cancellation and cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Memoized data for sub-components
  const componentData = useMemo(() => {
    if (!analysis) {
      return {
        branches: [],
        pullRequests: [],
        timeline: [],
        reviews: {
          totalReviews: 0,
          averageReviewsPerPR: 0,
          averageTimeToFirstReview: 0,
          averageTimeToApproval: 0,
          topReviewers: [],
          reviewPatterns: [],
        },
      };
    }

    return {
      branches: analysis.branches.branches,
      pullRequests: analysis.pullRequests.pullRequests,
      timeline: analysis.pullRequests.timeline,
      reviews: analysis.reviews,
    };
  }, [analysis]);

  // Enhanced fetch repository data with performance optimizations
  const fetchRepositoryData = useCallback(async (selectedTimePeriod: TimePeriod, isRetry = false) => {
    // Initialize performance tracking
    const startTime = Date.now();
    setPerformanceMetrics(prev => ({ ...prev, startTime }));
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Set timeout for long-running operations
    timeoutRef.current = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, 120000); // 2 minute timeout
    
    setLoading({
      branches: true,
      pullRequests: true,
      reviews: true,
      overall: true,
    });
    setErrors({});
    setRateLimitWarning(false);
    setProgress({
      phase: 'fetching-repo',
      progress: 5,
      message: 'Fetching repository information...',
      canCancel: true,
    });

    try {
      // Check if request was cancelled
      if (signal.aborted) {
        throw new Error('Operation cancelled by user');
      }

      // First, get repository info to get default branch
      const repoResponse = await fetchRepository(owner, repo);
      if (repoResponse.error) {
        setErrors({ general: repoResponse.error });
        setLoading({
          branches: false,
          pullRequests: false,
          reviews: false,
          overall: false,
        });
        return;
      }

      const defaultBranch = (repoResponse.data as any)?.default_branch || 'main';
      
      // Detect large repository based on initial indicators
      const repoSize = (repoResponse.data as any)?.size || 0;
      const isLarge = repoSize > 100000; // 100MB+ repositories
      setIsLargeRepository(isLarge);
      
      setProgress({
        phase: 'fetching-branches',
        progress: 15,
        message: 'Fetching branch information...',
        canCancel: true,
        estimatedTimeRemaining: isLarge ? 60 : 30,
      });

      // Fetch branches data with enhanced error handling and performance optimization
      let allBranches: any[] = [];
      let branchPage = 1;
      let hasMoreBranches = true;
      const maxBranchPages = isLarge && reducedScope ? 5 : 10; // Reduce scope for large repos

      while (hasMoreBranches && branchPage <= maxBranchPages) {
        // Check if request was cancelled
        if (signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        setProgress({
          phase: 'fetching-branches',
          progress: 15 + (branchPage / maxBranchPages) * 25,
          message: `Fetching branches (page ${branchPage}/${maxBranchPages})...`,
          canCancel: true,
          estimatedTimeRemaining: Math.max(0, (maxBranchPages - branchPage) * 2),
        });

        try {
          const branchResponse = await fetchBranches(owner, repo, branchPage, 100);
          
          if (branchResponse.error) {
            // Implement retry logic for transient errors
            if (branchResponse.error.includes('rate limit') && retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
              continue; // Retry the same page
            }
            setErrors(prev => ({ ...prev, branches: branchResponse.error }));
            break;
          }

          if (branchResponse.data && branchResponse.data.length > 0) {
            allBranches = [...allBranches, ...branchResponse.data];
            hasMoreBranches = branchResponse.data.length === 100;
            branchPage++;
            
            // Update data points counter
            setPerformanceMetrics(prev => ({ 
              ...prev, 
              dataPoints: prev.dataPoints + (branchResponse.data?.length || 0)
            }));
          } else {
            hasMoreBranches = false;
          }

          // Enhanced rate limit handling
          if (branchResponse.rateLimit) {
            if (branchResponse.rateLimit.remaining < 50) {
              setRateLimitWarning(true);
              if (branchResponse.rateLimit.remaining < 10) {
                // Critical rate limit - stop fetching
                break;
              }
            }
          }

          // Add small delay to be respectful to API
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          if (error instanceof Error && error.message === 'Operation cancelled by user') {
            throw error;
          }
          console.warn(`Error fetching branches page ${branchPage}:`, error);
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Retry
          }
          break; // Give up after max retries
        }
      }

      setLoading(prev => ({ ...prev, branches: false }));

      // Fetch pull requests data with enhanced error handling
      setProgress({
        phase: 'fetching-prs',
        progress: 40,
        message: 'Fetching pull request data...',
        canCancel: true,
        estimatedTimeRemaining: isLarge ? 40 : 20,
      });

      let allPullRequests: any[] = [];
      let prPage = 1;
      let hasMorePRs = true;
      const maxPRPages = isLarge && reducedScope ? 5 : 10; // Reduce scope for large repos

      while (hasMorePRs && prPage <= maxPRPages) {
        // Check if request was cancelled
        if (signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        setProgress({
          phase: 'fetching-prs',
          progress: 40 + (prPage / maxPRPages) * 30,
          message: `Fetching pull requests (page ${prPage}/${maxPRPages})...`,
          canCancel: true,
          estimatedTimeRemaining: Math.max(0, (maxPRPages - prPage) * 3),
        });

        try {
          const prResponse = await fetchPullRequests(owner, repo, 'all', prPage, 100);
          
          if (prResponse.error) {
            // Implement retry logic for transient errors
            if (prResponse.error.includes('rate limit') && retryCountRef.current < maxRetries) {
              retryCountRef.current++;
              await new Promise(resolve => setTimeout(resolve, 5000));
              continue;
            }
            setErrors(prev => ({ ...prev, pullRequests: prResponse.error }));
            break;
          }

          if (prResponse.data && prResponse.data.length > 0) {
            allPullRequests = [...allPullRequests, ...prResponse.data];
            hasMorePRs = prResponse.data.length === 100;
            prPage++;
            
            // Update data points counter
            setPerformanceMetrics(prev => ({ 
              ...prev, 
              dataPoints: prev.dataPoints + (prResponse.data?.length || 0)
            }));
          } else {
            hasMorePRs = false;
          }

          // Enhanced rate limit handling
          if (prResponse.rateLimit) {
            if (prResponse.rateLimit.remaining < 30) {
              setRateLimitWarning(true);
              if (prResponse.rateLimit.remaining < 5) {
                break; // Critical rate limit
              }
            }
          }

          // Add small delay to be respectful to API
          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error) {
          if (error instanceof Error && error.message === 'Operation cancelled by user') {
            throw error;
          }
          console.warn(`Error fetching PRs page ${prPage}:`, error);
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          break;
        }
      }

      setLoading(prev => ({ ...prev, pullRequests: false }));

      // Fetch review data with enhanced progress tracking
      setProgress({
        phase: 'fetching-reviews',
        progress: 70,
        message: 'Fetching review data...',
        canCancel: true,
        estimatedTimeRemaining: isLarge ? 30 : 15,
      });

      const maxReviewPRs = isLarge && reducedScope ? 25 : 50; // Reduce scope for large repos
      const recentPRs = allPullRequests.slice(0, maxReviewPRs);
      const reviewData: any[] = [];

      // Process reviews in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < recentPRs.length; i += batchSize) {
        // Check if request was cancelled
        if (signal.aborted) {
          throw new Error('Operation cancelled by user');
        }

        const batch = recentPRs.slice(i, i + batchSize);
        const batchProgress = 70 + ((i / recentPRs.length) * 20);
        
        setProgress({
          phase: 'fetching-reviews',
          progress: batchProgress,
          message: `Fetching reviews (${i + 1}-${Math.min(i + batchSize, recentPRs.length)} of ${recentPRs.length})...`,
          canCancel: true,
          estimatedTimeRemaining: Math.max(0, ((recentPRs.length - i) / batchSize) * 2),
        });

        try {
          const batchPromises = batch.map(async (pr) => {
            try {
              const reviewResponse = await fetchPRReviews(owner, repo, pr.number);
              return {
                prNumber: pr.number,
                reviews: reviewResponse.data || [],
                error: reviewResponse.error,
              };
            } catch (error) {
              return {
                prNumber: pr.number,
                reviews: [],
                error: 'Failed to fetch reviews',
              };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          const batchData = batchResults
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(data => !data.error);

          reviewData.push(...batchData);

          // Add delay between batches to be respectful to API
          if (i + batchSize < recentPRs.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }

        } catch (error) {
          if (error instanceof Error && error.message === 'Operation cancelled by user') {
            throw error;
          }
          console.warn(`Error fetching review batch ${i}-${i + batchSize}:`, error);
          // Continue with next batch on error
        }
      }

      setLoading(prev => ({ ...prev, reviews: false }));

      // Processing phase with performance tracking
      setProgress({
        phase: 'processing',
        progress: 90,
        message: 'Processing and analyzing data...',
        canCancel: false,
      });

      // Generate comprehensive analysis
      const analysisResult = generateBranchPRAnalysis(
        allBranches,
        allPullRequests,
        reviewData,
        defaultBranch,
        selectedTimePeriod
      );

      // Calculate final performance metrics
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        processingTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      }));

      setProgress({
        phase: 'complete',
        progress: 100,
        message: 'Analysis complete!',
        canCancel: false,
      });

      setAnalysis(analysisResult);
      retryCountRef.current = 0; // Reset retry count on success

    } catch (error) {
      console.error('Error fetching branch/PR data:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Operation cancelled by user') {
          setErrors({ general: 'Analysis was cancelled by user.' });
          setProgress({
            phase: 'initializing',
            progress: 0,
            message: 'Analysis cancelled',
            canCancel: false,
          });
        } else if (error.message.includes('timeout')) {
          setErrors({ 
            general: 'Analysis timed out. This repository may be too large. Try reducing the scope or try again later.' 
          });
        } else {
          setErrors({ 
            general: `An unexpected error occurred: ${error.message}. Please try again.` 
          });
        }
      } else {
        setErrors({ 
          general: 'An unexpected error occurred while fetching repository data. Please try again.' 
        });
      }
    } finally {
      // Cleanup
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      
      setLoading({
        branches: false,
        pullRequests: false,
        reviews: false,
        overall: false,
      });
    }
  }, [owner, repo]);

  // Handle time period changes
  const handleTimePeriodChange = useCallback((newTimePeriod: TimePeriod) => {
    setTimePeriod(newTimePeriod);
    fetchRepositoryData(newTimePeriod);
  }, [fetchRepositoryData]);

  // Initial data fetch
  useEffect(() => {
    fetchRepositoryData(timePeriod);
  }, [fetchRepositoryData, timePeriod]);

  // Retry function for error recovery
  const handleRetry = useCallback(() => {
    fetchRepositoryData(timePeriod);
  }, [fetchRepositoryData, timePeriod]);

  // Cancel operation function
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current && progress.canCancel) {
      abortControllerRef.current.abort();
    }
  }, [progress.canCancel]);

  // Toggle reduced scope for large repositories
  const handleToggleReducedScope = useCallback(() => {
    setReducedScope(prev => !prev);
    if (analysis) {
      // Re-fetch with new scope
      fetchRepositoryData(timePeriod);
    }
  }, [analysis, fetchRepositoryData, timePeriod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check if any data is loading
  const isLoading = loading.overall || loading.branches || loading.pullRequests || loading.reviews;

  // Check if we have any errors
  const hasErrors = Object.keys(errors).length > 0;

  // Check if we have any data to display
  const hasData = analysis && (
    analysis.branches.totalBranches > 0 || 
    analysis.pullRequests.totalPRs > 0
  );

  return (
    <div className="space-y-8">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Branch & Pull Request Analytics
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into development workflow and collaboration patterns
          </p>
        </div>
        
        <BranchPRFilter
          selectedPeriod={timePeriod}
          onPeriodChange={handleTimePeriodChange}
          isLoading={isLoading}
        />
      </div>

      {/* Rate Limit Warning */}
      {rateLimitWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                API Rate Limit Warning
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Approaching GitHub API rate limits. Some data may be incomplete. 
                Consider using authentication for higher limits.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error States */}
      {hasErrors && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-red-600 dark:text-red-400 mt-0.5">❌</span>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Error Loading Data
              </h3>
              <div className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {errors.general && <p>• {errors.general}</p>}
                {errors.branches && <p>• Branches: {errors.branches}</p>}
                {errors.pullRequests && <p>• Pull Requests: {errors.pullRequests}</p>}
                {errors.reviews && <p>• Reviews: {errors.reviews}</p>}
              </div>
              <button
                onClick={handleRetry}
                className="mt-3 px-3 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded text-sm hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!hasErrors && (
        <>
          {/* Branch Statistics */}
          <section>
            <BranchStatistics
              branches={componentData.branches}
              isLoading={loading.branches}
              timePeriod={timePeriod}
            />
          </section>

          {/* Pull Request Analytics */}
          <section>
            <PRAnalytics
              pullRequests={componentData.pullRequests}
              isLoading={loading.pullRequests}
              timePeriod={timePeriod}
            />
          </section>

          {/* PR Timeline */}
          <section>
            <PRTimeline
              timelineData={componentData.timeline}
              timePeriod={timePeriod}
              isLoading={loading.pullRequests}
            />
          </section>

          {/* Review Statistics */}
          <section>
            <ReviewStatistics
              reviewData={componentData.reviews}
              isLoading={loading.reviews}
            />
          </section>
        </>
      )}

      {/* Empty State */}
      {!isLoading && !hasErrors && !hasData && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Data Available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This repository doesn't have enough branch or pull request activity to generate analytics.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Try selecting a different time period or check back after more development activity.
          </p>
        </div>
      )}

      {/* Enhanced Progress Indicator with Cancellation */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
          <div className="space-y-3">
            {/* Progress Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {progress.message}
              </p>
              {progress.canCancel && (
                <button
                  onClick={handleCancel}
                  className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Cancel operation"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>

            {/* Progress Details */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{progress.progress.toFixed(0)}% complete</span>
              {progress.estimatedTimeRemaining && (
                <span>{progress.estimatedTimeRemaining}s remaining</span>
              )}
            </div>

            {/* Phase Indicator */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Phase: {progress.phase.replace('-', ' ')}
            </div>
          </div>
        </div>
      )}

      {/* Large Repository Warning and Controls */}
      {isLargeRepository && !hasErrors && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">ℹ️</span>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Large Repository Detected
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                This repository has a large amount of data. You can reduce the analysis scope for faster processing.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <input
                    type="checkbox"
                    checked={reducedScope}
                    onChange={handleToggleReducedScope}
                    className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  Use reduced scope (faster analysis)
                </label>
              </div>
              {reducedScope && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Reduced scope: Analyzing fewer branches, PRs, and reviews for faster processing.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics (shown after completion) */}
      {analysis && performanceMetrics.processingTime > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {(performanceMetrics.processingTime / 1000).toFixed(1)}s
              </div>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Data Points:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {performanceMetrics.dataPoints.toLocaleString()}
              </div>
            </div>
            {performanceMetrics.memoryUsage && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Memory Used:</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            )}
            <div>
              <span className="text-gray-600 dark:text-gray-400">Scope:</span>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {reducedScope ? 'Reduced' : 'Full'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}