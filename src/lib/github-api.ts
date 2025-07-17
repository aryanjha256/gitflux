/**
 * GitHub API integration module
 * Handles repository data fetching with proper error handling and rate limiting
 */

// GitHub API Response Types
export interface Repository {
    name: string;
    full_name: string;
    description: string | null;
    stargazers_count: number;
    forks_count: number;
    language: string | null;
    created_at: string;
    updated_at: string;
    private: boolean;
    html_url: string;
}

export interface Contributor {
    login: string;
    avatar_url: string;
    contributions: number;
    html_url: string;
    type: string;
}

export interface CommitActivity {
    week: number; // Unix timestamp
    total: number;
    days: number[]; // Array of 7 numbers (Sun-Sat)
}

export interface CommitData {
    date: string;
    count: number;
}

// File change data types
export interface FileChangeData {
    filename: string;
    changeCount: number;
    percentage: number;
    lastChanged: string;
    fileType: string;
    isDeleted: boolean;
    trendData: TrendPoint[];
}

export interface TrendPoint {
    date: string;
    changes: number;
}

export interface CommitFileData {
    sha: string;
    date: string;
    author: string;
    message: string;
    files: {
        filename: string;
        status: 'added' | 'modified' | 'removed';
        changes: number;
        additions: number;
        deletions: number;
    }[];
}

export interface FileChangeAnalysis {
    files: FileChangeData[];
    totalChanges: number;
    analysisDate: string;
    timePeriod: TimePeriod;
    fileTypeBreakdown: FileTypeData[];
}

export interface FileTypeData {
    extension: string;
    category: string;
    changeCount: number;
    percentage: number;
    color: string;
}

export type TimePeriod = '30d' | '90d' | '6m' | '1y' | 'all';

export interface FileChangeApiResponse extends GitHubApiResponse<FileChangeAnalysis> {
    processingTime?: number;
    dataPoints?: number;
    rateLimitWarning?: boolean;
}

// API Response wrapper
export interface GitHubApiResponse<T> {
    data?: T;
    error?: string;
    rateLimit?: {
        remaining: number;
        reset: number;
        limit: number;
    };
}

// Error types
export class GitHubApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public rateLimit?: GitHubApiResponse<unknown>['rateLimit']
    ) {
        super(message);
        this.name = 'GitHubApiError';
    }
}

// Rate limit information from response headers
interface RateLimitInfo {
    remaining: number;
    reset: number;
    limit: number;
}

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Extract rate limit information from GitHub API response headers
 */
function extractRateLimit(headers: Headers): RateLimitInfo {
    return {
        remaining: parseInt(headers.get('x-ratelimit-remaining') || '0'),
        reset: parseInt(headers.get('x-ratelimit-reset') || '0'),
        limit: parseInt(headers.get('x-ratelimit-limit') || '5000'),
    };
}

/**
 * Get GitHub API headers with optional authentication
 */
function getGitHubHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitFlux-Analyzer/1.0',
    };

    // Add authentication if token is available
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        // Log authentication status in development
        if (process.env.NODE_ENV === 'development') {
            console.log('GitHub API: Using authenticated requests (rate limit: 5,000/hour)');
        }
    } else {
        // Log unauthenticated status in development
        if (process.env.NODE_ENV === 'development') {
            console.log('GitHub API: Using unauthenticated requests (rate limit: 60/hour)');
        }
    }

    return headers;
}

/**
 * Make a request to the GitHub API with proper error handling
 */
async function makeGitHubRequest<T>(endpoint: string): Promise<GitHubApiResponse<T>> {
    try {
        const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
            headers: getGitHubHeaders(),
        });

        const rateLimit = extractRateLimit(response.headers);

        if (!response.ok) {
            if (response.status === 404) {
                return {
                    error: 'Repository not found',
                    rateLimit,
                };
            }

            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.message?.includes('rate limit')) {
                    return {
                        error: 'GitHub API rate limit exceeded. Please try again later.',
                        rateLimit,
                    };
                }
                return {
                    error: 'Access forbidden. Repository may be private or require authentication.',
                    rateLimit,
                };
            }

            if (response.status >= 500) {
                return {
                    error: 'GitHub API is currently unavailable. Please try again later.',
                    rateLimit,
                };
            }

            return {
                error: `GitHub API error: ${response.status} ${response.statusText}`,
                rateLimit,
            };
        }

        const data = await response.json();
        return {
            data,
            rateLimit,
        };
    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                error: 'Network error. Please check your internet connection and try again.',
            };
        }

        return {
            error: 'An unexpected error occurred while fetching data from GitHub.',
        };
    }
}

/**
 * Fetch repository information from GitHub API
 */
