'use client';

import { FileChangeData } from '@/lib/github-api';
import { useMemo } from 'react';

interface FileChangeListProps {
  files: FileChangeData[];
  isLoading: boolean;
  onFileSelect: (filename: string) => void;
  selectedFile?: string;
}

export function FileChangeList({ files, isLoading, onFileSelect, selectedFile }: FileChangeListProps) {
  // Memoize the sorted files to avoid unnecessary re-renders
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => b.changeCount - a.changeCount);
  }, [files]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Most Changed Files
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full animate-spin" />
            Loading files...
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse"
            >
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sortedFiles.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Most Changed Files
        </h3>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📁</div>
          <p className="text-lg font-medium">No file changes found</p>
          <p className="text-sm">Try selecting a different time period or check if the repository has commits.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Most Changed Files
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {sortedFiles.length} files • {sortedFiles.reduce((sum, file) => sum + file.changeCount, 0)} total changes
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedFiles.map((file, index) => (
          <FileChangeItem
            key={file.filename}
            file={file}
            rank={index + 1}
            isSelected={selectedFile === file.filename}
            onSelect={() => onFileSelect(file.filename)}
          />
        ))}
      </div>
    </div>
  );
}

interface FileChangeItemProps {
  file: FileChangeData;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
}

function FileChangeItem({ file, rank, isSelected, onSelect }: FileChangeItemProps) {
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const icons: Record<string, string> = {
      'js': '🟨',
      'jsx': '🟨',
      'ts': '🔷',
      'tsx': '🔷',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'cs': '🔵',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'swift': '🍎',
      'kt': '🟣',
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'json': '📋',
      'xml': '📋',
      'yml': '📋',
      'yaml': '📋',
      'md': '📝',
      'txt': '📄',
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🖼️',
    };

    return icons[ext || ''] || '📄';
  };

  const formatLastChanged = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <button
      onClick={onSelect}
      className={`
        w-full text-left p-3 rounded-lg border transition-all duration-200
        hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${
          isSelected
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
            : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750'
        }
        ${file.isDeleted ? 'opacity-75' : ''}
      `}
      aria-label={`Select ${file.filename} for detailed analysis`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 w-6 text-center">
              #{rank}
            </span>
            <span className="text-lg">{getFileIcon(file.filename)}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`
                font-mono text-sm truncate
                ${file.isDeleted 
                  ? 'text-red-600 dark:text-red-400 line-through' 
                  : 'text-gray-900 dark:text-gray-100'
                }
              `}>
                {file.filename}
              </span>
              {file.isDeleted && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full dark:bg-red-900/30 dark:text-red-400">
                  Deleted
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{file.fileType}</span>
              <span>Last changed {formatLastChanged(file.lastChanged)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {file.changeCount} changes
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {file.percentage.toFixed(1)}% of total
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(file.percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  );
}