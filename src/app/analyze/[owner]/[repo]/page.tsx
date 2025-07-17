import { notFound } from 'next/navigation';
import { fetchRepository, fetchContributors, fetchCommitActivity, transformCommitActivity } from '@/lib/github-api';
import { CommitChart } from '@/components/CommitChart';
import { Contributors } from '@/components/Contributors';
import { RepoForm } from '@/components/RepoForm';
import { MostChangedFiles } from '@/components/MostChangedFiles';

interface PageProps {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
}

export default async function AnalyzePage({ params }: PageProps) {
  const { owner, repo } = await params;

  // Fetch repository data
  const [repoResponse, contributorsResponse, activityResponse] = await Promise.all([
    fetchRepository(owner, repo),
    fetchContributors(owner, repo),
    fetchCommitActivity(owner, repo),
  ]);

  // Handle repository not found
  if (repoResponse.error === 'Repository not found') {
    notFound();
  }

  // Handle other API errors
  if (repoResponse.error) {
    throw new Error(repoResponse.error);
  }

  const repository = repoResponse.data!;
  const contributors = contributorsResponse.data || [];
  const commitActivity = activityResponse.data && Array.isArray(activityResponse.data) 
    ? transformCommitActivity(activityResponse.data) 
    : [];

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
                {repository.full_name}
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
            <div className="flex-shrink-0">
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

        {/* Repository Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6" aria-label="Repository statistics">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Repository Info</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-gray-600 dark:text-gray-400">Created:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  <time dateTime={repository.created_at}>
                    {new Date(repository.created_at).toLocaleDateString()}
                  </time>
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-600 dark:text-gray-400">Last Updated:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  <time dateTime={repository.updated_at}>
                    {new Date(repository.updated_at).toLocaleDateString()}
                  </time>
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-600 dark:text-gray-400">Visibility:</dt>
                <dd className="text-gray-900 dark:text-gray-100 font-medium">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    repository.private 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {repository.private ? 'Private' : 'Public'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Contributors</h3>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2" aria-label={`${contributors.length} total contributors`}>
              {contributors.length}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total contributors</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Activity</h3>
            <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mb-2" aria-label={`${commitActivity.reduce((sum, week) => sum + week.count, 0)} total commits in the last year`}>
              {commitActivity.reduce((sum, week) => sum + week.count, 0)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total commits (last year)</p>
          </div>
        </section>

        {/* Contributors Section */}
        <section className="mb-6" aria-label="Repository contributors">
          <Contributors owner={owner} repo={repo} data={contributors} />
        </section>

        {/* Commit Activity Chart */}
        <section className="mb-6" aria-label="Commit activity visualization">
          <CommitChart owner={owner} repo={repo} data={commitActivity} />
        </section>

        {/* Most Changed Files Analysis */}
        <section className="mb-6" aria-label="File change analysis">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <MostChangedFiles owner={owner} repo={repo} />
          </div>
        </section>
      </div>
    </div>
  );
}