export async function fetchRepository(owner: string, repo: string): Promise<GitHubApiResponse<Repository>> {
    return makeGitHubRequest<Repository>(`/repos/${owner}/${repo}`);
}

/**
 * Fetch repository contributors from GitHub API
 */
export async function fetchContributors(owner: string, repo: string): Promise<GitHubApiResponse<Contributor[]>> {
    return makeGitHubRequest<Contributor[]>(`/repos/${owner}/${repo}/contributors`);
}

/**
 * Fetch commit activity statistics from GitHub API
 */
export async function fetchCommitActivity(owner: string, repo: string): Promise<GitHubApiResponse<CommitActivity[]>> {
    return makeGitHubRequest<CommitActivity[]>(`/repos/${owner}/${repo}/stats/commit_activity`);
}

/**
 * Transform commit activity data into chart-friendly format
 */
export function transformCommitActivity(activity: CommitActivity[]): CommitData[] {
    return activity.map(week => ({
        date: new Date(week.week * 1000).toISOString().split('T')[0],
        count: week.total,
    }));
}

/**
 * Validate GitHub repository URL and extract owner/repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/,
        /^github\.com\/([^\/]+)\/([^\/]+)\/?$/,
        /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
        const match = url.trim().match(pattern);
        if (match) {
            const [, owner, repo] = match;
            // Remove .git suffix if present
            const cleanRepo = repo.replace(/\.git$/, '');
            return { owner, repo: cleanRepo };
        }
    }

    return null;
}

/**
 * Check if rate limit is exceeded and calculate reset time
 */
export function isRateLimited(rateLimit?: RateLimitInfo): boolean {
    return rateLimit ? rateLimit.remaining <= 0 : false;
}

/**
 * Get human-readable time until rate limit reset
 */
export function getRateLimitResetTime(rateLimit?: RateLimitInfo): string {
    if (!rateLimit) return 'Unknown';

    const resetTime = new Date(rateLimit.reset * 1000);
    const now = new Date();
    const diffMinutes = Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60));

    if (diffMinutes <= 0) return 'Now';
    if (diffMinutes === 1) return '1 minute';
    if (diffMinutes < 60) return `${diffMinutes} minutes`;

    const hours = Math.ceil(diffMinutes / 60);
    return hours === 1 ? '1 hour' : `${hours} hours`;
}

/**
 * Fetch commits with file information from GitHub API
 */
export async function fetchCommitsWithFiles(
    owner: string,
    repo: string,
    since?: string,
    until?: string,
    page: number = 1,
    perPage: number = 100
): Promise<GitHubApiResponse<CommitFileData[]>> {
    let endpoint = `/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`;

    if (since) {
        endpoint += `&since=${since}`;
    }
    if (until) {
        endpoint += `&until=${until}`;
    }

    const response = await makeGitHubRequest<any[]>(endpoint);

    if (response.error || !response.data) {
        return response as GitHubApiResponse<CommitFileData[]>;
    }

    // Fetch detailed commit information with file changes
    const commitDetails: CommitFileData[] = [];

    for (const commit of response.data) {
        const detailResponse = await makeGitHubRequest<any>(`/repos/${owner}/${repo}/commits/${commit.sha}`);

        if (detailResponse.data && detailResponse.data.files) {
            commitDetails.push({
                sha: commit.sha,
                date: commit.commit.author.date,
                author: commit.commit.author.name,
                message: commit.commit.message,
                files: detailResponse.data.files.map((file: any) => ({
                    filename: file.filename,
                    status: file.status,
                    changes: file.changes || 0,
                    additions: file.additions || 0,
                    deletions: file.deletions || 0,
                })),
            });
        }

        // Check rate limit and break if getting close
        if (detailResponse.rateLimit && detailResponse.rateLimit.remaining < 10) {
            break;
        }
    }

    return {
        data: commitDetails,
        rateLimit: response.rateLimit,
    };
}

/**
 * Calculate time period boundaries
 */
export function getTimePeriodBounds(period: TimePeriod): { since?: string; until?: string } {
    const now = new Date();
    const bounds: { since?: string; until?: string } = {};

    switch (period) {
        case '30d':
            bounds.since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case '90d':
            bounds.since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case '6m':
            bounds.since = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case '1y':
            bounds.since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
            break;
        case 'all':
        default:
            // No bounds for 'all'
            break;
    }

    return bounds;
}

/**
 * Get file extension and categorize file type
 */
