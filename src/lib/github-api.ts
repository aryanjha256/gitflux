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