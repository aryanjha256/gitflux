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

// Branch and PR data types
export interface BranchData {
    name: string;
    lastCommitDate: string;
    commitCount: number;
    status: 'active' | 'merged' | 'stale';
    isDefault: boolean;
    ahead: number;
    behind: number;
    author: string;
    lastCommitSha: string;
    lastCommitMessage: string;
}

export interface PRData {
    number: number;
    title: string;
    state: 'open' | 'closed' | 'merged';
    createdAt: string;
    mergedAt?: string;
    closedAt?: string;
    author: string;
    reviewCount: number;
    timeToMerge?: number;
    linesChanged: number;
    additions: number;
    deletions: number;
    reviewers: string[];
    labels: string[];
    isDraft: boolean;
}

export interface ReviewData {
    prNumber: number;
    reviewers: string[];
    reviewCount: number;
    approvalCount: number;
    changeRequestCount: number;
    commentCount: number;
    timeToFirstReview?: number;
    timeToApproval?: number;
    reviews: {
        reviewer: string;
        state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';
        submittedAt: string;
    }[];
}

export interface BranchAnalytics {
    totalBranches: number;
    activeBranches: number;
    mergedBranches: number;
    staleBranches: number;
    branches: BranchData[];
    branchActivity: BranchActivityData[];
}

export interface BranchActivityData {
    date: string;
    branchesCreated: number;
    branchesMerged: number;
    branchesDeleted: number;
}

export interface PRAnalyticsData {
    totalPRs: number;
    openPRs: number;
    closedPRs: number;
    mergedPRs: number;
    averageTimeToMerge: number;
    averageReviewTime: number;
    averagePRSize: number;
    pullRequests: PRData[];
    timeline: PRTimelineData[];
    topContributors: ContributorStats[];
}

export interface PRTimelineData {
    date: string;
    opened: number;
    merged: number;
    closed: number;
}

export interface ContributorStats {
    username: string;
    prCount: number;
    reviewCount: number;
    linesChanged: number;
    averageTimeToMerge: number;
}

export interface ReviewAnalyticsData {
    totalReviews: number;
    averageReviewsPerPR: number;
    averageTimeToFirstReview: number;
    averageTimeToApproval: number;
    topReviewers: ReviewerStats[];
    reviewPatterns: ReviewPatternData[];
}

export interface ReviewerStats {
    username: string;
    reviewCount: number;
    approvalRate: number;
    averageResponseTime: number;
    changeRequestRate: number;
}

export interface ReviewPatternData {
    date: string;
    reviewsGiven: number;
    approvalsGiven: number;
    changeRequestsGiven: number;
}

export interface BranchPRAnalysis {
    branches: BranchAnalytics;
    pullRequests: PRAnalyticsData;
    reviews: ReviewAnalyticsData;
    analysisDate: string;
    timePeriod: TimePeriod;
}

