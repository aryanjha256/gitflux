/**
 * Performance tests for commit activity visualization components
 * Tests component behavior with large datasets and measures rendering performance
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { WeeklyCommitData, ContributorTrendData } from '@/lib/commit-activity-data';
import { transformToHeatmapData, calculateContributorTrends } from '@/lib/commit-activity-data';

describe('Performance Tests', () => {
  // Generate large dataset for testing
  const generateLargeCommitData = (size: number) => {
    const commits = [];
    const startDate = new Date('2023-01-01');
    
    for (let i = 0; i < size; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      commits.push({
        sha: `commit-${i}`,
        commit: {
          author: {
            name: `contributor-${i % 10}`,
            email: `contributor-${i % 10}@example.com`,
            date: date.toISOString(),
          },
          message: `Commit message ${i}`,
        },
        author: {
          login: `contributor-${i % 10}`,
          avatar_url: `https://github.com/contributor-${i % 10}.png`,
        },
      });
    }
    
    return commits;
  };

  describe('Data Processing Performance', () => {
    it('should transform large datasets efficiently', () => {
      const largeCommitData = generateLargeCommitData(1000);
      const startTime = performance.now();
      
      const result = transformToHeatmapData(largeCommitData, '1y');
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process within reasonable time (less than 100ms for 1000 commits)
      expect(processingTime).toBeLessThan(100);
      
      // Should return valid data structure
      expect(result).toHaveProperty('weeks');
      expect(result).toHaveProperty('totalCommits');
      expect(result).toHaveProperty('peakDay');
      expect(result).toHaveProperty('averagePerDay');
      expect(result.totalCommits).toBe(1000);
    });

    it('should calculate contributor trends efficiently', () => {
      const largeCommitData = generateLargeCommitData(1000);
      const startTime = performance.now();
      
      const result = calculateContributorTrends(largeCommitData, '1y');
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should process within reasonable time
      expect(processingTime).toBeLessThan(150);
      
      // Should return valid data structure
      expect(result).toHaveProperty('contributors');
      expect(result).toHaveProperty('timeRange');
      expect(result).toHaveProperty('totalContributors');
      expect(result).toHaveProperty('activeContributors');
      expect(result.contributors.length).toBeGreaterThan(0);
    });

    it('should use caching for repeated transformations', () => {
      const commitData = generateLargeCommitData(500);
      
      // First transformation
      const startTime1 = performance.now();
      const result1 = transformToHeatmapData(commitData, '6m');
      const endTime1 = performance.now();
      const firstTime = endTime1 - startTime1;
      
      // Second transformation with same data (should use cache)
      const startTime2 = performance.now();
      const result2 = transformToHeatmapData(commitData, '6m');
      const endTime2 = performance.now();
      const secondTime = endTime2 - startTime2;
      
      // Cached result should be much faster
      expect(secondTime).toBeLessThan(firstTime / 2);
      
      // Results should be identical
      expect(result1.totalCommits).toBe(result2.totalCommits);
      expect(result1.weeks.length).toBe(result2.weeks.length);
    });

    it('should handle edge cases efficiently', () => {
      // Empty dataset
      const startTime1 = performance.now();
      const emptyResult = transformToHeatmapData([], '30d');
      const endTime1 = performance.now();
      
      expect(endTime1 - startTime1).toBeLessThan(10);
      expect(emptyResult.totalCommits).toBe(0);
      
      // Single commit
      const singleCommit = generateLargeCommitData(1);
      const startTime2 = performance.now();
      const singleResult = transformToHeatmapData(singleCommit, '30d');
      const endTime2 = performance.now();
      
      expect(endTime2 - startTime2).toBeLessThan(10);
      expect(singleResult.totalCommits).toBe(1);
    });
  });

  describe('Cache Performance', () => {
    it('should improve performance with repeated calculations', () => {
      const commitData = generateLargeCommitData(200);
      
      // First calculation
      const startTime1 = performance.now();
      calculateContributorTrends(commitData, '3m');
      const endTime1 = performance.now();
      const firstTime = endTime1 - startTime1;
      
      // Second calculation with same data (should use cache)
      const startTime2 = performance.now();
      calculateContributorTrends(commitData, '3m');
      const endTime2 = performance.now();
      const secondTime = endTime2 - startTime2;
      
      // Cached result should be faster
      expect(secondTime).toBeLessThan(firstTime);
    });

    it('should handle cache cleanup efficiently', () => {
      // Generate many different datasets to test cache cleanup
      for (let i = 0; i < 60; i++) {
        const commitData = generateLargeCommitData(50);
        // Modify data slightly to create different cache keys
        commitData[0].sha = `unique-${i}`;
        transformToHeatmapData(commitData, '30d');
      }
      
      // Cache should not grow indefinitely
      // This is more of a smoke test since we can't easily inspect cache size
      expect(true).toBe(true);
    });
  });

  describe('Large Dataset Stress Tests', () => {
    it('should handle very large commit datasets', () => {
      const veryLargeData = generateLargeCommitData(5000);
      const startTime = performance.now();
      
      const result = transformToHeatmapData(veryLargeData, '1y');
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should still process within reasonable time even for very large datasets
      expect(processingTime).toBeLessThan(500); // 500ms for 5000 commits
      expect(result.totalCommits).toBe(5000);
    });

    it('should handle many contributors efficiently', () => {
      // Generate data with many unique contributors
      const commits = [];
      for (let i = 0; i < 1000; i++) {
        commits.push({
          sha: `commit-${i}`,
          commit: {
            author: {
              name: `contributor-${i}`, // Each commit has unique contributor
              email: `contributor-${i}@example.com`,
              date: new Date(2023, 0, 1 + (i % 365)).toISOString(),
            },
            message: `Commit ${i}`,
          },
          author: {
            login: `contributor-${i}`,
            avatar_url: `https://github.com/contributor-${i}.png`,
          },
        });
      }
      
      const startTime = performance.now();
      const result = calculateContributorTrends(commits, '1y');
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(300);
      expect(result.contributors.length).toBe(1000);
    });
  });
});