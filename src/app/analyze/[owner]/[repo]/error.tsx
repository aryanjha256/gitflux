'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Repository analysis error:', error);
  }, [error]);

  const getErrorMessage = (error: Error) => {
    if (error.message.includes('rate limit')) {
      return {
        title: 'Rate Limit Exceeded',
        message: 'GitHub API rate limit has been exceeded. Please try again later.',
        suggestion: 'The rate limit typically resets every hour.',
      };
    }

    if (error.message.includes('Network error')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to GitHub. Please check your internet connection.',
        suggestion: 'Try refreshing the page or check your network connection.',
      };
    }

    if (error.message.includes('Access forbidden')) {
      return {
        title: 'Access Forbidden',
        message: 'This repository may be private or require authentication.',
        suggestion: 'Make sure the repository is public and accessible.',
      };
    }

    if (error.message.includes('GitHub API is currently unavailable')) {
      return {
        title: 'Service Unavailable',
        message: 'GitHub API is temporarily unavailable.',
        suggestion: 'Please try again in a few minutes.',
      };
    }

    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred while analyzing the repository.',
      suggestion: 'Please try again or contact support if the problem persists.',
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>

          <p className="text-gray-600 mb-4">
            {errorInfo.message}
          </p>

          <p className="text-sm text-gray-500 mb-8">
            {errorInfo.suggestion}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </button>

            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Home
            </a>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-8 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-4 rounded overflow-auto">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}