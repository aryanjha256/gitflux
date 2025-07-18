'use client';

import { ReviewAnalyticsData, ReviewerStats, ReviewPatternData } from '@/lib/github-api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { useMemo } from 'react';

interface ReviewStatisticsProps {
  reviewData: ReviewAnalyticsData;
  isLoading: boolean;
}

export function ReviewStatistics({ reviewData, isLoading }: ReviewStatisticsProps) {
  // Process review pattern data for timeline chart
  const timelineData = useMemo(() => {
    if (!reviewData?.reviewPatterns || reviewData.reviewPatterns.length === 0) {
      return [];
    }

    return reviewData.reviewPatterns.map(pattern => ({
      date: formatDateForDisplay(pattern.date),
      reviews: pattern.reviewsGiven,
      approvals: pattern.approvalsGiven,
      changeRequests: pattern.changeRequestsGiven,
      total: pattern.reviewsGiven + pattern.approvalsGiven + pattern.changeRequestsGiven,
    }));
  }, [reviewData?.reviewPatterns]);

  // Process top reviewers data for charts
  const topReviewersData = useMemo(() => {
    if (!reviewData?.topReviewers || reviewData.topReviewers.length === 0) {
      return [];
    }

    return reviewData.topReviewers
      .slice(0, 10) // Top 10 reviewers
      .map(reviewer => ({
        username: reviewer.username,
        reviews: reviewer.reviewCount,
        approvalRate: reviewer.approvalRate,
        avgResponseTime: reviewer.averageResponseTime,
        changeRequestRate: reviewer.changeRequestRate,
      }));
  }, [reviewData?.topReviewers]);

  // Calculate review distribution data
  const reviewDistribution = useMemo(() => {
    if (!reviewData?.topReviewers || reviewData.topReviewers.length === 0) {
      return [];
    }

    const totalReviews = reviewData.topReviewers.reduce((sum, reviewer) => sum + reviewer.reviewCount, 0);
    const topReviewers = reviewData.topReviewers.slice(0, 5);
    const othersCount = totalReviews - topReviewers.reduce((sum, reviewer) => sum + reviewer.reviewCount, 0);

    const data = topReviewers.map((reviewer, index) => ({
      name: reviewer.username,
      value: reviewer.reviewCount,
      percentage: totalReviews > 0 ? (reviewer.reviewCount / totalReviews) * 100 : 0,
      color: getReviewerColor(index),
    }));

    if (othersCount > 0) {
      data.push({
        name: 'Others',
        value: othersCount,
        percentage: totalReviews > 0 ? (othersCount / totalReviews) * 100 : 0,
        color: '#94a3b8',
      });
    }

    return data;
  }, [reviewData?.topReviewers]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Code Review Statistics
        </h3>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-500">Loading chart...</div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <div className="text-gray-400 dark:text-gray-500">Loading chart...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reviewData || reviewData.totalReviews === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Code Review Statistics
        </h3>
        
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-xl font-medium mb-2">No review data available</p>
          <p className="text-sm">
            This repository doesn't have enough pull request review activity to generate statistics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Code Review Statistics
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {reviewData.totalReviews} total reviews analyzed
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Reviews per PR"
          value={reviewData.averageReviewsPerPR.toFixed(1)}
          icon="📝"
          color="blue"
          subtitle="reviews per pull request"
        />
        <MetricCard
          title="Time to First Review"
          value={formatDuration(reviewData.averageTimeToFirstReview)}
          icon="⏱️"
          color="green"
          subtitle="average response time"
        />
        <MetricCard
          title="Time to Approval"
          value={formatDuration(reviewData.averageTimeToApproval)}
          icon="✅"
          color="purple"
          subtitle="average approval time"
        />
        <MetricCard
          title="Active Reviewers"
          value={reviewData.topReviewers.length.toString()}
          icon="�"
          color="orange"
          subtitle="contributing to reviews"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Reviewers Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top Reviewers by Activity
          </h4>
          {topReviewersData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topReviewersData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="username"
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
                <Tooltip content={<ReviewerTooltip />} />
                <Bar
                  dataKey="reviews"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Reviews"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No reviewer data available
            </div>
          )}
        </div>

        {/* Review Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Review Distribution
          </h4>
          {reviewDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reviewDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {reviewDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry) => (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {value} ({(entry.payload as any)?.percentage?.toFixed(1)}%)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              No distribution data available
            </div>
          )}
        </div>
      </div>

      {/* Review Timeline */}
      {timelineData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Review Activity Timeline
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<TimelineTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="reviews"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Reviews"
              />
              <Line
                type="monotone"
                dataKey="approvals"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Approvals"
              />
              <Line
                type="monotone"
                dataKey="changeRequests"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Change Requests"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Reviewers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Reviewer Performance
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reviewer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Approval Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Change Request Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topReviewersData.slice(0, 10).map((reviewer, index) => (
                <tr key={reviewer.username} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {reviewer.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {reviewer.username}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Rank #{index + 1}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {reviewer.reviews}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {reviewer.approvalRate.toFixed(1)}%
                      </div>
                      <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${Math.min(reviewer.approvalRate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatDuration(reviewer.avgResponseTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {reviewer.changeRequestRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Quality Insights */}
      <ReviewQualityInsights reviewData={reviewData} />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle?: string;
}

function MetricCard({ title, value, icon, color, subtitle }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-100',
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

interface ReviewerTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function ReviewerTooltip({ active, payload, label }: ReviewerTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Reviews:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.reviews}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Approval Rate:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.approvalRate.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-400">Avg Response:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(data.avgResponseTime)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

interface PieTooltipProps {
  active?: boolean;
  payload?: any[];
}

function PieTooltip({ active, payload }: PieTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {data.name}
        </p>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {data.value} reviews ({data.percentage.toFixed(1)}%)
        </div>
      </div>
    );
  }
  return null;
}

interface TimelineTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function TimelineTooltip({ active, payload, label }: TimelineTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        <div className="space-y-1 text-sm">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

interface ReviewQualityInsightsProps {
  reviewData: ReviewAnalyticsData;
}

function ReviewQualityInsights({ reviewData }: ReviewQualityInsightsProps) {
  const insights = useMemo(() => {
    if (!reviewData || reviewData.topReviewers.length === 0) {
      return null;
    }

    // Calculate overall approval rate
    const totalReviews = reviewData.topReviewers.reduce((sum, reviewer) => sum + reviewer.reviewCount, 0);
    const weightedApprovalRate = reviewData.topReviewers.reduce(
      (sum, reviewer) => sum + (reviewer.approvalRate * reviewer.reviewCount),
      0
    ) / totalReviews;

    // Calculate average response time
    const avgResponseTime = reviewData.averageTimeToFirstReview;

    // Determine review health
    const getHealthStatus = () => {
      if (weightedApprovalRate > 80 && avgResponseTime < 24) return { status: 'excellent', color: 'green' };
      if (weightedApprovalRate > 60 && avgResponseTime < 48) return { status: 'good', color: 'blue' };
      if (weightedApprovalRate > 40 && avgResponseTime < 72) return { status: 'fair', color: 'yellow' };
      return { status: 'needs improvement', color: 'red' };
    };

    const health = getHealthStatus();

    return {
      overallApprovalRate: weightedApprovalRate,
      avgResponseTime,
      health,
      activeReviewers: reviewData.topReviewers.length,
      reviewsPerPR: reviewData.averageReviewsPerPR,
    };
  }, [reviewData]);

  if (!insights) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Review Quality Insights
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full bg-${insights.health.color}-500`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Review Process Health: <span className="capitalize">{insights.health.status}</span>
            </span>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              • Overall approval rate: <strong>{insights.overallApprovalRate.toFixed(1)}%</strong>
            </p>
            <p>
              • Average response time: <strong>{formatDuration(insights.avgResponseTime)}</strong>
            </p>
            <p>
              • Active reviewers: <strong>{insights.activeReviewers}</strong>
            </p>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Recommendations:</h5>
          {insights.reviewsPerPR < 2 && (
            <p>• Consider requiring more reviewers per PR for better code quality</p>
          )}
          {insights.avgResponseTime > 48 && (
            <p>• Work on reducing review response times to improve development velocity</p>
          )}
          {insights.overallApprovalRate < 60 && (
            <p>• High change request rate may indicate need for better PR preparation</p>
          )}
          {insights.activeReviewers < 3 && (
            <p>• Consider involving more team members in the review process</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days}d`;
  }
  return `${days}d ${remainingHours}h`;
}

function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getReviewerColor(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6366f1', // indigo
  ];
  return colors[index % colors.length];
}