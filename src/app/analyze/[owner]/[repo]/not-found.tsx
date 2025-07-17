'use client';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
            <svg
              className="h-8 w-8 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0m6 0V5a2 2 0 00-2-2H9a2 2 0 00-2 2v1.306m8 0V9a2 2 0 01-2 2H9a2 2 0 01-2-2V6.306"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Repository Not Found
          </h1>

          <p className="text-gray-600 mb-4">
            The repository you're looking for doesn't exist or may have been moved.
          </p>

          <p className="text-sm text-gray-500 mb-8">
            Please check the repository name and owner, or make sure the repository is public.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Search Another Repository
            </a>

            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Back
            </button>
          </div>

          <div className="mt-8 text-sm text-gray-500">
            <p className="mb-2">Common issues:</p>
            <ul className="text-left space-y-1">
              <li>• Repository name or owner is misspelled</li>
              <li>• Repository is private and requires authentication</li>
              <li>• Repository has been deleted or moved</li>
              <li>• Repository doesn't exist on GitHub</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}