export function categorizeFileType(filename: string): { extension: string; category: string; color: string } {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const categories: Record<string, { category: string; color: string }> = {
        // Code files
        'js': { category: 'JavaScript', color: '#f7df1e' },
        'jsx': { category: 'JavaScript', color: '#f7df1e' },
        'ts': { category: 'TypeScript', color: '#3178c6' },
        'tsx': { category: 'TypeScript', color: '#3178c6' },
        'py': { category: 'Python', color: '#3776ab' },
        'java': { category: 'Java', color: '#ed8b00' },
        'cpp': { category: 'C++', color: '#00599c' },
        'c': { category: 'C', color: '#a8b9cc' },
        'cs': { category: 'C#', color: '#239120' },
        'php': { category: 'PHP', color: '#777bb4' },
        'rb': { category: 'Ruby', color: '#cc342d' },
        'go': { category: 'Go', color: '#00add8' },
        'rs': { category: 'Rust', color: '#dea584' },
        'swift': { category: 'Swift', color: '#fa7343' },
        'kt': { category: 'Kotlin', color: '#7f52ff' },

        // Web files
        'html': { category: 'HTML', color: '#e34f26' },
        'css': { category: 'CSS', color: '#1572b6' },
        'scss': { category: 'CSS', color: '#cf649a' },
        'sass': { category: 'CSS', color: '#cf649a' },
        'less': { category: 'CSS', color: '#1d365d' },

        // Config files
        'json': { category: 'Config', color: '#000000' },
        'xml': { category: 'Config', color: '#0060ac' },
        'yml': { category: 'Config', color: '#cb171e' },
        'yaml': { category: 'Config', color: '#cb171e' },
        'toml': { category: 'Config', color: '#9c4221' },
        'ini': { category: 'Config', color: '#6d6d6d' },

        // Documentation
        'md': { category: 'Documentation', color: '#083fa1' },
        'txt': { category: 'Documentation', color: '#6d6d6d' },
        'rst': { category: 'Documentation', color: '#6d6d6d' },

        // Images
        'png': { category: 'Images', color: '#ff6b6b' },
        'jpg': { category: 'Images', color: '#ff6b6b' },
        'jpeg': { category: 'Images', color: '#ff6b6b' },
        'gif': { category: 'Images', color: '#ff6b6b' },
        'svg': { category: 'Images', color: '#ff6b6b' },
        'webp': { category: 'Images', color: '#ff6b6b' },
    };

    const fileType = categories[ext] || { category: 'Other', color: '#6d6d6d' };

    return {
        extension: ext,
        category: fileType.category,
        color: fileType.color,
    };
}

/**
 * Filter commits by time period
 */
export function filterCommitsByTimePeriod(commits: CommitFileData[], timePeriod: TimePeriod): CommitFileData[] {
    if (timePeriod === 'all') {
        return commits;
    }

    const bounds = getTimePeriodBounds(timePeriod);
    if (!bounds.since) {
        return commits;
    }

    const sinceDate = new Date(bounds.since);
    return commits.filter(commit => new Date(commit.date) >= sinceDate);
}

/**
 * Calculate file change frequencies and percentages
 */
export function calculateFileChangeFrequencies(commits: CommitFileData[]): Map<string, {
    count: number;
    lastChanged: string;
    isDeleted: boolean;
    changes: { date: string; count: number }[];
}> {
    const fileChanges = new Map<string, {
        count: number;
        lastChanged: string;
        isDeleted: boolean;
        changes: { date: string; count: number }[];
    }>();

    commits.forEach(commit => {
        commit.files.forEach(file => {
            const existing = fileChanges.get(file.filename) || {
                count: 0,
                lastChanged: commit.date,
                isDeleted: file.status === 'removed',
                changes: [],
            };

            existing.count += 1;
            existing.lastChanged = commit.date > existing.lastChanged ? commit.date : existing.lastChanged;
            existing.isDeleted = file.status === 'removed';

            // Add to trend data
            const dateKey = commit.date.split('T')[0];
            const existingChange = existing.changes.find(c => c.date === dateKey);
            if (existingChange) {
                existingChange.count += 1;
            } else {
                existing.changes.push({ date: dateKey, count: 1 });
            }

            fileChanges.set(file.filename, existing);
        });
    });

    return fileChanges;
}

/**
 * Generate trend data for individual files with different granularities
 */