export interface BranchPRApiResponse extends GitHubApiResponse<BranchPRAnalysis> {
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
 * Make a request to the GitHub API with proper error handling and retry mechanism
 */
async function makeGitHubRequest<T>(
    endpoint: string, 
    options: { 
        retries?: number; 
        retryDelay?: number;
        signal?: AbortSignal;
    } = {}
): Promise<GitHubApiResponse<T>> {
    const { retries = 3, retryDelay = 1000, signal } = options;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // Check if request was cancelled
            if (signal?.aborted) {
                return { error: 'Request was cancelled' };
            }

            const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
                headers: getGitHubHeaders(),
                signal,
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

                if (response.status >= 500 && attempt < retries) {
                    // Retry on server errors with exponential backoff
                    const delay = retryDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
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
            // Check if it's an abort error
            if (error instanceof Error && error.name === 'AbortError') {
                return { error: 'Request was cancelled' };
            }

            // Retry on network errors
            if (error instanceof TypeError && error.message.includes('fetch') && attempt < retries) {
                const delay = retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (error instanceof TypeError && error.message.includes('fetch')) {
                return {
                    error: 'Network error. Please check your internet connection and try again.',
                };
            }

            if (attempt === retries) {
                return {
                    error: 'An unexpected error occurred while fetching data from GitHub.',
                };
            }

            // Wait before retrying
            const delay = retryDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    return {
        error: 'Maximum retry attempts exceeded.',
    };
}

/**
 * Fetch repository information from GitHub API
 */
export async function fetchRepository(
    owner: string, 
    repo: string,
    options?: { signal?: AbortSignal }
): Promise<GitHubApiResponse<Repository>> {
    return makeGitHubRequest<Repository>(`/repos/${owner}/${repo}`, options);
}

/**
 * Fetch repository contributors from GitHub API
 */
export async function fetchContributors(
    owner: string, 
    repo: string,
    options?: { signal?: AbortSignal }
): Promise<GitHubApiResponse<Contributor[]>> {
    return makeGitHubRequest<Contributor[]>(`/repos/${owner}/${repo}/contributors`, options);
}

/**
 * Fetch commit activity statistics from GitHub API
 */
export async function fetchCommitActivity(
    owner: string, 
    repo: string,
    options?: { signal?: AbortSignal }
): Promise<GitHubApiResponse<CommitActivity[]>> {
    return makeGitHubRequest<CommitActivity[]>(`/repos/${owner}/${repo}/stats/commit_activity`, options);
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
 * Fetch commits with file information from GitHub API with performance optimizations
 */
export async function fetchCommitsWithFiles(
    owner: string,
    repo: string,
    since?: string,
    until?: string,
    page: number = 1,
    perPage: number = 100,
    options: {
        maxCommits?: number;
        rateLimitThreshold?: number;
        batchDelay?: number;
        onProgress?: (processed: number, total: number) => void;
        signal?: AbortSignal;
    } = {}
): Promise<GitHubApiResponse<CommitFileData[]>> {
    const {
        maxCommits = 1000,
        rateLimitThreshold = 50,
        batchDelay = 100,
        onProgress,
        signal
    } = options;

    let endpoint = `/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`;

    if (since) {
        endpoint += `&since=${since}`;
    }
    if (until) {
        endpoint += `&until=${until}`;
    }

    // Check if request was cancelled
    if (signal?.aborted) {
        return { error: 'Request was cancelled' };
    }

    const response = await makeGitHubRequest<any[]>(endpoint);

    if (response.error || !response.data) {
        return response as GitHubApiResponse<CommitFileData[]>;
    }

    // Limit commits to prevent excessive API usage
    const commitsToProcess = response.data.slice(0, Math.min(response.data.length, maxCommits));
    const commitDetails: CommitFileData[] = [];
    let rateLimitWarning = false;

    for (let i = 0; i < commitsToProcess.length; i++) {
        // Check if request was cancelled
        if (signal?.aborted) {
            return { error: 'Request was cancelled' };
        }

        const commit = commitsToProcess[i];

        try {
            const detailResponse = await makeGitHubRequest<any>(`/repos/${owner}/${repo}/commits/${commit.sha}`);

            if (detailResponse.error) {
                // Log error but continue processing other commits
                console.warn(`Failed to fetch details for commit ${commit.sha}:`, detailResponse.error);
                continue;
            }

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

            // Report progress
            if (onProgress) {
                onProgress(i + 1, commitsToProcess.length);
            }

            // Check rate limit and break if getting close
            if (detailResponse.rateLimit && detailResponse.rateLimit.remaining < rateLimitThreshold) {
                rateLimitWarning = true;
                break;
            }

            // Add delay between requests to be respectful
            if (i < commitsToProcess.length - 1 && batchDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, batchDelay));
            }

        } catch (error) {
            console.warn(`Error processing commit ${commit.sha}:`, error);
            continue;
        }
    }

    return {
        data: commitDetails,
        rateLimit: response.rateLimit,
        ...(rateLimitWarning && { rateLimitWarning }),
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

/**
 * Fetch repository branches from GitHub API
 */
export async function fetchBranches(
    owner: string,
    repo: string,
    page: number = 1,
    perPage: number = 100
): Promise<GitHubApiResponse<any[]>> {
    const endpoint = `/repos/${owner}/${repo}/branches?page=${page}&per_page=${perPage}`;
    return makeGitHubRequest<any[]>(endpoint);
}

/**
 * Fetch pull requests from GitHub API
 */
export async function fetchPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'all',
    page: number = 1,
    perPage: number = 100
): Promise<GitHubApiResponse<any[]>> {
    const endpoint = `/repos/${owner}/${repo}/pulls?state=${state}&page=${page}&per_page=${perPage}&sort=updated&direction=desc`;
    return makeGitHubRequest<any[]>(endpoint);
}

/**
 * Fetch pull request reviews from GitHub API
 */
export async function fetchPRReviews(
    owner: string,
    repo: string,
    prNumber: number
): Promise<GitHubApiResponse<any[]>> {
    const endpoint = `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
    return makeGitHubRequest<any[]>(endpoint);
}

/**
 * Fetch branch comparison data from GitHub API
 */
export async function fetchBranchComparison(
    owner: string,
    repo: string,
    baseBranch: string,
    headBranch: string
): Promise<GitHubApiResponse<any>> {
    const endpoint = `/repos/${owner}/${repo}/compare/${baseBranch}...${headBranch}`;
    return makeGitHubRequest<any>(endpoint);
}

// Commit activity specific types
export interface CommitActivityResponse {
    commits: GitHubCommit[];
    contributors: GitHubContributor[];
    dateRange: { start: string; end: string };
}

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

export interface GitHubContributor {
    login: string;
    avatar_url: string;
    contributions: number;
    html_url: string;
    type: string;
}

// Cache interface for commit activity data
interface CommitActivityCache {
    [key: string]: {
        data: CommitActivityResponse;
        timestamp: number;
        expiresAt: number;
    };
}

// In-memory cache for commit activity data
const commitActivityCache: CommitActivityCache = {};
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Generate cache key for commit activity data
 */
function generateCacheKey(owner: string, repo: string, timeRange: string, since?: string, until?: string): string {
    return `${owner}/${repo}:${timeRange}:${since || 'all'}:${until || 'now'}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cacheEntry: CommitActivityCache[string]): boolean {
    return Date.now() < cacheEntry.expiresAt;
}

/**
 * Fetch commits with contributor information for specified time ranges
 * Includes caching mechanism and enhanced error handling for commit activity endpoints
 */
export async function fetchCommitActivityData(
    owner: string,
    repo: string,
    timeRange: '30d' | '3m' | '6m' | '1y' = '30d',
    options: {
        maxCommits?: number;
        rateLimitThreshold?: number;
        batchDelay?: number;
        onProgress?: (processed: number, total: number) => void;
        signal?: AbortSignal;
        useCache?: boolean;
    } = {}
): Promise<GitHubApiResponse<CommitActivityResponse>> {
    const {
        maxCommits = 1000,
        rateLimitThreshold = 50,
        batchDelay = 100,
        onProgress,
        signal,
        useCache = true
    } = options;

    // Calculate time bounds
    const bounds = getTimePeriodBounds(timeRange);
    const cacheKey = generateCacheKey(owner, repo, timeRange, bounds.since, bounds.until);

    // Check cache first
    if (useCache && commitActivityCache[cacheKey] && isCacheValid(commitActivityCache[cacheKey])) {
        return {
            data: commitActivityCache[cacheKey].data,
            rateLimit: undefined // Cache hit doesn't consume rate limit
        };
    }

    // Check if request was cancelled
    if (signal?.aborted) {
        return { error: 'Request was cancelled' };
    }

    try {
        // Fetch commits with pagination
        const commits: GitHubCommit[] = [];
        let page = 1;
        const perPage = 100;
        let hasMorePages = true;
        let rateLimitWarning = false;

        while (hasMorePages && commits.length < maxCommits) {
            if (signal?.aborted) {
                return { error: 'Request was cancelled' };
            }

            let endpoint = `/repos/${owner}/${repo}/commits?page=${page}&per_page=${perPage}`;
            if (bounds.since) endpoint += `&since=${bounds.since}`;
            if (bounds.until) endpoint += `&until=${bounds.until}`;

            const response = await makeGitHubRequest<GitHubCommit[]>(endpoint);

            if (response.error) {
                return response as GitHubApiResponse<CommitActivityResponse>;
            }

            if (!response.data || response.data.length === 0) {
                hasMorePages = false;
                break;
            }

            commits.push(...response.data);

            // Check rate limit
            if (response.rateLimit && response.rateLimit.remaining < rateLimitThreshold) {
                rateLimitWarning = true;
                break;
            }

            // Report progress
            if (onProgress) {
                onProgress(commits.length, Math.min(maxCommits, commits.length + response.data.length));
            }

            // Check if we got fewer results than requested (last page)
            if (response.data.length < perPage) {
                hasMorePages = false;
            }

            page++;

            // Add delay between requests
            if (hasMorePages && batchDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, batchDelay));
            }
        }

        // Limit commits to maxCommits
        const limitedCommits = commits.slice(0, maxCommits);

        // Fetch contributors separately for better performance
        const contributorsResponse = await fetchContributors(owner, repo);
        const contributors = contributorsResponse.data || [];

        const activityData: CommitActivityResponse = {
            commits: limitedCommits,
            contributors,
            dateRange: {
                start: bounds.since || limitedCommits[limitedCommits.length - 1]?.commit.author.date || new Date().toISOString(),
                end: bounds.until || limitedCommits[0]?.commit.author.date || new Date().toISOString()
            }
        };

        // Cache the result
        if (useCache) {
            commitActivityCache[cacheKey] = {
                data: activityData,
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
            };
        }

        return {
            data: activityData,
            rateLimit: contributorsResponse.rateLimit,
            ...(rateLimitWarning && { rateLimitWarning })
        };

    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                error: 'Network error while fetching commit activity data. Please check your internet connection and try again.',
            };
        }

