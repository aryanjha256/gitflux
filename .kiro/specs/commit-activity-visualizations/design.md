# Design Document

## Overview

The commit activity visualizations feature adds two complementary visual analytics components to GitFlux: a weekly commit activity heatmap and contributor trendlines. These components will integrate seamlessly with the existing architecture, leveraging the current GitHub API integration, Recharts visualization library, and established UI patterns.

The heatmap provides a GitHub-style grid visualization showing commit patterns across days of the week, while the trendlines reveal individual contributor momentum over time. Both visualizations support time range filtering and maintain the application's responsive design and accessibility standards.

## Architecture

### Component Structure
```
src/components/
├── CommitActivityHeatmap.tsx     # Weekly heatmap grid component
├── ContributorTrendlines.tsx     # Multi-line trend chart component
├── ActivityVisualizationPanel.tsx # Container component with shared controls
└── __tests__/
    ├── CommitActivityHeatmap.test.tsx
    ├── ContributorTrendlines.test.tsx
    └── ActivityVisualizationPanel.test.tsx
```

### Data Flow Architecture
```
GitHub API → Data Processing → Component State → Visualization Rendering
     ↓              ↓               ↓                    ↓
- Commits API   - Aggregation   - Loading States    - Recharts/Custom
- Contributors  - Transformation - Error Handling   - Responsive Design
- Time Filtering - Caching       - User Interactions - Accessibility
```

### Integration Points
- **API Layer**: Extends existing `@/lib/github-api` with new data fetching functions
- **UI Components**: Follows established patterns from `CommitChart.tsx` and other visualization components
- **Routing**: New route at `/repo/[owner]/[repo]/activity` for dedicated activity analysis
- **Shared Components**: Reuses `TimePeriodFilter.tsx` for consistent time range controls

## Components and Interfaces

### 1. CommitActivityHeatmap Component

**Purpose**: Displays a GitHub-style weekly commit activity heatmap

**Props Interface**:
```typescript
interface CommitActivityHeatmapProps {
  owner: string;
  repo: string;
  timeRange: TimeRange;
  data?: WeeklyCommitData[];
}

interface WeeklyCommitData {
  date: string;           // ISO date string
  dayOfWeek: number;      // 0-6 (Sunday-Saturday)
  commitCount: number;
  contributors: string[]; // For tooltip details
}
```

**Key Features**:
- 7x52 grid layout (days × weeks) for yearly view, adaptive for shorter periods
- Color intensity mapping based on commit volume (5-level scale)
- Interactive tooltips showing date, commit count, and top contributors
- Responsive design with mobile-optimized cell sizes
- Keyboard navigation support for accessibility

**Visual Design**:
- Uses CSS Grid for layout flexibility
- Color scale: `bg-gray-100` (0 commits) to `bg-blue-900` (highest activity)
- Hover effects with smooth transitions
- Loading skeleton with animated placeholders

### 2. ContributorTrendlines Component

**Purpose**: Shows individual contributor activity trends over time

**Props Interface**:
```typescript
interface ContributorTrendlinesProps {
  owner: string;
  repo: string;
  timeRange: TimeRange;
  data?: ContributorTrendData[];
}

interface ContributorTrendData {
  contributor: string;
  avatar?: string;
  dataPoints: TrendPoint[];
}

interface TrendPoint {
  date: string;
  commitCount: number;
  trend: 'up' | 'down' | 'stable';
}
```

**Key Features**:
- Multi-line chart using Recharts LineChart
- Distinct colors/styles for each contributor (up to 10 visible)
- Trend indicators (arrows/icons) for recent activity changes
- Interactive legend with contributor filtering
- Responsive tooltip with contributor details and commit counts

**Visual Design**:
- Color palette: Uses predefined set of distinct colors for lines
- Line styles: Solid for active contributors, dashed for inactive
- Interactive legend with checkboxes for toggling visibility
- Trend indicators using small arrow icons next to contributor names

### 3. ActivityVisualizationPanel Component

**Purpose**: Container component that orchestrates both visualizations with shared controls

**Props Interface**:
```typescript
interface ActivityVisualizationPanelProps {
  owner: string;
  repo: string;
  initialTimeRange?: TimeRange;
}
```

**Key Features**:
- Shared time range filtering for both visualizations
- Loading state coordination
- Error boundary for graceful error handling
- Responsive layout switching between stacked (mobile) and side-by-side (desktop)

## Data Models

