'use client';

import { TimePeriod } from '@/lib/github-api';

interface TimePeriodFilterProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  isLoading: boolean;
}

const TIME_PERIODS: { value: TimePeriod; label: string; description: string }[] = [
  { value: '30d', label: '30 Days', description: 'Last 30 days' },
  { value: '90d', label: '90 Days', description: 'Last 3 months' },
  { value: '6m', label: '6 Months', description: 'Last 6 months' },
  { value: '1y', label: '1 Year', description: 'Last 12 months' },
  { value: 'all', label: 'All Time', description: 'Complete history' },
];

export function TimePeriodFilter({ selectedPeriod, onPeriodChange, isLoading }: TimePeriodFilterProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Time Period
        </h3>
        {isLoading && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {TIME_PERIODS.map((period) => (
          <button
            key={period.value}
            onClick={() => onPeriodChange(period.value)}
            disabled={isLoading}
            className={`
              px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                selectedPeriod === period.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
              }
            `}
            title={period.description}
            aria-pressed={selectedPeriod === period.value}
            aria-label={`Filter by ${period.description}`}
          >
            {period.label}
          </button>
        ))}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {TIME_PERIODS.find(p => p.value === selectedPeriod)?.description}
      </div>
    </div>
  );
}