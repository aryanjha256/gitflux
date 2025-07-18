'use client';

import { PRTimelineData, TimePeriod } from '@/lib/github-api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMemo } from 'react';

interface PRTimelineProps {
  timelineData: PRTimelineData[];
  timePeriod: TimePeriod;
  isLoading: boolean;
}

export function PRTimeline({ timelineData, timePeriod, isLoading }: PRTimelineProps) {
  // Process and format timeline data for the chart
  const chartData = useMemo(() => {
    if (!timelineData || timelineData.length === 0) {
      return [];
    }

    return timelineData.map(point => ({
      date: point.date,
      opened: point.opened,
      merged: point.merged,
      closed: point.closed,
      formattedDate: formatDateForDisplay(point.date, timePeriod),
    }));
  }, [timelineData, timePeriod]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalOpened: 0,
        totalMerged: 0,
        totalClosed: 0,
        peakDay: { date: '', count: 0 },
      };
    }

    const totalOpened = chartData.reduce((sum, point) => sum + point.opened, 0);
    const totalMerged = chartData.reduce((sum, point) => sum + point.merged, 0);
    const totalClosed = chartData.reduce((sum, point) => sum + point.closed, 0);
    
    // Find peak activity day
    const peakDay = chartData.reduce((max, point) => {
      const total = point.opened + point.merged + point.closed;
      return total > max.count ? { date: point.formattedDate, count: total } : max;
    }, { date: '', count: 0 });

    return {
      totalOpened,
      totalMerged,
      totalClosed,
      peakDay,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Timeline
        </h3>
        
        {/* Loading skeleton */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-gray-400 dark:text-gray-500">
              Loading chart...
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!timelineData || timelineData.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Timeline
        </h3>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-lg font-medium">No timeline data available</p>
          <p className="text-sm">Not enough pull request activity to generate a timeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pull Request Timeline
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {getTimePeriodLabel(timePeriod)}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="mergedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="closedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" height={36} />
            <Area
              type="monotone"
              dataKey="opened"
              name="Opened"
              stackId="1"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#openedGradient)"
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            />
            <Area
              type="monotone"
              dataKey="merged"
              name="Merged"
              stackId="2"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#mergedGradient)"
              activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#ffffff' }}
            />
            <Area
              type="monotone"
              dataKey="closed"
              name="Closed"
              stackId="3"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#closedGradient)"
              activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="PRs Opened"
          value={stats.totalOpened.toString()}
          icon="🔀"
          color="blue"
        />
        <StatCard
          title="PRs Merged"
          value={stats.totalMerged.toString()}
          icon="✅"
          color="purple"
        />
        <StatCard
          title="PRs Closed"
          value={stats.totalClosed.toString()}
          icon="🔴"
          color="red"
        />
        <StatCard
          title="Peak Activity"
          value={stats.peakDay.count.toString()}
          icon="📊"
          color="emerald"
          subtitle={stats.peakDay.date}
        />
      </div>

      {/* Activity Pattern Analysis */}
      <ActivityPatternAnalysis data={chartData} timePeriod={timePeriod} />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'purple' | 'red' | 'emerald';
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const opened = payload.find(p => p.dataKey === 'opened')?.value || 0;
    const merged = payload.find(p => p.dataKey === 'merged')?.value || 0;
    const closed = payload.find(p => p.dataKey === 'closed')?.value || 0;
    const total = opened + merged + closed;

    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-blue-600 dark:text-blue-400">Opened:</span>
            <span className="font-medium text-blue-600 dark:text-blue-400">{opened}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-purple-600 dark:text-purple-400">Merged:</span>
            <span className="font-medium text-purple-600 dark:text-purple-400">{merged}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-red-600 dark:text-red-400">Closed:</span>
            <span className="font-medium text-red-600 dark:text-red-400">{closed}</span>
          </div>
          <div className="pt-1 mt-1 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <span className="font-medium text-gray-900 dark:text-gray-100">Total:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{total}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface ActivityPatternAnalysisProps {
  data: Array<{ date: string; opened: number; merged: number; closed: number; formattedDate: string }>;
  timePeriod: TimePeriod;
}

function ActivityPatternAnalysis({ data, timePeriod }: ActivityPatternAnalysisProps) {
  const analysis = useMemo(() => {
    if (data.length === 0) return null;

    // Calculate totals
    const totalOpened = data.reduce((sum, point) => sum + point.opened, 0);
    const totalMerged = data.reduce((sum, point) => sum + point.merged, 0);
    const totalClosed = data.reduce((sum, point) => sum + point.closed, 0);
    
    // Calculate averages
    const avgOpened = totalOpened / data.length;
    const avgMerged = totalMerged / data.length;
    const avgClosed = totalClosed / data.length;
    
    // Calculate trend (simple linear regression slope)
    const n = data.length;
    if (n <= 1) return null;
    
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + (point.opened + point.merged + point.closed), 0);
    const sumXY = data.reduce((sum, point, index) => sum + index * (point.opened + point.merged + point.closed), 0);
    const sumXX = data.reduce((sum, _, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';

    // Calculate merge ratio
    const mergeRatio = totalOpened > 0 ? (totalMerged / totalOpened) * 100 : 0;

    // Calculate activity consistency
    const activityValues = data.map(point => point.opened + point.merged + point.closed);
    const avgActivity = activityValues.reduce((sum, val) => sum + val, 0) / activityValues.length;
    const variance = activityValues.reduce((sum, val) => sum + Math.pow(val - avgActivity, 2), 0) / activityValues.length;
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, Math.min(100, 100 - (stdDev / avgActivity) * 100));

    return {
      trend,
      mergeRatio: Math.round(mergeRatio),
      consistencyScore: Math.round(consistencyScore),
      avgDailyActivity: Math.round((avgOpened + avgMerged + avgClosed) * 10) / 10,
    };
  }, [data]);

  if (!analysis) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'text-green-600 dark:text-green-400';
      case 'decreasing': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Activity Pattern Analysis
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTrendIcon(analysis.trend)}</span>
          <span className="text-gray-600 dark:text-gray-400">Activity Trend:</span>
          <span className={`font-medium capitalize ${getTrendColor(analysis.trend)}`}>
            {analysis.trend}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-gray-600 dark:text-gray-400">Consistency:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {analysis.consistencyScore}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">🔄</span>
          <span className="text-gray-600 dark:text-gray-400">Merge Ratio:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {analysis.mergeRatio}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">📆</span>
          <span className="text-gray-600 dark:text-gray-400">Avg Daily Activity:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {analysis.avgDailyActivity}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatDateForDisplay(dateString: string, timePeriod: TimePeriod): string {
  const date = new Date(dateString);
  
  switch (timePeriod) {
    case '30d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '90d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '6m':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case '1y':
    case 'all':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    default:
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
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