        return {
            error: 'An unexpected error occurred while fetching commit activity data from GitHub.',
        };
    }
}

/**
 * Fetch commits for a specific contributor within a time range
 * Optimized for contributor trend analysis
 */
export async function fetchContributorCommits(
    owner: string,
    repo: string,
    contributor: string,
    timeRange: '30d' | '3m' | '6m' | '1y' = '30d',
    options: {
        maxCommits?: number;
        signal?: AbortSignal;
        useCache?: boolean;
    } = {}
): Promise<GitHubApiResponse<GitHubCommit[]>> {
    const { maxCommits = 500, signal, useCache = true } = options;

    const bounds = getTimePeriodBounds(timeRange);
    const cacheKey = generateCacheKey(owner, repo, `contributor-${contributor}`, bounds.since, bounds.until);

    // Check cache first
    if (useCache && commitActivityCache[cacheKey] && isCacheValid(commitActivityCache[cacheKey])) {
        return {
            data: commitActivityCache[cacheKey].data.commits,
        };
    }

    if (signal?.aborted) {
        return { error: 'Request was cancelled' };
    }

    try {
        let endpoint = `/repos/${owner}/${repo}/commits?author=${contributor}&per_page=100`;
        if (bounds.since) endpoint += `&since=${bounds.since}`;
        if (bounds.until) endpoint += `&until=${bounds.until}`;

        const response = await makeGitHubRequest<GitHubCommit[]>(endpoint);

        if (response.error || !response.data) {
            return response as GitHubApiResponse<GitHubCommit[]>;
        }

        const limitedCommits = response.data.slice(0, maxCommits);

        // Cache the result
        if (useCache) {
            commitActivityCache[cacheKey] = {
                data: {
                    commits: limitedCommits,
                    contributors: [],
                    dateRange: {
                        start: bounds.since || new Date().toISOString(),
                        end: bounds.until || new Date().toISOString()
                    }
                },
                timestamp: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
            };
        }

        return {
            data: limitedCommits,
            rateLimit: response.rateLimit
        };

    } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return {
                error: 'Network error while fetching contributor commits. Please check your internet connection and try again.',
            };
        }

        return {
            error: 'An unexpected error occurred while fetching contributor commits from GitHub.',
        };
    }
}

