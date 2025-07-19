/**
 * Data processing utilities for commit activity visualizations
 * Handles transformation of GitHub commit data into heatmap and trendline formats
 */

// Time range type for consistency with existing codebase
export type TimeRange = '30d' | '3m' | '6m' | '1y';

// Cache for expensive data transformations
const transformationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Create a cache key for data transformations
 */
function createCacheKey(commits: GitHubCommit[], timeRange: TimeRange, operation: string): string {
  const commitHashes = commits.slice(0, 10).map(c => c.sha).join(',');
  return `${operation}-${timeRange}-${commits.length}-${commitHashes}`;
}

/**
 * Get cached data if available and not expired
 */
function getCachedData<T>(key: string): T | null {
  const cached = transformationCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

/**
 * Cache data with timestamp
 */
function setCachedData<T>(key: string, data: T): void {
  transformationCache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries (keep only last 50)
  if (transformationCache.size > 50) {
    const entries = Array.from(transformationCache.entries());
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    transformationCache.clear();
    entries.slice(0, 50).forEach(([key, value]) => {
      transformationCache.set(key, value);
    });
  }
}

// Core data types for commit activity visualizations
export interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

export interface WeeklyCommitData {
  date: string;           // ISO date string
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  commitCount: number;
  contributors: string[]; // For tooltip details
}

export interface HeatmapData {
  weeks: WeeklyCommitData[];
  totalCommits: number;
  peakDay: { day: string; count: number };
  averagePerDay: number;
}

export interface TrendPoint {
  date: string;
  commitCount: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ContributorTrendData {
  contributor: string;
  avatar?: string;
  dataPoints: TrendPoint[];
}

export interface ContributorAnalysis {
  contributors: ContributorTrendData[];
  timeRange: TimeRange;
  totalContributors: number;
  activeContributors: number; // Contributors with commits in last 30 days
}

/**
 * Transform raw GitHub commits into weekly heatmap format
 * Groups commits by day of week and calculates activity patterns
 * Includes caching for performance optimization
 */
export function transformToHeatmapData(
  commits: GitHubCommit[], 
  timeRange: TimeRange
): HeatmapData {
  if (!commits || commits.length === 0) {
    return {
      weeks: [],
      totalCommits: 0,
      peakDay: { day: 'Sunday', count: 0 },
      averagePerDay: 0
    };
  }

  // Check cache first
  const cacheKey = createCacheKey(commits, timeRange, 'heatmap');
  const cached = getCachedData<HeatmapData>(cacheKey);
  if (cached) {
    return cached;
  }

  // Group commits by day of week
  const dayOfWeekCounts = new Map<number, { count: number; contributors: Set<string> }>();
  const weeklyData = new Map<string, Map<number, { count: number; contributors: Set<string> }>>();

  commits.forEach(commit => {
    const date = new Date(commit.commit.author.date);
    
    // Skip commits with invalid dates
    if (isNaN(date.getTime())) {
      return;
    }
    
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const weekKey = getWeekKey(date);
    const contributor = commit.author?.login || commit.commit.author.name;

    // Update day of week totals
    const dayData = dayOfWeekCounts.get(dayOfWeek) || { count: 0, contributors: new Set() };
    dayData.count += 1;
    dayData.contributors.add(contributor);
    dayOfWeekCounts.set(dayOfWeek, dayData);

    // Update weekly breakdown
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, new Map());
    }
    const weekMap = weeklyData.get(weekKey)!;
    const weekDayData = weekMap.get(dayOfWeek) || { count: 0, contributors: new Set() };
    weekDayData.count += 1;
    weekDayData.contributors.add(contributor);
    weekMap.set(dayOfWeek, weekDayData);
  });

  // Convert to WeeklyCommitData array
  const weeks: WeeklyCommitData[] = [];
  weeklyData.forEach((dayMap, weekKey) => {
    dayMap.forEach((data, dayOfWeek) => {
      weeks.push({
        date: getDateFromWeekAndDay(weekKey, dayOfWeek),
        dayOfWeek,
        commitCount: data.count,
        contributors: Array.from(data.contributors)
      });
    });
  });

  // Calculate peak day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  let peakDay = { day: 'Sunday', count: 0 };
  dayOfWeekCounts.forEach((data, dayOfWeek) => {
    if (data.count > peakDay.count) {
      peakDay = { day: dayNames[dayOfWeek], count: data.count };
    }
  });

  const totalCommits = commits.length;
  const averagePerDay = totalCommits / 7; // Average across days of week

  const result: HeatmapData = {
    weeks: weeks.sort((a, b) => a.date.localeCompare(b.date)),
    totalCommits,
    peakDay,
    averagePerDay
  };

  // Cache the result
  setCachedData(cacheKey, result);
  
  return result;
}

/**
 * Calculate contributor trends with momentum analysis
 * Tracks individual contributor activity over time periods
 * Includes caching for performance optimization
 */
