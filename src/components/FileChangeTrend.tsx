'use client';

import { TrendPoint, TimePeriod } from '@/lib/github-api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useMemo } from 'react';

interface FileChangeTrendProps {
  filename: string;
  trendData: TrendPoint[];
  timePeriod: TimePeriod;
}

export function FileChangeTrend({ filename, trendData, timePeriod }: FileChangeTrendProps) {
  // Process and format trend data for the chart
  const chartData = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return [];
    }

    return trendData.map(point => ({
      date: point.date,
      changes: point.changes,
      formattedDate: formatDateForDisplay(point.date, timePeriod),
    }));
  }, [trendData, timePeriod]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalChanges: 0,
        averageChanges: 0,
        peakChanges: 0,
        peakDate: '',
      };
    }

    const totalChanges = chartData.reduce((sum, point) => sum + point.changes, 0);
    const averageChanges = totalChanges / chartData.length;
    const peakPoint = chartData.reduce((max, point) => 
      point.changes > max.changes ? point : max
    );

    return {
      totalChanges,
      averageChanges: Math.round(averageChanges * 10) / 10,
      peakChanges: peakPoint.changes,
      peakDate: peakPoint.formattedDate,
    };
  }, [chartData]);

  if (!trendData || trendData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Change Trend
          </h4>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {getTimePeriodLabel(timePeriod)}
          </div>
        </div>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-lg font-medium">No trend data available</p>
          <p className="text-sm">
            {filename ? `No changes found for ${filename} in the selected time period.` : 'Select a file to view its change trend.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Change Trend
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
            {filename}
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {getTimePeriodLabel(timePeriod)}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Changes"
          value={stats.totalChanges.toString()}
          icon="📊"
        />
        <StatCard
          label="Average"
          value={stats.averageChanges.toString()}
          icon="📈"
        />
        <StatCard
          label="Peak Changes"
          value={stats.peakChanges.toString()}
          icon="🔥"
        />
        <StatCard
          label="Peak Date"
          value={stats.peakDate}
          icon="📅"
          isDate
        />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="changesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Area
              type="monotone"
              dataKey="changes"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#changesGradient)"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Activity Pattern Analysis */}
      <ActivityPatternAnalysis data={chartData} timePeriod={timePeriod} />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  isDate?: boolean;
}

function StatCard({ label, value, icon, isDate = false }: StatCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className={`font-semibold text-gray-900 dark:text-gray-100 ${isDate ? 'text-sm' : 'text-lg'}`}>
        {value}
      </div>
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
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          <span className="font-medium">{data.value}</span> changes
        </p>
      </div>
    );
  }
  return null;
}

interface ActivityPatternAnalysisProps {
  data: Array<{ date: string; changes: number; formattedDate: string }>;
  timePeriod: TimePeriod;
}

function ActivityPatternAnalysis({ data, timePeriod }: ActivityPatternAnalysisProps) {
  const analysis = useMemo(() => {
    if (data.length === 0) return null;

    const totalChanges = data.reduce((sum, point) => sum + point.changes, 0);
    const averageChanges = totalChanges / data.length;
    
    // Find periods of high activity (above average)
    const highActivityPeriods = data.filter(point => point.changes > averageChanges);
    const lowActivityPeriods = data.filter(point => point.changes === 0);
    
    // Calculate trend (simple linear regression slope)
    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.changes, 0);
    const sumXY = data.reduce((sum, point, index) => sum + index * point.changes, 0);
    const sumXX = data.reduce((sum, _, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';

    return {
      trend,
      highActivityPeriods: highActivityPeriods.length,
      lowActivityPeriods: lowActivityPeriods.length,
      consistencyScore: Math.round((1 - (Math.sqrt(data.reduce((sum, point) => sum + Math.pow(point.changes - averageChanges, 2), 0) / n) / averageChanges)) * 100),
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
      <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Activity Pattern Analysis
      </h5>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTrendIcon(analysis.trend)}</span>
          <span className="text-gray-600 dark:text-gray-400">Trend:</span>
          <span className={`font-medium capitalize ${getTrendColor(analysis.trend)}`}>
            {analysis.trend}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <span className="text-gray-600 dark:text-gray-400">Consistency:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {Math.max(0, analysis.consistencyScore)}%
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="text-gray-600 dark:text-gray-400">High Activity Periods:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {analysis.highActivityPeriods}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-lg">😴</span>
          <span className="text-gray-600 dark:text-gray-400">Inactive Periods:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {analysis.lowActivityPeriods}
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
    case '90d':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '6m':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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