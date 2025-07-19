export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Repository Form Section Skeleton */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6" aria-label="Loading repository search">
          <div className="animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              </div>
            </div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        </section>

        {/* Repository Header Skeleton */}
        <header className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
          <div className="animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-2"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              </div>
              <div className="flex-shrink-0 flex gap-3">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Activity Visualization Panel Skeleton */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6" aria-label="Loading activity visualizations">
          <div className="animate-pulse">
            {/* Header with time range controls skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            </div>

            {/* Visualizations Container Skeleton */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Heatmap Skeleton */}
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>

              {/* Trendlines Skeleton */}
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}