export function calculateContributorTrends(
  commits: GitHubCommit[], 
  timeRange: TimeRange
): ContributorAnalysis {
  if (!commits || commits.length === 0) {
    return {
      contributors: [],
      timeRange,
      totalContributors: 0,
      activeContributors: 0
    };
  }

  // Check cache first
  const cacheKey = createCacheKey(commits, timeRange, 'trends');
  const cached = getCachedData<ContributorAnalysis>(cacheKey);
  if (cached) {
    return cached;
  }

  // Group commits by contributor and time period
  const contributorData = new Map<string, {
    avatar?: string;
    commitsByPeriod: Map<string, number>;
    totalCommits: number;
  }>();

  const periodLength = getPeriodLength(timeRange);
  
  commits.forEach(commit => {
    const contributor = commit.author?.login || commit.commit.author.name;
    const avatar = commit.author?.avatar_url;
    const date = new Date(commit.commit.author.date);
    
    // Skip commits with invalid dates
    if (isNaN(date.getTime())) {
      return;
    }
    
    const periodKey = getPeriodKey(date, periodLength);

    if (!contributorData.has(contributor)) {
      contributorData.set(contributor, {
        avatar,
        commitsByPeriod: new Map(),
        totalCommits: 0
      });
    }

    const data = contributorData.get(contributor)!;
    data.totalCommits += 1;
    data.commitsByPeriod.set(periodKey, (data.commitsByPeriod.get(periodKey) || 0) + 1);
    
    // Update avatar if available
    if (avatar && !data.avatar) {
      data.avatar = avatar;
    }
  });

  // Calculate trends for each contributor
  const contributors: ContributorTrendData[] = [];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  contributorData.forEach((data, contributor) => {
    const dataPoints: TrendPoint[] = [];
    const sortedPeriods = Array.from(data.commitsByPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    sortedPeriods.forEach(([periodKey, commitCount], index) => {
      // Calculate trend direction
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (index > 0) {
        const previousCount = sortedPeriods[index - 1][1];
        if (commitCount > previousCount) {
          trend = 'up';
        } else if (commitCount < previousCount) {
          trend = 'down';
        }
      }

      dataPoints.push({
        date: periodKey,
        commitCount,
        trend
      });
    });

    contributors.push({
      contributor,
      avatar: data.avatar,
      dataPoints
    });
  });

  // Sort contributors by total activity
  contributors.sort((a, b) => {
    const aTotal = a.dataPoints.reduce((sum, point) => sum + point.commitCount, 0);
    const bTotal = b.dataPoints.reduce((sum, point) => sum + point.commitCount, 0);
    return bTotal - aTotal;
  });

  // Count active contributors (those with commits in last 30 days)
  const activeContributors = contributors.filter(contributor => {
    return contributor.dataPoints.some(point => {
      const pointDate = new Date(point.date);
      return pointDate >= thirtyDaysAgo && point.commitCount > 0;
    });
  }).length;

  const result: ContributorAnalysis = {
    contributors,
    timeRange,
    totalContributors: contributors.length,
    activeContributors
  };

  // Cache the result
  setCachedData(cacheKey, result);
  
  return result;
}

/**
 * Aggregate commits by time periods for trend analysis
 * Supports daily, weekly, and monthly aggregation based on time range
 */
export function aggregateCommitsByPeriod(
  commits: GitHubCommit[], 
  period: 'day' | 'week' | 'month'
): { date: string; count: number; contributors: string[] }[] {
  if (!commits || commits.length === 0) {
    return [];
  }

  const aggregated = new Map<string, { count: number; contributors: Set<string> }>();

  commits.forEach(commit => {
    const date = new Date(commit.commit.author.date);
    
    // Skip commits with invalid dates
    if (isNaN(date.getTime())) {
      return;
    }
    
    const contributor = commit.author?.login || commit.commit.author.name;
    let periodKey: string;

    switch (period) {
      case 'day':
        periodKey = date.toISOString().split('T')[0];
        break;
      case 'week':
        periodKey = getWeekKey(date);
        break;
      case 'month':
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        periodKey = date.toISOString().split('T')[0];
    }

    if (!aggregated.has(periodKey)) {
      aggregated.set(periodKey, { count: 0, contributors: new Set() });
    }

    const data = aggregated.get(periodKey)!;
    data.count += 1;
    data.contributors.add(contributor);
  });

  return Array.from(aggregated.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      contributors: Array.from(data.contributors)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Helper functions

/**
 * Get week key for grouping (ISO week format)
 */
function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get ISO week number
 */
function getISOWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Get date string from week key and day of week
 */
function getDateFromWeekAndDay(weekKey: string, dayOfWeek: number): string {
  const [year, week] = weekKey.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const weekStart = new Date(jan4.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  weekStart.setDate(weekStart.getDate() - jan4.getDay() + 1); // Monday of that week
  
  const targetDate = new Date(weekStart);
  targetDate.setDate(weekStart.getDate() + dayOfWeek - 1); // Adjust for day of week
  
  return targetDate.toISOString().split('T')[0];
}

/**
 * Get period length in days based on time range
 */
function getPeriodLength(timeRange: TimeRange): number {
  switch (timeRange) {
    case '30d':
      return 1; // Daily periods
    case '3m':
      return 7; // Weekly periods
    case '6m':
      return 7; // Weekly periods
    case '1y':
      return 30; // Monthly periods
    default:
      return 7;
  }
}

/**
 * Get period key for grouping commits
 */
function getPeriodKey(date: Date, periodLength: number): string {
  if (periodLength === 1) {
    // Daily
    return date.toISOString().split('T')[0];
  } else if (periodLength === 7) {
    // Weekly
    return getWeekKey(date);
  } else {
    // Monthly
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Filter commits by time range
 */
export function filterCommitsByTimeRange(commits: GitHubCommit[], timeRange: TimeRange): GitHubCommit[] {
  if (!commits || commits.length === 0) {
    return [];
  }

  const now = new Date();
  let cutoffDate: Date;

  switch (timeRange) {
    case '30d':
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3m':
      cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6m':
      cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case '1y':
      cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return commits;
  }

  return commits.filter(commit => {
    const commitDate = new Date(commit.commit.author.date);
    
    // Skip commits with invalid dates
    if (isNaN(commitDate.getTime())) {
      return false;
    }
    
    return commitDate >= cutoffDate;
  });
}