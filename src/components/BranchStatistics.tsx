'use client';

import { BranchData, TimePeriod, calculateBranchHealthScore } from '@/lib/github-api';
import { useMemo } from 'react';

interface BranchStatisticsProps {
  branches: BranchData[];
  isLoading: boolean;
  timePeriod: TimePeriod;
  onBranchSelect?: (branch: BranchData) => void;
  selectedBranch?: string;
}

export function BranchStatistics({ 
  branches, 
  isLoading, 
  timePeriod, 
  onBranchSelect,
  selectedBranch 
}: BranchStatisticsProps) {
  // Calculate branch statistics
  const stats = useMemo(() => {
    const total = branches.length;
    const active = branches.filter(b => b.status === 'active').length;
    const stale = branches.filter(b => b.status === 'stale').length;
    const merged = branches.filter(b => b.status === 'merged').length;
    const defaultBranch = branches.find(b => b.isDefault);

    return {
      total,
      active,
      stale,
      merged,
      defaultBranch,
      healthScore: branches.length > 0 
        ? Math.round(branches.reduce((sum, b) => sum + calculateBranchHealthScore(b), 0) / branches.length)
        : 0,
    };
  }, [branches]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Branch Statistics
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

  if (branches.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Branch Statistics
        </h3>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🌿</div>
          <p className="text-lg font-medium">No branches found</p>
          <p className="text-sm">No branch data available for the selected time period.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Branch Statistics
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {branches.length} branches • {getTimePeriodLabel(timePeriod)}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Branches"
          value={stats.total.toString()}
          icon="🌿"
          color="blue"
        />
        <StatCard
          title="Active"
          value={stats.active.toString()}
          icon="🟢"
          color="green"
          subtitle={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% of total`}
        />
        <StatCard
          title="Stale"
          value={stats.stale.toString()}
          icon="🟡"
          color="yellow"
          subtitle={`${stats.total > 0 ? Math.round((stats.stale / stats.total) * 100) : 0}% of total`}
        />
        <StatCard
          title="Health Score"
          value={`${stats.healthScore}%`}
          icon="💚"
          color="emerald"
          subtitle="Overall branch health"
        />
      </div>

      {/* Default Branch Info */}
      {stats.defaultBranch && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏠</div>
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Default Branch: {stats.defaultBranch.name}
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Last updated {formatRelativeTime(stats.defaultBranch.lastCommitDate)} by {stats.defaultBranch.author}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branch List */}
      <div className="space-y-2">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">
          Branch Details
        </h4>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {branches.map((branch, index) => (
            <BranchItem
              key={branch.name}
              branch={branch}
              rank={index + 1}
              isSelected={selectedBranch === branch.name}
              onSelect={() => onBranchSelect?.(branch)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'emerald';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
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

interface BranchItemProps {
  branch: BranchData;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}

function BranchItem({ branch, rank, isSelected, onSelect }: BranchItemProps) {
  const healthScore = calculateBranchHealthScore(branch);
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'stale': return '🟡';
      case 'merged': return '🔵';
      default: return '⚪';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

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
      aria-label={`Select ${branch.name} branch for detailed analysis`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-6 text-center">
              #{rank}
            </span>
            <span className="text-lg">{getStatusIcon(branch.status)}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {branch.name}
              </span>
              {branch.isDefault && (
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                  Default
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>By {branch.author}</span>
              <span>{formatRelativeTime(branch.lastCommitDate)}</span>
              <span className="capitalize">{branch.status}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className={`text-sm font-semibold ${getHealthColor(healthScore)}`}>
              {healthScore}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Health
            </div>
          </div>
          
          {/* Health indicator */}
          <div className="w-2 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`w-full transition-all duration-300 ${
                healthScore >= 80 ? 'bg-green-500' :
                healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ height: `${healthScore}%`, marginTop: `${100 - healthScore}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
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