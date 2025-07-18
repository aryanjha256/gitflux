'use client';

import { TimePeriod } from '@/lib/github-api';
import { TimePeriodFilter } from './TimePeriodFilter';

interface BranchPRFilterProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  isLoading: boolean;
  showBranchFilter?: boolean;
  showPRFilter?: boolean;
  onBranchFilterChange?: (filter: BranchFilterType) => void;
  onPRFilterChange?: (filter: PRFilterType) => void;
  selectedBranchFilter?: BranchFilterType;
  selectedPRFilter?: PRFilterType;
}

export type BranchFilterType = 'all' | 'active' | 'stale' | 'merged';
export type PRFilterType = 'all' | 'open' | 'closed' | 'merged' | 'draft';

const BRANCH_FILTERS: { value: BranchFilterType; label: string; description: string }[] = [
  { value: 'all', label: 'All Branches', description: 'Show all branches' },
  { value: 'active', label: 'Active', description: 'Recently updated branches' },
  { value: 'stale', label: 'Stale', description: 'Branches with no recent activity' },
  { value: 'merged', label: 'Merged', description: 'Branches that have been merged' },
];

const PR_FILTERS: { value: PRFilterType; label: string; description: string }[] = [
  { value: 'all', label: 'All PRs', description: 'Show all pull requests' },
  { value: 'open', label: 'Open', description: 'Currently open pull requests' },
  { value: 'closed', label: 'Closed', description: 'Closed pull requests' },
  { value: 'merged', label: 'Merged', description: 'Successfully merged pull requests' },
  { value: 'draft', label: 'Draft', description: 'Draft pull requests' },
];

export function BranchPRFilter({
  selectedPeriod,
  onPeriodChange,
  isLoading,
  showBranchFilter = false,
  showPRFilter = false,
  onBranchFilterChange,
  onPRFilterChange,
  selectedBranchFilter = 'all',
  selectedPRFilter = 'all',
}: BranchPRFilterProps) {
  return (
    <div className="space-y-4">
      {/* Time Period Filter */}
      <TimePeriodFilter
        selectedPeriod={selectedPeriod}
        onPeriodChange={onPeriodChange}
        isLoading={isLoading}
      />

      {/* Branch Filter */}
      {showBranchFilter && onBranchFilterChange && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Branch Filter
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {BRANCH_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onBranchFilterChange(filter.value)}
                disabled={isLoading}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedBranchFilter === filter.value
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }
                `}
                title={filter.description}
                aria-pressed={selectedBranchFilter === filter.value}
                aria-label={`Filter by ${filter.description}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {BRANCH_FILTERS.find(f => f.value === selectedBranchFilter)?.description}
          </div>
        </div>
      )}

      {/* PR Filter */}
      {showPRFilter && onPRFilterChange && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pull Request Filter
            </h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {PR_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => onPRFilterChange(filter.value)}
                disabled={isLoading}
                className={`
                  px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    selectedPRFilter === filter.value
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }
                `}
                title={filter.description}
                aria-pressed={selectedPRFilter === filter.value}
                aria-label={`Filter by ${filter.description}`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {PR_FILTERS.find(f => f.value === selectedPRFilter)?.description}
          </div>
        </div>
      )}
    </div>
  );
}