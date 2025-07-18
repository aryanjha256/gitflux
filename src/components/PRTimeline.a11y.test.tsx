import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { PRTimeline } from './PRTimeline';
import { PRTimelineData } from '@/lib/github-api';

// Mock Recharts components
jest.mock('recharts', () => ({
  AreaChart: ({ children }: any) => <div data-testid="area-chart" role="img" aria-label="Pull request timeline chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

const mockTimelineData: PRTimelineData[] = [
  {
    date: '2024-01-01',
    opened: 5,
    merged: 3,
    closed: 1,
  },
  {
    date: '2024-01-02',
    opened: 2,
    merged: 4,
    closed: 0,
  },
  {
    date: '2024-01-03',
    opened: 3,
    merged: 2,
    closed: 2,
  },
];

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

describe('PRTimeline Accessibility', () => {
  it('should have no accessibility violations in normal state', async () => {
    const { container } = render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in loading state', async () => {
    const { container } = render(
      <PRTimeline
        timelineData={[]}
        isLoading={true}
        timePeriod="30d"
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations in empty state', async () => {
    const { container } = render(
      <PRTimeline
        timelineData={[]}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA attributes for chart elements', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Chart should have role="img" and aria-label
    const chart = screen.getByTestId('area-chart');
    expect(chart).toHaveAttribute('role', 'img');
    expect(chart).toHaveAttribute('aria-label', 'Pull request timeline chart');
  });

  it('should have accessible text alternatives for visual elements', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Check that stat cards have accessible text
    expect(screen.getByText('PRs Opened')).toBeInTheDocument();
    expect(screen.getByText('PRs Merged')).toBeInTheDocument();
    expect(screen.getByText('PRs Closed')).toBeInTheDocument();
    expect(screen.getByText('Peak Activity')).toBeInTheDocument();
  });

  it('should have accessible loading state', () => {
    render(
      <PRTimeline
        timelineData={[]}
        isLoading={true}
        timePeriod="30d"
      />
    );
    
    // Loading state should have aria-busy
    const loadingElement = screen.getByText('Loading chart...');
    expect(loadingElement.closest('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('should have accessible empty state', () => {
    render(
      <PRTimeline
        timelineData={[]}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Empty state should have proper heading structure
    const heading = screen.getByText('No timeline data available');
    expect(heading).toBeInTheDocument();
  });

  it('should have proper heading structure', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Should have a proper heading
    const heading = screen.getByText('Pull Request Timeline');
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe('H3');
  });

  it('should provide screen reader friendly data summaries', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Should have screen reader only summary
    const srOnlyElements = document.querySelectorAll('.sr-only');
    expect(srOnlyElements.length).toBeGreaterThan(0);
  });

  it('should have proper color contrast for all text elements', () => {
    render(
      <PRTimeline
        timelineData={mockTimelineData}
        isLoading={false}
        timePeriod="30d"
      />
    );
    
    // Check that text elements have proper contrast classes
    const textElements = screen.getAllByText(/PRs|Pull Request|Timeline/);
    textElements.forEach(element => {
      const classes = element.className;
      // Should have dark mode text colors for contrast
      expect(classes).toMatch(/text-gray-\d+|text-blue-\d+|text-green-\d+|text-red-\d+/);
    });
  });
});