/**
 * Clear commit activity cache (useful for testing or manual cache invalidation)
 */
export function clearCommitActivityCache(owner?: string, repo?: string): void {
    if (owner && repo) {
        // Clear cache for specific repository
        const prefix = `${owner}/${repo}:`;
        Object.keys(commitActivityCache).forEach(key => {
            if (key.startsWith(prefix)) {
                delete commitActivityCache[key];
            }
        });
    } else {
        // Clear entire cache
        Object.keys(commitActivityCache).forEach(key => {
            delete commitActivityCache[key];
        });
    }
}

/**
 * Get cache statistics for monitoring and debugging
 */
export function getCommitActivityCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    cacheHitRate?: number;
} {
    const totalEntries = Object.keys(commitActivityCache).length;
    let validEntries = 0;
    let expiredEntries = 0;

    Object.values(commitActivityCache).forEach(entry => {
        if (isCacheValid(entry)) {
            validEntries++;
        } else {
            expiredEntries++;
        }
    });

    return {
        totalEntries,
        validEntries,
        expiredEntries
    };
}

/**
 * Enhanced error handling specifically for commit activity endpoints
 * Provides more specific error messages and retry suggestions
 */
export function handleCommitActivityError(error: any, context: string): string {
    if (error?.status === 403) {
        if (error.message?.includes('rate limit')) {
            return `GitHub API rate limit exceeded while ${context}. The limit resets in ${getRateLimitResetTime(error.rateLimit)}. Consider using authentication to increase your rate limit.`;
        }
        return `Access forbidden while ${context}. The repository may be private or require authentication.`;
    }

    if (error?.status === 404) {
        return `Repository not found while ${context}. Please verify the repository exists and is accessible.`;
    }

    if (error?.status === 422) {
        return `Invalid request parameters while ${context}. Please check the repository name and time range.`;
    }

    if (error?.status >= 500) {
        return `GitHub API is temporarily unavailable while ${context}. Please try again in a few minutes.`;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
        return `Network error while ${context}. Please check your internet connection and try again.`;
    }

    return `An unexpected error occurred while ${context}. Please try again.`;
}

