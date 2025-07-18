'use client';

interface ProgressIndicatorProps {
  progress: number;
  total: number;
  message?: string;
  onCancel?: () => void;
}

export function ProgressIndicator({ progress, total, message, onCancel }: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {message || 'Processing...'}
          </span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
          >
            Cancel
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
          <span>{progress} of {total} processed</span>
          <span>{percentage}%</span>
        </div>
        
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}