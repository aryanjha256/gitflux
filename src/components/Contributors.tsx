'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { fetchContributors, type Contributor, type GitHubApiResponse } from '@/lib/github-api';

interface ContributorsProps {
    owner: string;
    repo: string;
    data?: Contributor[];
}

export function Contributors({ owner, repo, data }: ContributorsProps) {
    const [contributors, setContributors] = useState<Contributor[]>(data || []);
    const [loading, setLoading] = useState(!data);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (data) {
            setContributors(data);
            setLoading(false);
            return;
        }

        const loadContributors = async () => {
            setLoading(true);
            setError(null);

            try {
                const response: GitHubApiResponse<Contributor[]> = await fetchContributors(owner, repo);

                if (response.error) {
                    setError(response.error);
                } else if (response.data) {
                    // Sort contributors by contribution count (descending)
                    const sortedContributors = response.data.sort((a, b) => b.contributions - a.contributions);
                    setContributors(sortedContributors);
                }
            } catch (err) {
                setError('Failed to load contributors');
            } finally {
                setLoading(false);
            }
        };

        loadContributors();
    }, [owner, repo, data]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Contributors</h2>
                <div className="space-y-4" role="status" aria-label="Loading contributors">
                    {/* Loading skeleton */}
                    {[...Array(5)].map((_, index) => (
                        <div key={index} className="flex items-center space-x-4 animate-pulse" aria-hidden="true">
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2"></div>
                                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                            </div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-16 flex-shrink-0"></div>
                        </div>
                    ))}
                </div>
                <span className="sr-only">Loading contributor information...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Contributors</h2>
                <div className="text-center py-8">
                    <div className="text-red-600 dark:text-red-400 mb-4" role="img" aria-label="Error icon">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-base sm:text-lg" role="alert" aria-live="polite">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        aria-label="Reload page to try loading contributors again"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (contributors.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Contributors</h2>
                <div className="text-center py-8">
                    <div className="text-gray-400 dark:text-gray-500 mb-4" role="img" aria-label="No contributors icon">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg font-medium mb-2">No contributors found</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">This repository may not have any contributors yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Contributors ({contributors.length})
            </h2>
            <div 
                className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto"
                role="list"
                aria-label={`List of ${contributors.length} contributors`}
            >
                {contributors.map((contributor) => (
                    <div
                        key={contributor.login}
                        className="flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
                        role="listitem"
                    >
                        <a
                            href={contributor.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            aria-label={`View ${contributor.login}'s GitHub profile (${contributor.contributions} contributions)`}
                            tabIndex={0}
                        >
                            <img
                                src={contributor.avatar_url}
                                alt=""
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                                loading="lazy"
                            />
                        </a>
                        <div className="flex-1 min-w-0">
                            <a
                                href={contributor.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate focus:outline-none focus:underline"
                                tabIndex={0}
                            >
                                {contributor.login}
                            </a>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {contributor.contributions} contribution{contributor.contributions !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            <span 
                                className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                aria-label={`${contributor.contributions} contributions`}
                            >
                                {contributor.contributions}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Screen reader summary */}
            <div className="sr-only" aria-live="polite">
                <p>
                    Contributors list showing {contributors.length} contributors. 
                    Top contributor: {contributors[0]?.login} with {contributors[0]?.contributions} contributions.
                    Use Tab to navigate through contributor profiles.
                </p>
            </div>
        </div>
    );
}