/**
 * Retry mechanism with exponential backoff for failed API requests
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<GitHubApiResponse<T>>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
    signal?: AbortSignal
): Promise<GitHubApiResponse<T>> {
    let lastError: GitHubApiResponse<T> | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted) {
            return { error: 'Request was cancelled' };
        }

        try {
            const result = await operation();
            
            // If successful or it's a client error (4xx), don't retry
            if (!result.error || (result.error && !result.error.includes('temporarily unavailable'))) {
                return result;
            }

            lastError = result;

            // Don't wait after the last attempt
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

        } catch (error) {
            lastError = { error: 'Network error occurred during retry attempt' };
            
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    return lastError || { error: 'Maximum retry attempts exceeded' };
}

/**
 * Process branch data and categorize by status
 */
export function processBranchData(
    branches: any[],
    defaultBranch: string,
    timePeriod: TimePeriod
): BranchData[] {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
    const activeThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    return branches.map(branch => {
        const lastCommitDate = new Date(branch.commit.commit.author.date);
        let status: 'active' | 'merged' | 'stale' = 'stale';

        if (branch.name === defaultBranch) {
            status = 'active';
        } else if (lastCommitDate >= activeThreshold) {
            status = 'active';
        } else if (lastCommitDate < staleThreshold) {
            status = 'stale';
        }

        return {
            name: branch.name,
            lastCommitDate: branch.commit.commit.author.date,
            commitCount: 0, // Will be populated by additional API calls if needed
            status,
            isDefault: branch.name === defaultBranch,
            ahead: 0, // Will be populated by comparison API if needed
            behind: 0, // Will be populated by comparison API if needed
            author: branch.commit.commit.author.name,
            lastCommitSha: branch.commit.sha,
            lastCommitMessage: branch.commit.commit.message,
        };
    });
}

/**
 * Process pull request data and calculate metrics
 */
export function processPRData(pullRequests: any[], timePeriod: TimePeriod): PRData[] {
    return pullRequests.map(pr => {
        const createdAt = new Date(pr.created_at);
        const mergedAt = pr.merged_at ? new Date(pr.merged_at) : undefined;
        const closedAt = pr.closed_at ? new Date(pr.closed_at) : undefined;

        let timeToMerge: number | undefined;
        if (mergedAt) {
            timeToMerge = Math.round((mergedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)); // Hours
        }

        return {
            number: pr.number,
            title: pr.title,
            state: pr.merged_at ? 'merged' : pr.state,
            createdAt: pr.created_at,
            mergedAt: pr.merged_at,
            closedAt: pr.closed_at,
            author: pr.user.login,
            reviewCount: 0, // Will be populated by review API calls
            timeToMerge,
            linesChanged: (pr.additions || 0) + (pr.deletions || 0),
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            reviewers: [], // Will be populated by review API calls
            labels: pr.labels?.map((label: any) => label.name) || [],
            isDraft: pr.draft || false,
        };
    });
}

