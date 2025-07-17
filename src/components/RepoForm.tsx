'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RepoFormProps {
  initialOwner?: string;
  initialRepo?: string;
  onSubmit?: (owner: string, repo: string) => void;
}

export function RepoForm({ initialOwner = '', initialRepo = '', onSubmit }: RepoFormProps) {
  const [url, setUrl] = useState(
    initialOwner && initialRepo ? `https://github.com/${initialOwner}/${initialRepo}` : ''
  );
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const parseGitHubUrl = (inputUrl: string): { owner: string; repo: string } | null => {
    // Remove whitespace and normalize URL
    const cleanUrl = inputUrl.trim();
    
    // Handle various GitHub URL formats
    const patterns = [
      // https://github.com/owner/repo
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/,
      // github.com/owner/repo
      /^github\.com\/([^\/]+)\/([^\/]+)\/?$/,
      // owner/repo
      /^([^\/]+)\/([^\/]+)$/
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        const [, owner, repo] = match;
        // Remove .git suffix if present
        const cleanRepo = repo.replace(/\.git$/, '');
        return { owner, repo: cleanRepo };
      }
    }

    return null;
  };

  const validateUrl = (inputUrl: string): string | null => {
    if (!inputUrl.trim()) {
      return 'Please enter a GitHub repository URL';
    }

    const parsed = parseGitHubUrl(inputUrl);
    if (!parsed) {
      return 'Please enter a valid GitHub repository URL (e.g., github.com/owner/repo)';
    }

    const { owner, repo } = parsed;
    
    // Basic validation for owner and repo names
    if (!owner || !repo) {
      return 'Invalid repository format';
    }

    // GitHub username/org name validation (basic)
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner)) {
      return 'Invalid owner name format';
    }

    // GitHub repo name validation (basic) - allow dots, underscores, hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(repo) || repo.startsWith('.') || repo.endsWith('.')) {
      return 'Invalid repository name format';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const validationError = validateUrl(url);
      if (validationError) {
        setError(validationError);
        setIsLoading(false);
        return;
      }

      const parsed = parseGitHubUrl(url);
      if (!parsed) {
        setError('Invalid GitHub repository URL');
        setIsLoading(false);
        return;
      }

      const { owner, repo } = parsed;

      // Call custom onSubmit handler if provided
      if (onSubmit) {
        onSubmit(owner, repo);
      } else {
        // Default behavior: navigate to analysis page
        router.push(`/analyze/${owner}/${repo}`);
      }
    } catch (err) {
      setError('An error occurred while processing the URL');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-0">
      <form onSubmit={handleSubmit} className="space-y-4" role="search" aria-label="GitHub repository analyzer">
        <div>
          <label 
            htmlFor="github-url" 
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            GitHub Repository URL
          </label>
          <input
            id="github-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="w-full px-3 py-2 text-base sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white transition-colors duration-200"
            disabled={isLoading}
            aria-describedby={error ? "url-error url-help" : "url-help"}
            aria-invalid={error ? 'true' : 'false'}
            autoComplete="url"
          />
          <div id="url-help" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter a GitHub repository URL (e.g., github.com/owner/repo)
          </div>
          {error && (
            <p id="url-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
              {error}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          aria-describedby="submit-help"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            'Analyze Repository'
          )}
        </button>
        <div id="submit-help" className="sr-only">
          Click to analyze the GitHub repository and view its statistics
        </div>
      </form>
    </div>
  );
}