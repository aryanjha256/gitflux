'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchCommitActivity,
  transformCommitActivity,
  type CommitData,
  type GitHubApiResponse,
  type CommitActivity,
} from '@/lib/github-api';

interface CommitChartProps {
  owner: string;
  repo: string;
  data?: CommitData[];
}

interface CommitChartState {
  data: CommitData[];
  loading: boolean;
  error: string | null;
}

export function CommitChart({ owner, repo, data }: CommitChartProps) {
  const [state, setState] = useState<CommitChartState>({
    data: data || [],
    loading: !data,
    error: null,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Handle responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    // Set initial value
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // If data is provided as prop, don't fetch
    if (data) {
      setState({ data, loading: false, error: null });
      return;
    }

    // Fetch commit activity data
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response: GitHubApiResponse<CommitActivity[]> = await fetchCommitActivity(owner, repo);

        if (response.error) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: response.error || 'Failed to fetch commit data',
          }));
          return;
        }

        if (response.data) {
          const transformedData = transformCommitActivity(response.data);
          setState({
            data: transformedData,
            loading: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'No commit data available',
          }));
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'An unexpected error occurred while fetching commit data',
        }));
      }
    };

    fetchData();
  }, [owner, repo, data]);

  // Loading state
  if (state.loading) {
    return (
      <div className="w-full h-80 sm:h-96 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Commit Activity</h3>
            <div className="flex items-center space-x-2" role="status" aria-label="Loading commit data">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" aria-hidden="true"></div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
            </div>
          </div>
          <div className="h-48 sm:h-64 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" aria-hidden="true"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="w-full h-80 sm:h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Commit Activity</h3>
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center max-w-sm px-4">
              <div className="text-red-600 dark:text-red-400 mb-4" role="img" aria-label="Error icon">
                <svg
                  className="mx-auto h-12 w-12"
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
              <p className="text-red-800 dark:text-red-200 font-medium text-base sm:text-lg mb-2">Error loading commit data</p>
              <p className="text-red-600 dark:text-red-300 text-sm leading-relaxed" role="alert" aria-live="polite">
                {state.error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (state.data.length === 0) {
    return (
      <div className="w-full h-80 sm:h-96 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Commit Activity</h3>
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center max-w-sm px-4">
              <div className="text-gray-400 dark:text-gray-500 mb-4" role="img" aria-label="No data icon">
                <svg
                  className="mx-auto h-12 w-12"
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
              <p className="text-gray-600 dark:text-gray-300 font-medium text-base sm:text-lg mb-2">No commit history available</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                This repository doesn't have any commit activity data to display.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900">{formattedDate}</p>
          <p className="text-sm text-blue-600">
            <span className="font-medium">{payload[0].value}</span>{' '}
            {payload[0].value === 1 ? 'commit' : 'commits'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 sm:h-96 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Commit Activity</h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last {state.data.length} weeks
            </div>
            <a
              href={`/analyze/${owner}/${repo}/activity`}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30 transition-colors"
              aria-label={`View detailed activity analysis for ${owner}/${repo}`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Detailed Analysis
            </a>
          </div>
        </div>
        
        <div 
          className="h-48 sm:h-64" 
          role="img" 
          aria-label={`Commit activity chart showing ${state.data.length} weeks of data with ${state.data.reduce((sum, item) => sum + item.count, 0)} total commits`}
          tabIndex={0}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={state.data}
              margin={{
                top: 5,
                right: isMobile ? 10 : 30,
                left: isMobile ? 10 : 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#6b7280"
                fontSize={isMobile ? 10 : 12}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 30 : 40}
                label={{
                  value: 'Commits',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: '#2563eb', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: isMobile ? 3 : 4 }}
                activeDot={{ r: isMobile ? 5 : 6, stroke: '#2563eb', strokeWidth: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Screen reader accessible data summary */}
        <div className="sr-only" aria-live="polite">
          <h4>Commit Activity Data Summary</h4>
          <p>
            This chart shows commit activity over the last {state.data.length} weeks.
            Total commits: {state.data.reduce((sum, item) => sum + item.count, 0)}.
            Average commits per week: {state.data.length > 0 ? Math.round(state.data.reduce((sum, item) => sum + item.count, 0) / state.data.length) : 0}.
          </p>
          <ul>
            {state.data.slice(0, 10).map((item, index) => (
              <li key={index}>
                Week of {new Date(item.date).toLocaleDateString()}: {item.count} commits
              </li>
            ))}
            {state.data.length > 10 && (
              <li>And {state.data.length - 10} more weeks of data...</li>
            )}
          </ul>
        </div>
        
        {/* Keyboard navigation instructions */}
        <div className="sr-only">
          <p>Use Tab to focus on the chart, then use arrow keys to navigate through data points when using a screen reader with chart navigation support.</p>
        </div>
      </div>
    </div>
  );
}