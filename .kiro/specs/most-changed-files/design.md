# Design Document

## Overview

The Most Changed Files Analysis feature will be integrated into the existing GitHub Repository Analyzer as an additional analysis section. It will leverage the GitHub API to fetch commit data and analyze file change patterns, providing developers with insights into code churn and file volatility. The feature will use efficient data processing techniques to handle large repositories and provide interactive visualizations for better understanding of change patterns.

## Architecture

### Integration with Existing System
- Extend the existing `/app/analyze/[owner]/[repo]/page.tsx` route
- Add new components to the existing components structure
- Utilize the existing GitHub API integration layer
- Maintain consistency with current error handling and loading patterns

### Data Processing Flow
1. Fetch commit data from GitHub API with file change information
2. Process and aggregate file change statistics
3. Apply time-based filtering and sorting
4. Generate trend data and file type breakdowns
5. Render interactive visualizations and lists

## Components and Interfaces

### MostChangedFiles Component (`components/MostChangedFiles.tsx`)
```typescript
interface FileChangeData {
  filename: string;
  changeCount: number;
  percentage: number;
  lastChanged: string;
  fileType: string;
  isDeleted: boolean;
  trendData: TrendPoint[];
}

interface TrendPoint {
  date: string;
  changes: number;
}

interface MostChangedFilesProps {
  owner: string;
  repo: string;
  timePeriod?: TimePeriod;
}

export function MostChangedFiles({ owner, repo, timePeriod }: MostChangedFilesProps)
```

**Responsibilities:**
- Orchestrate the display of file change analysis
- Handle time period filtering
- Coordinate between file list, trends, and type breakdown components
- Manage loading and error states

### FileChangeList Component (`components/FileChangeList.tsx`)
```typescript
interface FileChangeListProps {
  files: FileChangeData[];
  isLoading: boolean;
  onFileSelect: (filename: string) => void;
  selectedFile?: string;
}

export function FileChangeList({ files, isLoading, onFileSelect, selectedFile }: FileChangeListProps)
```

**Responsibilities:**
- Display ranked list of most changed files
- Show file paths, change counts, and percentages
- Handle file selection for detailed trend view
- Implement virtualization for large file lists
- Indicate deleted files with appropriate styling

### FileChangeTrend Component (`components/FileChangeTrend.tsx`)
```typescript
interface FileChangeTrendProps {
  filename: string;
  trendData: TrendPoint[];
  timePeriod: TimePeriod;
}

export function FileChangeTrend({ filename, trendData, timePeriod }: FileChangeTrendProps)
```

**Responsibilities:**
- Display trend chart for selected file
- Show change frequency over time
- Provide interactive hover details
- Handle different time period granularities
- Show appropriate messages for insufficient data

### FileTypeBreakdown Component (`components/FileTypeBreakdown.tsx`)
```typescript
interface FileTypeData {
  extension: string;
  category: string;
  changeCount: number;
  percentage: number;
  color: string;
}

interface FileTypeBreakdownProps {
  typeData: FileTypeData[];
  isLoading: boolean;
}

export function FileTypeBreakdown({ typeData, isLoading }: FileTypeBreakdownProps)
```

**Responsibilities:**
- Display pie or donut chart of file type distribution
- Show file type categories with appropriate colors
- Provide legend and percentage information
- Handle empty states and loading indicators

### TimePeriodFilter Component (`components/TimePeriodFilter.tsx`)
```typescript
type TimePeriod = '30d' | '90d' | '6m' | '1y' | 'all';

interface TimePeriodFilterProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  isLoading: boolean;
}

export function TimePeriodFilter({ selectedPeriod, onPeriodChange, isLoading }: TimePeriodFilterProps)
```

**Responsibilities:**
- Provide time period selection interface
- Handle period change events
- Show loading states during data refresh
- Maintain accessible button group design

## Data Models

### File Change Analysis Data
```typescript
interface FileChangeAnalysis {
  files: FileChangeData[];
  totalChanges: number;
  analysisDate: string;
  timePeriod: TimePeriod;
  fileTypeBreakdown: FileTypeData[];
}

interface CommitFileData {
  sha: string;
  date: string;
  files: {
    filename: string;
    status: 'added' | 'modified' | 'removed';
    changes: number;
    additions: number;
    deletions: number;
  }[];
}
```

### API Response Extensions
```typescript
interface FileChangeApiResponse extends GitHubApiResponse<FileChangeAnalysis> {
  processingTime?: number;
  dataPoints?: number;
  rateLimitWarning?: boolean;
}
```

## Error Handling

### Performance and Rate Limiting
- Implement progressive data loading for large repositories
- Show warnings when approaching GitHub API rate limits
- Provide options to reduce analysis scope if processing takes too long
- Cache processed data to minimize API calls

### Error States
- Handle repositories with no commit history
- Manage API failures gracefully with retry options
- Show appropriate messages for insufficient permissions
- Provide fallback UI for processing timeouts

### Data Quality Issues
- Handle commits with missing file information
- Manage renamed/moved files appropriately
- Deal with merge commits and their file change data
- Handle repositories with unusual commit patterns

## Testing Strategy

### Unit Tests
- Test file change data processing algorithms
- Test time period filtering logic
- Test file type categorization
- Test trend data generation
- Test component rendering with various data states

### Integration Tests
- Test complete file change analysis workflow
- Test API integration with large repositories
- Test performance with high-volume data
- Test time period filtering end-to-end

### Performance Tests
- Test memory usage with large file lists
- Test rendering performance with complex visualizations
- Test API rate limit handling
- Test data processing efficiency

## Implementation Notes

### GitHub API Usage
- Use GitHub REST API commits endpoint with file details
- Implement efficient pagination for large commit histories
- Consider using GraphQL API for more efficient data fetching
- Handle API rate limits with intelligent batching

### Data Processing Optimization
- Implement streaming data processing for large datasets
- Use Web Workers for heavy computation if needed
- Implement efficient data structures for file change tracking
- Cache intermediate results to improve performance

### Visualization Libraries
- Use Recharts for trend charts (consistent with existing components)
- Implement custom pie chart or use Chart.js for file type breakdown
- Ensure all charts are accessible and responsive
- Provide alternative text descriptions for screen readers

### Performance Considerations
- Implement virtual scrolling for large file lists
- Use React.memo and useMemo for expensive computations
- Implement progressive loading with skeleton states
- Consider server-side processing for very large repositories