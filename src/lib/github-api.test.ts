import {
  categorizeFileType,
  getTimePeriodBounds,
  filterCommitsByTimePeriod,
  calculateFileChangeFrequencies,
  generateFileTrendData,
  createFileTypeBreakdown,
  analyzeFileChangePatterns,
  processFileChangeData,
  parseGitHubUrl,
  isRateLimited,
  getRateLimitResetTime,
} from './github-api';
import type { CommitFileData, FileChangeData, TimePeriod } from './github-api';

describe('GitHub API Utilities', () => {
  describe('categorizeFileType', () => {
    it('categorizes JavaScript files correctly', () => {
      expect(categorizeFileType('script.js')).toEqual({
        extension: 'js',
        category: 'JavaScript',
        color: '#f7df1e',
      });
      
      expect(categorizeFileType('component.jsx')).toEqual({
        extension: 'jsx',
        category: 'JavaScript',
        color: '#f7df1e',
      });
    });

    it('categorizes TypeScript files correctly', () => {
      expect(categorizeFileType('app.ts')).toEqual({
        extension: 'ts',
        category: 'TypeScript',
        color: '#3178c6',
      });
      
      expect(categorizeFileType('component.tsx')).toEqual({
        extension: 'tsx',
        category: 'TypeScript',
        color: '#3178c6',
      });
    });

    it('categorizes config files correctly', () => {
      expect(categorizeFileType('package.json')).toEqual({
        extension: 'json',
        category: 'Config',
        color: '#000000',
      });
      
      expect(categorizeFileType('config.yml')).toEqual({
        extension: 'yml',
        category: 'Config',
        color: '#cb171e',
      });
    });

    it('handles unknown file types', () => {
      expect(categorizeFileType('unknown.xyz')).toEqual({
        extension: 'xyz',
        category: 'Other',
        color: '#6d6d6d',
      });
    });

    it('handles files without extensions', () => {
      expect(categorizeFileType('Dockerfile')).toEqual({
        extension: '',
        category: 'Other',
        color: '#6d6d6d',
      });
    });
  });

  describe('getTimePeriodBounds', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates 30 day bounds correctly', () => {
      const bounds = getTimePeriodBounds('30d');
      expect(bounds.since).toBe('2023-12-16T12:00:00.000Z');
      expect(bounds.until).toBeUndefined();
    });

    it('calculates 90 day bounds correctly', () => {
      const bounds = getTimePeriodBounds('90d');
      expect(bounds.since).toBe('2023-10-17T12:00:00.000Z');
    });

    it('calculates 6 month bounds correctly', () => {
      const bounds = getTimePeriodBounds('6m');
      expect(bounds.since).toBe('2023-07-18T12:00:00.000Z');
    });

    it('calculates 1 year bounds correctly', () => {
      const bounds = getTimePeriodBounds('1y');
      expect(bounds.since).toBe('2023-01-15T12:00:00.000Z');
    });

    it('returns no bounds for all time', () => {
      const bounds = getTimePeriodBounds('all');
      expect(bounds.since).toBeUndefined();
      expect(bounds.until).toBeUndefined();
    });
  });

  describe('filterCommitsByTimePeriod', () => {
    const mockCommits: CommitFileData[] = [
      {
        sha: 'abc123',
        date: '2024-01-10T10:00:00Z',
        author: 'John',
        message: 'Recent commit',
        files: [],
      },
      {
        sha: 'def456',
        date: '2023-06-01T10:00:00Z',
        author: 'Jane',
        message: 'Old commit',
        files: [],
      },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('filters commits by 30 day period', () => {
      const filtered = filterCommitsByTimePeriod(mockCommits, '30d');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].sha).toBe('abc123');
    });

    it('returns all commits for all time period', () => {
      const filtered = filterCommitsByTimePeriod(mockCommits, 'all');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('calculateFileChangeFrequencies', () => {
    const mockCommits: CommitFileData[] = [
      {
        sha: 'abc123',
        date: '2024-01-10T10:00:00Z',
        author: 'John',
        message: 'Update file',
        files: [
          {
            filename: 'src/app.js',
            status: 'modified',
            changes: 10,
            additions: 8,
            deletions: 2,
          },
        ],
      },
      {
        sha: 'def456',
        date: '2024-01-11T10:00:00Z',
        author: 'Jane',
        message: 'Update same file',
        files: [
          {
            filename: 'src/app.js',
            status: 'modified',
            changes: 5,
            additions: 3,
            deletions: 2,
          },
        ],
      },
    ];

    it('calculates file change frequencies correctly', () => {
      const frequencies = calculateFileChangeFrequencies(mockCommits);
      const appJsData = frequencies.get('src/app.js');
      
      expect(appJsData).toBeDefined();
      expect(appJsData!.count).toBe(2);
      expect(appJsData!.lastChanged).toBe('2024-01-11T10:00:00Z');
      expect(appJsData!.isDeleted).toBe(false);
      expect(appJsData!.changes).toHaveLength(2);
    });

    it('handles deleted files correctly', () => {
      const commitsWithDeletion: CommitFileData[] = [
        {
          sha: 'abc123',
          date: '2024-01-10T10:00:00Z',
          author: 'John',
          message: 'Delete file',
          files: [
            {
              filename: 'old-file.js',
              status: 'removed',
              changes: 0,
              additions: 0,
              deletions: 50,
            },
          ],
        },
      ];

      const frequencies = calculateFileChangeFrequencies(commitsWithDeletion);
      const deletedFileData = frequencies.get('old-file.js');
      
      expect(deletedFileData!.isDeleted).toBe(true);
    });
  });

  describe('generateFileTrendData', () => {
    const mockChanges = [
      { date: '2024-01-01', count: 5 },
      { date: '2024-01-02', count: 3 },
      { date: '2024-01-03', count: 8 },
    ];

    it('generates daily trend data for short periods', () => {
      const trendData = generateFileTrendData(mockChanges, '30d');
      expect(trendData).toHaveLength(3);
      expect(trendData[0]).toEqual({ date: '2024-01-01', changes: 5 });
    });

    it('aggregates weekly data for longer periods', () => {
      const trendData = generateFileTrendData(mockChanges, '1y');
      expect(trendData.length).toBeGreaterThan(0);
      expect(trendData[0]).toHaveProperty('changes');
    });

    it('handles empty changes array', () => {
      const trendData = generateFileTrendData([], '30d');
      expect(trendData).toHaveLength(0);
    });
  });

  describe('parseGitHubUrl', () => {
    it('parses full GitHub URLs', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses GitHub URLs without protocol', () => {
      const result = parseGitHubUrl('github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('parses owner/repo format', () => {
      const result = parseGitHubUrl('owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('removes .git suffix', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo.git');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('returns null for invalid URLs', () => {
      expect(parseGitHubUrl('invalid-url')).toBeNull();
      expect(parseGitHubUrl('https://example.com/owner/repo')).toBeNull();
    });
  });

  describe('isRateLimited', () => {
    it('returns true when rate limit is exceeded', () => {
      expect(isRateLimited({ remaining: 0, reset: 123456, limit: 5000 })).toBe(true);
    });

    it('returns false when rate limit is not exceeded', () => {
      expect(isRateLimited({ remaining: 100, reset: 123456, limit: 5000 })).toBe(false);
    });

    it('returns false when rate limit info is undefined', () => {
      expect(isRateLimited(undefined)).toBe(false);
    });
  });

  describe('getRateLimitResetTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns time until reset', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const result = getRateLimitResetTime({ remaining: 0, reset: resetTime, limit: 5000 });
      expect(result).toBe('1 hour');
    });

    it('returns minutes for short durations', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
      const result = getRateLimitResetTime({ remaining: 0, reset: resetTime, limit: 5000 });
      expect(result).toBe('5 minutes');
    });

    it('returns "Now" for past reset times', () => {
      const resetTime = Math.floor(Date.now() / 1000) - 100; // Past time
      const result = getRateLimitResetTime({ remaining: 0, reset: resetTime, limit: 5000 });
      expect(result).toBe('Now');
    });

    it('returns "Unknown" for undefined rate limit', () => {
      expect(getRateLimitResetTime(undefined)).toBe('Unknown');
    });
  });

  describe('processFileChangeData', () => {
    const mockCommits: CommitFileData[] = [
      {
        sha: 'abc123',
        date: '2024-01-10T10:00:00Z',
        author: 'John',
        message: 'Update files',
        files: [
          {
            filename: 'src/app.js',
            status: 'modified',
            changes: 10,
            additions: 8,
            deletions: 2,
          },
          {
            filename: 'README.md',
            status: 'modified',
            changes: 5,
            additions: 3,
            deletions: 2,
          },
        ],
      },
    ];

    it('processes commit data correctly', () => {
      const analysis = processFileChangeData(mockCommits, '30d');
      
      expect(analysis.files).toHaveLength(2);
      expect(analysis.totalChanges).toBe(2);
      expect(analysis.timePeriod).toBe('30d');
      expect(analysis.fileTypeBreakdown).toHaveLength(2);
      
      // Check file sorting (by change count)
      expect(analysis.files[0].filename).toBe('src/app.js');
      expect(analysis.files[0].changeCount).toBe(1);
      expect(analysis.files[0].percentage).toBe(50);
    });

    it('handles empty commits array', () => {
      const analysis = processFileChangeData([], '30d');
      
      expect(analysis.files).toHaveLength(0);
      expect(analysis.totalChanges).toBe(0);
      expect(analysis.fileTypeBreakdown).toHaveLength(0);
    });
  });

  describe('analyzeFileChangePatterns', () => {
    const mockFiles: FileChangeData[] = [
      {
        filename: 'hotspot.js',
        changeCount: 50,
        percentage: 50,
        lastChanged: '2024-01-14T10:00:00Z',
        fileType: 'JavaScript',
        isDeleted: false,
        trendData: [],
      },
      {
        filename: 'recent.js',
        changeCount: 5,
        percentage: 5,
        lastChanged: '2024-01-14T10:00:00Z',
        fileType: 'JavaScript',
        isDeleted: false,
        trendData: [],
      },
      {
        filename: 'stale.js',
        changeCount: 3,
        percentage: 3,
        lastChanged: '2023-10-01T10:00:00Z',
        fileType: 'JavaScript',
        isDeleted: false,
        trendData: [],
      },
      {
        filename: 'deleted.js',
        changeCount: 10,
        percentage: 10,
        lastChanged: '2024-01-01T10:00:00Z',
        fileType: 'JavaScript',
        isDeleted: true,
        trendData: [],
      },
    ];

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('identifies hotspots correctly', () => {
      const patterns = analyzeFileChangePatterns(mockFiles);
      expect(patterns.hotspots).toHaveLength(1);
      expect(patterns.hotspots[0].filename).toBe('hotspot.js');
    });

    it('identifies recently active files', () => {
      const patterns = analyzeFileChangePatterns(mockFiles);
      expect(patterns.recentlyActive).toHaveLength(2);
      expect(patterns.recentlyActive.map(f => f.filename)).toContain('recent.js');
    });

    it('identifies stale files', () => {
      const patterns = analyzeFileChangePatterns(mockFiles);
      expect(patterns.staleFiles).toHaveLength(1);
      expect(patterns.staleFiles[0].filename).toBe('stale.js');
    });

    it('identifies deleted files', () => {
      const patterns = analyzeFileChangePatterns(mockFiles);
      expect(patterns.deletedFiles).toHaveLength(1);
      expect(patterns.deletedFiles[0].filename).toBe('deleted.js');
    });
  });
});