export function generateFileTrendData(
    changes: { date: string; count: number }[],
    timePeriod: TimePeriod
): TrendPoint[] {
    if (changes.length === 0) {
        return [];
    }

    // Sort changes by date
    const sortedChanges = changes.sort((a, b) => a.date.localeCompare(b.date));

    // For shorter periods, use daily granularity
    if (timePeriod === '30d' || timePeriod === '90d') {
        return sortedChanges.map(change => ({
            date: change.date,
            changes: change.count,
        }));
    }

    // For longer periods, aggregate by week
    const weeklyData = new Map<string, number>();

    sortedChanges.forEach(change => {
        const date = new Date(change.date);
        // Get the start of the week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + change.count);
    });

    return Array.from(weeklyData.entries())
        .map(([date, count]) => ({ date, changes: count }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Create file type breakdown with enhanced categorization
 */
export function createFileTypeBreakdown(files: FileChangeData[]): FileTypeData[] {
    const typeBreakdown = new Map<string, { count: number; color: string }>();
    let totalChanges = 0;

    files.forEach(file => {
        const fileType = categorizeFileType(file.filename);
        const existing = typeBreakdown.get(fileType.category) || { count: 0, color: fileType.color };
        existing.count += file.changeCount;
        typeBreakdown.set(fileType.category, existing);
        totalChanges += file.changeCount;
    });

    return Array.from(typeBreakdown.entries())
        .map(([category, data]) => ({
            extension: category,
            category,
            changeCount: data.count,
            percentage: totalChanges > 0 ? (data.count / totalChanges) * 100 : 0,
            color: data.color,
        }))
        .sort((a, b) => b.changeCount - a.changeCount);
}

/**
 * Analyze file change patterns and identify hotspots
 */
export function analyzeFileChangePatterns(files: FileChangeData[]): {
    hotspots: FileChangeData[];
    recentlyActive: FileChangeData[];
    staleFiles: FileChangeData[];
    deletedFiles: FileChangeData[];
} {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Calculate average change count for hotspot detection
    const averageChanges = files.reduce((sum, file) => sum + file.changeCount, 0) / files.length;
    const hotspotThreshold = Math.max(averageChanges * 1.5, 5); // At least 1.5x average or 5 changes

    return {
        hotspots: files.filter(file => file.changeCount >= hotspotThreshold && !file.isDeleted),
        recentlyActive: files.filter(file => {
            const lastChanged = new Date(file.lastChanged);
            return lastChanged >= thirtyDaysAgo && !file.isDeleted;
        }),
        staleFiles: files.filter(file => {
            const lastChanged = new Date(file.lastChanged);
            return lastChanged < ninetyDaysAgo && !file.isDeleted;
        }),
        deletedFiles: files.filter(file => file.isDeleted),
    };
}

/**
 * Process commit file data to generate file change analysis
 */
export function processFileChangeData(
    commits: CommitFileData[],
    timePeriod: TimePeriod
): FileChangeAnalysis {
    const fileChanges = new Map<string, {
        count: number;
        lastChanged: string;
        isDeleted: boolean;
        changes: { date: string; count: number }[];
    }>();

    let totalChanges = 0;

    // Process each commit
    commits.forEach(commit => {
        commit.files.forEach(file => {
            const existing = fileChanges.get(file.filename) || {
                count: 0,
                lastChanged: commit.date,
                isDeleted: file.status === 'removed',
                changes: [],
            };

            existing.count += 1;
            existing.lastChanged = commit.date > existing.lastChanged ? commit.date : existing.lastChanged;
            existing.isDeleted = file.status === 'removed';

            // Add to trend data
            const dateKey = commit.date.split('T')[0];
            const existingChange = existing.changes.find(c => c.date === dateKey);
            if (existingChange) {
                existingChange.count += 1;
            } else {
                existing.changes.push({ date: dateKey, count: 1 });
            }

            fileChanges.set(file.filename, existing);
            totalChanges += 1;
        });
    });

    // Convert to FileChangeData array
    const files: FileChangeData[] = Array.from(fileChanges.entries())
        .map(([filename, data]) => {
            const fileType = categorizeFileType(filename);
            return {
                filename,
                changeCount: data.count,
                percentage: totalChanges > 0 ? (data.count / totalChanges) * 100 : 0,
                lastChanged: data.lastChanged,
                fileType: fileType.category,
                isDeleted: data.isDeleted,
                trendData: data.changes.sort((a, b) => a.date.localeCompare(b.date)).map(change => ({
                    date: change.date,
                    changes: change.count,
                })),
            };
        })
        .sort((a, b) => b.changeCount - a.changeCount);

    // Generate file type breakdown
    const typeBreakdown = new Map<string, { count: number; color: string }>();
    files.forEach(file => {
        const fileType = categorizeFileType(file.filename);
        const existing = typeBreakdown.get(fileType.category) || { count: 0, color: fileType.color };
        existing.count += file.changeCount;
        typeBreakdown.set(fileType.category, existing);
    });

    const fileTypeBreakdown: FileTypeData[] = Array.from(typeBreakdown.entries())
        .map(([category, data]) => ({
            extension: category,
            category,
            changeCount: data.count,
            percentage: totalChanges > 0 ? (data.count / totalChanges) * 100 : 0,
            color: data.color,
        }))
        .sort((a, b) => b.changeCount - a.changeCount);

    return {
        files,
        totalChanges,
        analysisDate: new Date().toISOString(),
        timePeriod,
        fileTypeBreakdown,
    };
}