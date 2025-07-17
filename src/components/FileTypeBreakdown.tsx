'use client';

import { FileTypeData } from '@/lib/github-api';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useMemo } from 'react';

interface FileTypeBreakdownProps {
  typeData: FileTypeData[];
  isLoading: boolean;
}

export function FileTypeBreakdown({ typeData, isLoading }: FileTypeBreakdownProps) {
  // Process data for the pie chart
  const chartData = useMemo(() => {
    if (!typeData || typeData.length === 0) {
      return [];
    }

    // Only show categories with meaningful data (>1% or top 8)
    const significantTypes = typeData
      .filter(type => type.percentage > 1 || typeData.indexOf(type) < 8)
      .slice(0, 8); // Limit to 8 categories for readability

    // Group remaining small categories into "Other"
    const remainingTypes = typeData.slice(significantTypes.length);
    const otherTotal = remainingTypes.reduce((sum, type) => sum + type.changeCount, 0);
    const otherPercentage = remainingTypes.reduce((sum, type) => sum + type.percentage, 0);

    const result = [...significantTypes];
    
    if (otherTotal > 0) {
      result.push({
        extension: 'Other',
        category: 'Other',
        changeCount: otherTotal,
        percentage: otherPercentage,
        color: '#6b7280',
      });
    }

    return result;
  }, [typeData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          File Type Distribution
        </h3>
        
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
          <div className="text-gray-400 dark:text-gray-500">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
            <div className="text-center">Loading chart...</div>
          </div>
        </div>
        
        {/* Loading skeleton for legend */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 animate-pulse">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!typeData || typeData.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          File Type Distribution
        </h3>
        
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-lg font-medium">No file type data available</p>
          <p className="text-sm">File changes will be categorized by type when available.</p>
        </div>
      </div>
    );
  }

  const totalChanges = typeData.reduce((sum, type) => sum + type.changeCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          File Type Distribution
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {typeData.length} types • {totalChanges} total changes
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="changeCount"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend and Statistics */}
        <div className="space-y-4">
          <div className="space-y-2">
            {chartData.map((type, index) => (
              <FileTypeLegendItem
                key={type.category}
                type={type}
                rank={index + 1}
                totalChanges={totalChanges}
              />
            ))}
          </div>

          {/* Summary Statistics */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Most Active Type:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeData[0]?.category || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total File Types:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeData.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Diversity Score:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {calculateDiversityScore(typeData)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top File Types Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {typeData.slice(0, 4).map((type, index) => (
          <FileTypeCard key={type.category} type={type} rank={index + 1} />
        ))}
      </div>
    </div>
  );
}

interface FileTypeLegendItemProps {
  type: FileTypeData;
  rank: number;
  totalChanges: number;
}

function FileTypeLegendItem({ type, rank, totalChanges }: FileTypeLegendItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: type.color }}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {type.category}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          #{rank}
        </span>
      </div>
      
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {type.changeCount}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {type.percentage.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

interface FileTypeCardProps {
  type: FileTypeData;
  rank: number;
}

function FileTypeCard({ type, rank }: FileTypeCardProps) {
  const getTypeIcon = (category: string) => {
    const icons: Record<string, string> = {
      'JavaScript': '🟨',
      'TypeScript': '🔷',
      'Python': '🐍',
      'Java': '☕',
      'C++': '⚙️',
      'C': '⚙️',
      'C#': '🔵',
      'PHP': '🐘',
      'Ruby': '💎',
      'Go': '🐹',
      'Rust': '🦀',
      'Swift': '🍎',
      'Kotlin': '🟣',
      'HTML': '🌐',
      'CSS': '🎨',
      'Config': '📋',
      'Documentation': '📝',
      'Images': '🖼️',
      'Other': '📄',
    };
    
    return icons[category] || '📄';
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{getTypeIcon(type.category)}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {type.category}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Rank #{rank}
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Changes:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {type.changeCount}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Share:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {type.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ 
            width: `${Math.min(type.percentage, 100)}%`,
            backgroundColor: type.color 
          }}
        />
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.category}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div>{data.changeCount} changes</div>
          <div>{data.percentage.toFixed(1)}% of total</div>
        </div>
      </div>
    );
  }
  return null;
}

function calculateDiversityScore(typeData: FileTypeData[]): number {
  if (typeData.length === 0) return 0;
  
  // Calculate Shannon diversity index
  const totalChanges = typeData.reduce((sum, type) => sum + type.changeCount, 0);
  if (totalChanges === 0) return 0;
  
  const diversity = typeData.reduce((sum, type) => {
    const proportion = type.changeCount / totalChanges;
    return sum - (proportion * Math.log2(proportion));
  }, 0);
  
  // Normalize to 0-100 scale (max diversity for 8 categories ≈ 3)
  const maxDiversity = Math.log2(Math.min(typeData.length, 8));
  return Math.round((diversity / maxDiversity) * 100);
}