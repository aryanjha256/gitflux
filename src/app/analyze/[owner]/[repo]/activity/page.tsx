import { notFound } from 'next/navigation';
import { fetchRepository } from '@/lib/github-api';
import { ActivityVisualizationPanel } from '@/components/ActivityVisualizationPanel';
import { RepoForm } from '@/components/RepoForm';
import { ActivityPageClient } from './ActivityPageClient';

interface PageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
  searchParams: Promise<{
    timeRange?: string;
  }>;
}

export default async function ActivityPage({ params, searchParams }: PageProps) {
  const { owner, repo } = await params;
  const { timeRange } = await searchParams;

  // Validate time range parameter
  const validTimeRanges = ['30d', '3m', '6m', '1y'] as const;
  const initialTimeRange = validTimeRanges.includes(timeRange as any) 
    ? (timeRange as typeof validTimeRanges[number])
    : '30d';

  // Fetch repository data to validate it exists
  const repoResponse = await fetchRepository(owner, repo);

  // Handle repository not found
  if (repoResponse.error === 'Repository not found') {
    notFound();
  }

  // Handle other API errors
  if (repoResponse.error) {
    throw new Error(repoResponse.error);
  }

  const repository = repoResponse.data!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Repository Form Section */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6" aria-label="Repository search">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Analyze Another Repository</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter a GitHub repository URL to analyze</p>
            </div>
          </div>
          <RepoForm initialOwner={owner} initialRepo={repo} />
        </section>

        {/* Repository Header */}
        <header className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 break-words">
                {repository.full_name} - Activity Analysis
              </h1>
              {repository.description && (
                <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg mb-4 leading-relaxed">{repository.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1" aria-label={`${repository.stargazers_count.toLocaleString()} stars`}>
                  <span role="img" aria-hidden="true">⭐</span>
                  <span>{repository.stargazers_count.toLocaleString()} stars</span>
                </span>
                <span className="flex items-center gap-1" aria-label={`${repository.forks_count.toLocaleString()} forks`}>
                  <span role="img" aria-hidden="true">🍴</span>
                  <span>{repository.forks_count.toLocaleString()} forks</span>
                </span>
                {repository.language && (
                  <span className="flex items-center gap-1" aria-label={`Primary language: ${repository.language}`}>
                    <span role="img" aria-hidden="true">📝</span>
                    <span>{repository.language}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 flex gap-3">
              <a
                href={`/analyze/${owner}/${repo}`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label={`View main analysis for ${repository.full_name}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Main Analysis
              </a>
              <a
                href={repository.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label={`View ${repository.full_name} on GitHub (opens in new tab)`}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </header>

        {/* Activity Visualization Panel */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6" aria-label="Commit activity visualizations">
          <ActivityPageClient
            owner={owner}
            repo={repo}
            initialTimeRange={initialTimeRange}
          />
        </section>
      </div>
    </div>
  );
}