### Core Data Types
```typescript
// Time range options
type TimeRange = '30d' | '3m' | '6m' | '1y';

// Aggregated commit data for heatmap
interface HeatmapData {
  weeks: WeeklyCommitData[];
  totalCommits: number;
  peakDay: { day: string; count: number };
  averagePerDay: number;
}

// Contributor trend analysis
interface ContributorAnalysis {
  contributors: ContributorTrendData[];
  timeRange: TimeRange;
  totalContributors: number;
  activeContributors: number; // Contributors with commits in last 30 days
}

// API response types
interface CommitActivityResponse {
  commits: GitHubCommit[];
  contributors: GitHubContributor[];
  dateRange: { start: string; end: string };
}
```

### Data Processing Functions
```typescript
// Transform raw GitHub commits into heatmap format
function transformToHeatmapData(
  commits: GitHubCommit[], 
  timeRange: TimeRange
): HeatmapData;

// Calculate contributor trends with momentum analysis
function calculateContributorTrends(
  commits: GitHubCommit[], 
  timeRange: TimeRange
): ContributorAnalysis;

// Aggregate commits by time periods for trend analysis
function aggregateCommitsByPeriod(
  commits: GitHubCommit[], 
  period: 'day' | 'week' | 'month'
): AggregatedCommitData[];
```

## Error Handling

### Error Scenarios and Responses

1. **API Rate Limiting**
   - Display rate limit warning with retry countdown
   - Implement exponential backoff for automatic retries
   - Cache successful responses to reduce API calls

2. **Network Failures**
   - Show network error message with manual retry button
   - Implement offline detection and appropriate messaging
   - Graceful degradation with cached data when available

3. **Invalid Repository**
   - Display repository not found or access denied message
   - Provide suggestions for common repository URL formats
   - Redirect to main search if repository is invalid

4. **Large Dataset Performance**
   - Implement data pagination for repositories with extensive history
   - Show loading progress indicators for long-running operations
   - Provide data sampling options for very large repositories

### Error UI Components
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

// Specific error components for different scenarios
const RateLimitError: React.FC<{ resetTime: number }>;
const NetworkError: React.FC<{ onRetry: () => void }>;
const RepositoryNotFoundError: React.FC<{ repoUrl: string }>;
```

## Testing Strategy

### Unit Testing Approach

1. **Component Testing**
   - Render testing with various data states (loading, error, empty, populated)
   - User interaction testing (hover, click, keyboard navigation)
   - Accessibility testing with jest-axe
   - Responsive behavior testing with different viewport sizes

2. **Data Processing Testing**
   - Transform function testing with edge cases (empty data, single commit, large datasets)
   - Date handling and timezone considerations
   - Performance testing with large datasets
   - Boundary condition testing (leap years, month boundaries)

3. **Integration Testing**
   - API integration with mocked GitHub responses
   - Time range filtering across components
   - Error handling and recovery scenarios
   - Cross-component state synchronization

### Test Data Strategy
```typescript
// Mock data generators for consistent testing
const generateMockCommits = (count: number, dateRange: DateRange): GitHubCommit[];
const generateMockContributors = (count: number): GitHubContributor[];
const createHeatmapTestScenarios = (): TestScenario[];
```

### Performance Testing
- Render performance with large datasets (1000+ commits)
- Memory usage monitoring for long-running sessions
- Bundle size impact analysis
- Accessibility performance (screen reader compatibility)

### Accessibility Testing Requirements
- Keyboard navigation through all interactive elements
- Screen reader compatibility with proper ARIA labels
- Color contrast compliance (WCAG 2.1 AA)
- Focus management and visual indicators
- Alternative text for visual data representations

## Implementation Notes

### Recharts Integration
- Leverage existing Recharts setup from `CommitChart.tsx`
- Use `ResponsiveContainer` for automatic sizing
- Implement custom tooltip components for enhanced UX
- Maintain consistent styling with existing charts

### Performance Optimizations
- Implement `React.memo` for expensive rendering operations
- Use `useMemo` for data transformations
- Implement virtual scrolling for large contributor lists
- Debounce time range filter changes

### Mobile Responsiveness
- Adaptive grid sizing for heatmap on small screens
- Collapsible legend for trendlines on mobile
- Touch-friendly interaction targets
- Optimized tooltip positioning for mobile devices

### Accessibility Enhancements
- Comprehensive ARIA labeling for complex visualizations
- Keyboard navigation patterns consistent with existing components
- Screen reader friendly data summaries
- High contrast mode support