/**
 * Calculate PR analytics from processed data
 */
export function calculatePRAnalytics(
    pullRequests: PRData[],
    timePeriod: TimePeriod
): PRAnalyticsData {
    const totalPRs = pullRequests.length;
    const openPRs = pullRequests.filter(pr => pr.state === 'open').length;
    const closedPRs = pullRequests.filter(pr => pr.state === 'closed').length;
    const mergedPRs = pullRequests.filter(pr => pr.state === 'merged').length;

    // Calculate averages
    const mergedPRsWithTime = pullRequests.filter(pr => pr.timeToMerge !== undefined);
    const averageTimeToMerge = mergedPRsWithTime.length > 0
        ? mergedPRsWithTime.reduce((sum, pr) => sum + (pr.timeToMerge || 0), 0) / mergedPRsWithTime.length
        : 0;

    const averagePRSize = pullRequests.length > 0
        ? pullRequests.reduce((sum, pr) => sum + pr.linesChanged, 0) / pullRequests.length
        : 0;

    // Generate timeline data
    const timeline = generatePRTimeline(pullRequests, timePeriod);

    // Calculate top contributors
    const contributorMap = new Map<string, ContributorStats>();
    pullRequests.forEach(pr => {
        const existing = contributorMap.get(pr.author) || {
            username: pr.author,
            prCount: 0,
            reviewCount: 0,
            linesChanged: 0,
            averageTimeToMerge: 0,
        };

        existing.prCount += 1;
        existing.linesChanged += pr.linesChanged;
        if (pr.timeToMerge) {
            existing.averageTimeToMerge = (existing.averageTimeToMerge + pr.timeToMerge) / 2;
        }

        contributorMap.set(pr.author, existing);
    });

    const topContributors = Array.from(contributorMap.values())
        .sort((a, b) => b.prCount - a.prCount)
        .slice(0, 10);

    return {
        totalPRs,
        openPRs,
        closedPRs,
        mergedPRs,
        averageTimeToMerge: Math.round(averageTimeToMerge),
        averageReviewTime: 0, // Will be calculated with review data
        averagePRSize: Math.round(averagePRSize),
        pullRequests,
        timeline,
        topContributors,
    };
}

/**
 * Generate PR timeline data for visualization
 */
