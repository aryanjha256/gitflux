'use client';

import { PRData, PRAnalyticsData, TimePeriod, categorizePRSize } from '@/lib/github-api';
import { useMemo } from 'react';

interface PRAnalyticsProps {
  pullRequests: PRData[];
  isLoading: boolean;
  timePeriod: TimePeriod;
  onPRSelect?: (pr: PRData) => void;
  selectedPR?: number;
}

export function PRAnalytics({ 
  pullRequests, 
  isLoading, 
  timePeriod, 
  onPRSelect,
  selectedPR 
}: PRAnalyticsProps) {
  // Calculate PR analytics
  const analytics = useMemo(() => {
    const totalPRs = pullRequests.length;
    const openPRs = pullRequests.filter(pr => pr.state === 'open').length;
    const closedPRs = pullRequests.filter(pr => pr.state === 'closed').length;
    const mergedPRs = pullRequests.filter(pr => pr.state === 'merged').length;
    const draftPRs = pullRequests.filter(pr => pr.isDraft).length;

    // Calculate averages
    const mergedPRsWithTime = pullRequests.filter(pr => pr.timeToMerge !== undefined);
    const averageTimeToMerge = mergedPRsWithTime.length > 0
      ? Math.round(mergedPRsWithTime.reduce((sum, pr) => sum + (pr.timeToMerge || 0), 0) / mergedPRsWithTime.length)
      : 0;

    const averagePRSize = pullRequests.length > 0
      ? Math.round(pullRequests.reduce((sum, pr) => sum + pr.linesChanged, 0) / pullRequests.length)
      : 0;

    // Size distribution
    const sizeDistribution = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
    pullRequests.forEach(pr => {
      const size = categorizePRSize(pr.linesChanged);
      sizeDistribution[size] += 1;
    });

    // Top contributors
    const contributorMap = new Map<string, { prCount: number; linesChanged: number; averageTimeToMerge: number }>();
    pullRequests.forEach(pr => {
      const existing = contributorMap.get(pr.author) || { prCount: 0, linesChanged: 0, averageTimeToMerge: 0 };
      existing.prCount += 1;
      existing.linesChanged += pr.linesChanged;
      if (pr.timeToMerge) {
        existing.averageTimeToMerge = (existing.averageTimeToMerge + pr.timeToMerge) / 2;
      }
      contributorMap.set(pr.author, existing);
    });

    const topContributors = Array.from(contributorMap.entries())
      .map(([username, stats]) => ({ username, ...stats }))
      .sort((a, b) => b.prCount - a.prCount)
      .slice(0, 5);

    // Merge rate
    const mergeRate = totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0;

    return {
      totalPRs,
      openPRs,
      closedPRs,
      mergedPRs,
      draftPRs,
      averageTimeToMerge,
      averagePRSize,
      sizeDistribution,
      topContributors,
      mergeRate,
    };
  }, [pullRequests]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Analytics
        </h3>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Analytics
        </h3>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🔀</div>
          <p className="text-lg font-medium">No pull requests found</p>
          <p className="text-sm">No PR data available for the selected time period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Analytics
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {pullRequests.length} PRs • {getTimePeriodLabel(timePeriod)}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total PRs"
          value={analytics.totalPRs.toString()}
          icon="🔀"
          color="blue"
        />
        <StatCard
          title="Merged"
          value={analytics.mergedPRs.toString()}
          icon="✅"
          color="green"
          subtitle={`${Math.round(analytics.mergeRate)}% merge rate`}
        />
        <StatCard
          title="Open"
          value={analytics.openPRs.toString()}
          icon="🟡"
          color="yellow"
          subtitle={`${analytics.totalPRs > 0 ? Math.round((analytics.openPRs / analytics.totalPRs) * 100) : 0}% of total`}
        />
        <StatCard
          title="Avg Time to Merge"
          value={`${analytics.averageTimeToMerge}h`}
          icon="⏱️"
          color="purple"
          subtitle="Hours to merge"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PR Size Distribution */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
            PR Size Distribution
          </h4>
          <div className="space-y-3">
            {Object.entries(analytics.sizeDistribution).map(([size, count]) => (
              <div key={size} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {size} {getSizeLabel(size as keyof typeof analytics.sizeDistribution)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {count}
                  </span>
                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ 
                        width: `${analytics.totalPRs > 0 ? (count / analytics.totalPRs) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Contributors
          </h4>
          <div className="space-y-3">
            {analytics.topContributors.map((contributor, index) => (
              <div key={contributor.username} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-4">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {contributor.username}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {contributor.prCount} PRs
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {contributor.linesChanged.toLocaleString()} lines
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PR List */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Recent Pull Requests
        </h4>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {pullRequests.slice(0, 10).map((pr, index) => (
            <PRItem
              key={pr.number}
              pr={pr}
              rank={index + 1}
              isSelected={selectedPR === pr.number}
              onSelect={() => onPRSelect?.(pr)}
            />
          ))}
          
          {pullRequests.length > 10 && (
            <div className="text-center py-2 text-sm text-gray-500 dark:text-gray-400">
              Showing 10 of {pullRequests.length} pull requests
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium opacity-80">{title}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && (
        <div className="text-xs opacity-70">{subtitle}</div>
      )}
    </div>
  );
}

interface PRItemProps {
  pr: PRData;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}

function PRItem({ pr, rank, isSelected, onSelect }: PRItemProps) {
  const getStateIcon = (state: string, isDraft: boolean) => {
    if (isDraft) return '📝';
    switch (state) {
      case 'open': return '🟢';
      case 'merged': return '🟣';
      case 'closed': return '🔴';
      default: return '⚪';
    }
  };

  const getSizeColor = (size: string) => {
    switch (size) {
      case 'XS': return 'text-green-600 dark:text-green-400';
      case 'S': return 'text-blue-600 dark:text-blue-400';
      case 'M': return 'text-yellow-600 dark:text-yellow-400';
      case 'L': return 'text-orange-600 dark:text-orange-400';
      case 'XL': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const prSize = categorizePRSize(pr.linesChanged);

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-3 rounded-lg border transition-all duration-200
        hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${
          isSelected
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
            : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750'
        }
      `}
      aria-label={`Select PR #${pr.number} for detailed analysis`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-6 text-center">
              #{rank}
            </span>
            <span className="text-lg">{getStateIcon(pr.state, pr.isDraft)}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                #{pr.number}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                {pr.title}
              </span>
              {pr.isDraft && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full dark:bg-gray-700 dark:text-gray-300">
                  Draft
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>By {pr.author}</span>
              <span>{formatRelativeTime(pr.createdAt)}</span>
              <span className="capitalize">{pr.state}</span>
              {pr.timeToMerge && (
                <span>{pr.timeToMerge}h to merge</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className={`text-sm font-semibold ${getSizeColor(prSize)}`}>
              {prSize}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {pr.linesChanged} lines
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function getSizeLabel(size: 'XS' | 'S' | 'M' | 'L' | 'XL'): string {
  const labels = {
    XS: '(≤10 lines)',
    S: '(≤50 lines)',
    M: '(≤200 lines)',
    L: '(≤500 lines)',
    XL: '(>500 lines)',
  };
  return labels[size];
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
  return `${Math.ceil(diffDays / 365)} years ago`;
}

function getTimePeriodLabel(timePeriod: TimePeriod): string {
  switch (timePeriod) {
    case '30d': return 'Last 30 days';
    case '90d': return 'Last 90 days';
    case '6m': return 'Last 6 months';
    case '1y': return 'Last year';
    case 'all': return 'All time';
    default: return 'Custom period';
  }
}