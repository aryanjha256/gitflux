/**
 * Unit tests for commit activity data processing utilities
 * Tests transformation functions with various edge cases and scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  transformToHeatmapData,
  calculateContributorTrends,
  aggregateCommitsByPeriod,
  filterCommitsByTimeRange,
  type GitHubCommit,
  type TimeRange,
  type HeatmapData,
  type ContributorAnalysis
} from './commit-activity-data';

// Mock data generators
function createMockCommit(
  date: string,
  author: string,
  sha: string = `sha-${Math.random()}`,
  avatar?: string
): GitHubCommit {
  return {
    sha,
    commit: {
      author: {
        name: author,
        email: `${author}@example.com`,
        date
      },
      message: `Test commit by ${author}`
    },
    author: {
      login: author,
      avatar_url: avatar || `https://github.com/${author}.png`
    }
  };
}

function createMockCommitWithoutGitHubAuthor(
  date: string,
  author: string,
  sha: string = `sha-${Math.random()}`
): GitHubCommit {
  return {
    sha,
    commit: {
      author: {
        name: author,
        email: `${author}@example.com`,
        date
      },
      message: `Test commit by ${author}`
    },
    author: null
  };
}

describe('transformToHeatmapData', () => {
  it('should handle empty commits array', () => {
    const result = transformToHeatmapData([], '30d');
    
    expect(result).toEqual({
      weeks: [],
      totalCommits: 0,
      peakDay: { day: 'Sunday', count: 0 },
      averagePerDay: 0
    });
  });

  it('should transform commits into weekly heatmap data', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'), // Monday
      createMockCommit('2024-01-01T14:00:00Z', 'bob'),   // Monday
      createMockCommit('2024-01-02T09:00:00Z', 'alice'), // Tuesday
      createMockCommit('2024-01-07T11:00:00Z', 'charlie') // Sunday
    ];

    const result = transformToHeatmapData(commits, '30d');

    expect(result.totalCommits).toBe(4);
    expect(result.weeks).toHaveLength(3); // 3 different day/week combinations
    expect(result.peakDay.day).toBe('Monday');
    expect(result.peakDay.count).toBe(2);
    expect(result.averagePerDay).toBe(4 / 7);
  });

  it('should group contributors correctly for each day', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-01T14:00:00Z', 'bob'),
      createMockCommit('2024-01-01T16:00:00Z', 'alice') // Same day, same contributor
    ];

    const result = transformToHeatmapData(commits, '30d');
    const mondayData = result.weeks.find(w => w.dayOfWeek === 1); // Monday

    expect(mondayData).toBeDefined();
    expect(mondayData!.commitCount).toBe(3);
    expect(mondayData!.contributors).toEqual(expect.arrayContaining(['alice', 'bob']));
    expect(mondayData!.contributors).toHaveLength(2);
  });

  it('should handle commits without GitHub author info', () => {
    const commits = [
      createMockCommitWithoutGitHubAuthor('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-01T14:00:00Z', 'bob')
    ];

    const result = transformToHeatmapData(commits, '30d');

    expect(result.totalCommits).toBe(2);
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].contributors).toEqual(expect.arrayContaining(['alice', 'bob']));
  });

  it('should calculate correct day of week for different dates', () => {
    const commits = [
      createMockCommit('2024-01-07T10:00:00Z', 'alice'), // Sunday (0)
      createMockCommit('2024-01-08T10:00:00Z', 'alice'), // Monday (1)
      createMockCommit('2024-01-13T10:00:00Z', 'alice')  // Saturday (6)
    ];

    const result = transformToHeatmapData(commits, '30d');

    const dayOfWeeks = result.weeks.map(w => w.dayOfWeek).sort();
    expect(dayOfWeeks).toEqual([0, 1, 6]); // Sunday, Monday, Saturday
  });

  it('should handle leap year dates correctly', () => {
    const commits = [
      createMockCommit('2024-02-29T10:00:00Z', 'alice'), // Leap year date
      createMockCommit('2024-03-01T10:00:00Z', 'bob')
    ];

    const result = transformToHeatmapData(commits, '30d');

    expect(result.totalCommits).toBe(2);
    expect(result.weeks).toHaveLength(2);
  });
});

describe('calculateContributorTrends', () => {
  it('should handle empty commits array', () => {
    const result = calculateContributorTrends([], '30d');
    
    expect(result).toEqual({
      contributors: [],
      timeRange: '30d',
      totalContributors: 0,
      activeContributors: 0
    });
  });

  it('should calculate trends for multiple contributors', () => {
    const now = new Date();
    const commits = [
      createMockCommit(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), 'alice'),
      createMockCommit(new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), 'alice'),
      createMockCommit(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), 'bob'),
      createMockCommit(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), 'alice')
    ];

    const result = calculateContributorTrends(commits, '30d');

    expect(result.totalContributors).toBe(2);
    expect(result.activeContributors).toBe(2); // Both have commits in last 30 days
    expect(result.contributors).toHaveLength(2);
    
    // Alice should be first (more commits)
    expect(result.contributors[0].contributor).toBe('alice');
    expect(result.contributors[1].contributor).toBe('bob');
  });

  it('should calculate trend directions correctly', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-02T10:00:00Z', 'alice'),
      createMockCommit('2024-01-03T10:00:00Z', 'alice'),
      createMockCommit('2024-01-03T14:00:00Z', 'alice'), // 2 commits on day 3
      createMockCommit('2024-01-04T10:00:00Z', 'alice')  // Back to 1 commit
    ];

    const result = calculateContributorTrends(commits, '30d');
    const aliceData = result.contributors.find(c => c.contributor === 'alice');

    expect(aliceData).toBeDefined();
    expect(aliceData!.dataPoints).toHaveLength(4); // 4 different days
    
    // Check trend directions
    const trends = aliceData!.dataPoints.map(p => p.trend);
    expect(trends[0]).toBe('stable'); // First point is always stable
    expect(trends[1]).toBe('stable'); // 1 -> 1 commits
    expect(trends[2]).toBe('up');     // 1 -> 2 commits
    expect(trends[3]).toBe('down');   // 2 -> 1 commits
  });

  it('should handle different time ranges with appropriate period lengths', () => {
    const commits = Array.from({ length: 100 }, (_, i) => 
      createMockCommit(
        new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        'alice'
      )
    );

    const yearlyResult = calculateContributorTrends(commits, '1y');
    const monthlyResult = calculateContributorTrends(commits, '3m');
    const dailyResult = calculateContributorTrends(commits, '30d');

    // Yearly should have fewer data points (monthly aggregation)
    // Monthly should have weekly aggregation
    // Daily should have daily aggregation
    expect(yearlyResult.contributors[0].dataPoints.length).toBeLessThan(
      monthlyResult.contributors[0].dataPoints.length
    );
  });

  it('should preserve avatar URLs', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice', 'sha1', 'https://avatar.com/alice.png'),
      createMockCommit('2024-01-02T10:00:00Z', 'alice', 'sha2', 'https://avatar.com/alice.png')
    ];

    const result = calculateContributorTrends(commits, '30d');
    const aliceData = result.contributors.find(c => c.contributor === 'alice');

    expect(aliceData!.avatar).toBe('https://avatar.com/alice.png');
  });

  it('should count active contributors correctly', () => {
    const now = new Date();
    const commits = [
      // Active contributor (recent commits)
      createMockCommit(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), 'alice'),
      // Inactive contributor (old commits)
      createMockCommit(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), 'bob')
    ];

    const result = calculateContributorTrends(commits, '1y');

    expect(result.totalContributors).toBe(2);
    expect(result.activeContributors).toBe(1); // Only alice is active
  });
});

describe('aggregateCommitsByPeriod', () => {
  it('should handle empty commits array', () => {
    const result = aggregateCommitsByPeriod([], 'day');
    expect(result).toEqual([]);
  });

  it('should aggregate commits by day', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-01T14:00:00Z', 'bob'),
      createMockCommit('2024-01-02T09:00:00Z', 'alice')
    ];

    const result = aggregateCommitsByPeriod(commits, 'day');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2024-01-01',
      count: 2,
      contributors: expect.arrayContaining(['alice', 'bob'])
    });
    expect(result[1]).toEqual({
      date: '2024-01-02',
      count: 1,
      contributors: ['alice']
    });
  });

  it('should aggregate commits by week', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'), // Week 1
      createMockCommit('2024-01-02T10:00:00Z', 'bob'),   // Week 1
      createMockCommit('2024-01-08T10:00:00Z', 'alice')  // Week 2
    ];

    const result = aggregateCommitsByPeriod(commits, 'week');

    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(2);
    expect(result[1].count).toBe(1);
  });

  it('should aggregate commits by month', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-15T10:00:00Z', 'bob'),
      createMockCommit('2024-02-01T10:00:00Z', 'alice')
    ];

    const result = aggregateCommitsByPeriod(commits, 'month');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: '2024-01',
      count: 2,
      contributors: expect.arrayContaining(['alice', 'bob'])
    });
    expect(result[1]).toEqual({
      date: '2024-02',
      count: 1,
      contributors: ['alice']
    });
  });

  it('should sort results by date', () => {
    const commits = [
      createMockCommit('2024-01-03T10:00:00Z', 'alice'),
      createMockCommit('2024-01-01T10:00:00Z', 'bob'),
      createMockCommit('2024-01-02T10:00:00Z', 'charlie')
    ];

    const result = aggregateCommitsByPeriod(commits, 'day');

    expect(result.map(r => r.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
  });

  it('should deduplicate contributors within same period', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2024-01-01T14:00:00Z', 'alice'), // Same contributor, same day
      createMockCommit('2024-01-01T16:00:00Z', 'bob')
    ];

    const result = aggregateCommitsByPeriod(commits, 'day');

    expect(result[0].count).toBe(3);
    expect(result[0].contributors).toEqual(expect.arrayContaining(['alice', 'bob']));
    expect(result[0].contributors).toHaveLength(2);
  });
});

describe('filterCommitsByTimeRange', () => {
  const now = new Date();
  
  it('should handle empty commits array', () => {
    const result = filterCommitsByTimeRange([], '30d');
    expect(result).toEqual([]);
  });

  it('should filter commits by 30 days', () => {
    const commits = [
      createMockCommit(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), 'alice'), // 10 days ago
      createMockCommit(new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), 'bob'),   // 40 days ago
      createMockCommit(new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(), 'charlie') // 20 days ago
    ];

    const result = filterCommitsByTimeRange(commits, '30d');

    expect(result).toHaveLength(2);
    expect(result.map(c => c.commit.author.name)).toEqual(expect.arrayContaining(['alice', 'charlie']));
  });

  it('should filter commits by 3 months', () => {
    const commits = [
      createMockCommit(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), 'alice'),  // 60 days ago
      createMockCommit(new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(), 'bob'),   // 120 days ago
      createMockCommit(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), 'charlie') // 30 days ago
    ];

    const result = filterCommitsByTimeRange(commits, '3m');

    expect(result).toHaveLength(2);
    expect(result.map(c => c.commit.author.name)).toEqual(expect.arrayContaining(['alice', 'charlie']));
  });

  it('should filter commits by 6 months', () => {
    const commits = [
      createMockCommit(new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString(), 'alice'), // ~3 months ago
      createMockCommit(new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000).toISOString(), 'bob'),   // ~7 months ago
    ];

    const result = filterCommitsByTimeRange(commits, '6m');

    expect(result).toHaveLength(1);
    expect(result[0].commit.author.name).toBe('alice');
  });

  it('should filter commits by 1 year', () => {
    const commits = [
      createMockCommit(new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString(), 'alice'), // ~10 months ago
      createMockCommit(new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString(), 'bob'),   // ~13 months ago
    ];

    const result = filterCommitsByTimeRange(commits, '1y');

    expect(result).toHaveLength(1);
    expect(result[0].commit.author.name).toBe('alice');
  });

  it('should preserve original array for invalid time range', () => {
    const commits = [
      createMockCommit('2024-01-01T10:00:00Z', 'alice'),
      createMockCommit('2023-01-01T10:00:00Z', 'bob')
    ];

    const result = filterCommitsByTimeRange(commits, 'invalid' as TimeRange);

    expect(result).toEqual(commits);
  });
});

describe('Edge cases and error handling', () => {
  it('should handle malformed dates gracefully', () => {
    const commits = [
      {
        sha: 'test-sha',
        commit: {
          author: {
            name: 'alice',
            email: 'alice@example.com',
            date: 'invalid-date'
          },
          message: 'Test commit'
        },
        author: {
          login: 'alice',
          avatar_url: 'https://github.com/alice.png'
        }
      } as GitHubCommit
    ];

    // Should not throw errors
    expect(() => transformToHeatmapData(commits, '30d')).not.toThrow();
    expect(() => calculateContributorTrends(commits, '30d')).not.toThrow();
    expect(() => aggregateCommitsByPeriod(commits, 'day')).not.toThrow();
  });

  it('should handle null/undefined inputs', () => {
    expect(() => transformToHeatmapData(null as any, '30d')).not.toThrow();
    expect(() => calculateContributorTrends(undefined as any, '30d')).not.toThrow();
    expect(() => aggregateCommitsByPeriod(null as any, 'day')).not.toThrow();
    expect(() => filterCommitsByTimeRange(undefined as any, '30d')).not.toThrow();
  });

  it('should handle very large datasets efficiently', () => {
    const largeCommitSet = Array.from({ length: 10000 }, (_, i) => 
      createMockCommit(
        new Date(Date.now() - i * 60 * 60 * 1000).toISOString(), // Every hour
        `user${i % 100}` // 100 different users
      )
    );

    const start = performance.now();
    const heatmapResult = transformToHeatmapData(largeCommitSet, '1y');
    const trendsResult = calculateContributorTrends(largeCommitSet, '1y');
    const aggregatedResult = aggregateCommitsByPeriod(largeCommitSet, 'day');
    const end = performance.now();

    // Should complete within reasonable time (less than 1 second)
    expect(end - start).toBeLessThan(1000);
    
    // Should produce reasonable results
    expect(heatmapResult.totalCommits).toBe(10000);
    expect(trendsResult.totalContributors).toBe(100);
    expect(aggregatedResult.length).toBeGreaterThan(0);
  });

  it('should handle timezone differences correctly', () => {
    const commits = [
      createMockCommit('2024-01-01T23:59:59Z', 'alice'), // End of day UTC
      createMockCommit('2024-01-02T00:00:01Z', 'alice')  // Start of next day UTC
    ];

    const result = aggregateCommitsByPeriod(commits, 'day');

    expect(result).toHaveLength(2); // Should be treated as different days
    expect(result[0].date).toBe('2024-01-01');
    expect(result[1].date).toBe('2024-01-02');
  });
});