export function generatePRTimeline(
    pullRequests: PRData[],
    timePeriod: TimePeriod
): PRTimelineData[] {
    const timelineMap = new Map<string, PRTimelineData>();

    pullRequests.forEach(pr => {
        const createdDate = new Date(pr.createdAt).toISOString().split('T')[0];
        const mergedDate = pr.mergedAt ? new Date(pr.mergedAt).toISOString().split('T')[0] : null;
        const closedDate = pr.closedAt ? new Date(pr.closedAt).toISOString().split('T')[0] : null;

        // Track opened PRs
        const createdEntry = timelineMap.get(createdDate) || {
            date: createdDate,
            opened: 0,
            merged: 0,
            closed: 0,
        };
        createdEntry.opened += 1;
        timelineMap.set(createdDate, createdEntry);

        // Track merged PRs
        if (mergedDate) {
            const mergedEntry = timelineMap.get(mergedDate) || {
                date: mergedDate,
                opened: 0,
                merged: 0,
                closed: 0,
            };
            mergedEntry.merged += 1;
            timelineMap.set(mergedDate, mergedEntry);
        }

        // Track closed PRs (non-merged)
        if (closedDate && !mergedDate) {
            const closedEntry = timelineMap.get(closedDate) || {
                date: closedDate,
                opened: 0,
                merged: 0,
                closed: 0,
            };
            closedEntry.closed += 1;
            timelineMap.set(closedDate, closedEntry);
        }
    });

    return Array.from(timelineMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate branch analytics from processed data
 */
export function calculateBranchAnalytics(
    branches: BranchData[],
    timePeriod: TimePeriod
): BranchAnalytics {
    const totalBranches = branches.length;
    const activeBranches = branches.filter(b => b.status === 'active').length;
    const mergedBranches = branches.filter(b => b.status === 'merged').length;
    const staleBranches = branches.filter(b => b.status === 'stale').length;

    // Generate branch activity timeline (simplified for now)
    const branchActivity: BranchActivityData[] = [];

    return {
        totalBranches,
        activeBranches,
        mergedBranches,
        staleBranches,
        branches: branches.sort((a, b) => new Date(b.lastCommitDate).getTime() - new Date(a.lastCommitDate).getTime()),
        branchActivity,
    };
}

/**
 * Process review data and calculate review metrics
 */
export function processReviewData(reviews: any[], pullRequests: PRData[]): ReviewAnalyticsData {
    const reviewMap = new Map<number, ReviewData>();
    const reviewerStatsMap = new Map<string, ReviewerStats>();

    // Process reviews for each PR
    reviews.forEach(review => {
        const prNumber = review.pull_request_number;
        const existing: ReviewData = reviewMap.get(prNumber) || {
            prNumber,
            reviewers: [],
            reviewCount: 0,
            approvalCount: 0,
            changeRequestCount: 0,
            commentCount: 0,
            reviews: [],
        };

        existing.reviewCount += 1;
        existing.reviews.push({
            reviewer: review.user.login,
            state: review.state as 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED',
            submittedAt: review.submitted_at,
        });

        if (!existing.reviewers.includes(review.user.login)) {
            existing.reviewers.push(review.user.login);
        }

        switch (review.state) {
            case 'APPROVED':
                existing.approvalCount += 1;
                break;
            case 'CHANGES_REQUESTED':
                existing.changeRequestCount += 1;
                break;
            case 'COMMENTED':
                existing.commentCount += 1;
                break;
        }

        reviewMap.set(prNumber, existing);

        // Update reviewer stats
        const reviewerStats = reviewerStatsMap.get(review.user.login) || {
            username: review.user.login,
            reviewCount: 0,
            approvalRate: 0,
            averageResponseTime: 0,
            changeRequestRate: 0,
        };

        reviewerStats.reviewCount += 1;
        reviewerStatsMap.set(review.user.login, reviewerStats);
    });

    // Calculate reviewer statistics
    const topReviewers = Array.from(reviewerStatsMap.values())
        .map(reviewer => {
            const reviewerReviews = reviews.filter(r => r.user.login === reviewer.username);
            const approvals = reviewerReviews.filter(r => r.state === 'APPROVED').length;
            const changeRequests = reviewerReviews.filter(r => r.state === 'CHANGES_REQUESTED').length;

            return {
                ...reviewer,
                approvalRate: reviewer.reviewCount > 0 ? (approvals / reviewer.reviewCount) * 100 : 0,
                changeRequestRate: reviewer.reviewCount > 0 ? (changeRequests / reviewer.reviewCount) * 100 : 0,
                averageResponseTime: 0, // Would need PR creation times to calculate
            };
        })
        .sort((a, b) => b.reviewCount - a.reviewCount)
        .slice(0, 10);

    const totalReviews = reviews.length;
    const reviewsArray = Array.from(reviewMap.values());
    const averageReviewsPerPR = pullRequests.length > 0 ? totalReviews / pullRequests.length : 0;

    return {
        totalReviews,
        averageReviewsPerPR,
        averageTimeToFirstReview: 0, // Would need detailed timing data
        averageTimeToApproval: 0, // Would need detailed timing data
        topReviewers,
        reviewPatterns: [], // Would be generated from timeline data
    };
}

/**
 * Filter branch and PR data by time period
 */
export function filterBranchPRDataByTimePeriod<T extends { createdAt?: string; lastCommitDate?: string }>(
    data: T[],
    timePeriod: TimePeriod,
    dateField: 'createdAt' | 'lastCommitDate' = 'createdAt'
): T[] {
    if (timePeriod === 'all') {
        return data;
    }

    const bounds = getTimePeriodBounds(timePeriod);
    if (!bounds.since) {
        return data;
    }

    const sinceDate = new Date(bounds.since);
    return data.filter(item => {
        const itemDate = item[dateField];
        return itemDate && new Date(itemDate) >= sinceDate;
    });
}

/**
 * Calculate PR size categories
 */
export function categorizePRSize(linesChanged: number): 'XS' | 'S' | 'M' | 'L' | 'XL' {
    if (linesChanged <= 10) return 'XS';
    if (linesChanged <= 50) return 'S';
    if (linesChanged <= 200) return 'M';
    if (linesChanged <= 500) return 'L';
    return 'XL';
}

/**
 * Calculate branch health score based on activity and age
 */
export function calculateBranchHealthScore(branch: BranchData): number {
    const now = new Date();
    const lastCommit = new Date(branch.lastCommitDate);
    const daysSinceLastCommit = Math.floor((now.getTime() - lastCommit.getTime()) / (1000 * 60 * 60 * 24));

    let score = 100;

    // Deduct points for staleness
    if (daysSinceLastCommit > 90) {
        score -= 50;
    } else if (daysSinceLastCommit > 30) {
        score -= 25;
    } else if (daysSinceLastCommit > 7) {
        score -= 10;
    }

    // Bonus for default branch
    if (branch.isDefault) {
        score = Math.min(100, score + 20);
    }

    // Deduct points if far behind
    if (branch.behind > 50) {
        score -= 20;
    } else if (branch.behind > 10) {
        score -= 10;
    }

    return Math.max(0, score);
}

/**
 * Analyze PR patterns and identify trends
 */
export function analyzePRPatterns(pullRequests: PRData[]): {
    averagePRsPerWeek: number;
    peakActivity: { day: string; count: number };
    sizeDistribution: Record<string, number>;
    mergeRate: number;
    averageReviewCycle: number;
} {
    // Calculate PRs per week
    const weeklyPRs = new Map<string, number>();
    pullRequests.forEach(pr => {
        const date = new Date(pr.createdAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        weeklyPRs.set(weekKey, (weeklyPRs.get(weekKey) || 0) + 1);
    });

    const averagePRsPerWeek = weeklyPRs.size > 0 
        ? Array.from(weeklyPRs.values()).reduce((sum, count) => sum + count, 0) / weeklyPRs.size 
        : 0;

    // Find peak activity day
    const dailyActivity = new Map<string, number>();
    pullRequests.forEach(pr => {
        const dayOfWeek = new Date(pr.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
        dailyActivity.set(dayOfWeek, (dailyActivity.get(dayOfWeek) || 0) + 1);
    });

    const peakActivity = Array.from(dailyActivity.entries())
        .reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: 'Monday', count: 0 });

    // Size distribution
    const sizeDistribution: Record<string, number> = { XS: 0, S: 0, M: 0, L: 0, XL: 0 };
    pullRequests.forEach(pr => {
        const size = categorizePRSize(pr.linesChanged);
        sizeDistribution[size] += 1;
    });

    // Merge rate
    const mergedCount = pullRequests.filter(pr => pr.state === 'merged').length;
    const mergeRate = pullRequests.length > 0 ? (mergedCount / pullRequests.length) * 100 : 0;

    return {
        averagePRsPerWeek: Math.round(averagePRsPerWeek * 10) / 10,
        peakActivity,
        sizeDistribution,
        mergeRate: Math.round(mergeRate * 10) / 10,
        averageReviewCycle: 0, // Would need review timing data
    };
}

/**
 * Generate comprehensive branch and PR analysis
 */
export function generateBranchPRAnalysis(
    branches: any[],
    pullRequests: any[],
    reviews: any[],
    defaultBranch: string,
    timePeriod: TimePeriod
): BranchPRAnalysis {
    // Process raw data
    const processedBranches = processBranchData(branches, defaultBranch, timePeriod);
    const processedPRs = processPRData(pullRequests, timePeriod);

    // Filter by time period
    const filteredBranches = filterBranchPRDataByTimePeriod(processedBranches, timePeriod, 'lastCommitDate');
    const filteredPRs = filterBranchPRDataByTimePeriod(processedPRs, timePeriod, 'createdAt');

    // Calculate analytics
    const branchAnalytics = calculateBranchAnalytics(filteredBranches, timePeriod);
    const prAnalytics = calculatePRAnalytics(filteredPRs, timePeriod);
    const reviewAnalytics = processReviewData(reviews, filteredPRs);

    return {
        branches: branchAnalytics,
        pullRequests: prAnalytics,
        reviews: reviewAnalytics,
        analysisDate: new Date().toISOString(),
        timePeriod,
    };
}