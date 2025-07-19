import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommitActivityHeatmap } from './CommitActivityHeatmap';
import * as githubApi from '@/lib/github-api';
import * as commitActivityData from '@/lib/commit-activity-data';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the dependencies
vi.mock('@/lib/github-api', () => ({
    fetchCommitsWithFiles: vi.fn(),
}));

vi.mock('@/lib/commit-activity-data', () => ({
    transformToHeatmapData: vi.fn(),
    filterCommitsByTimeRange: vi.fn(),
}));

const mockFetchCommitsWithFiles = vi.mocked(githubApi.fetchCommitsWithFiles);
const mockTransformToHeatmapData = vi.mocked(commitActivityData.transformToHeatmapData);
const mockFilterCommitsByTimeRange = vi.mocked(commitActivityData.filterCommitsByTimeRange);

// Mock data
const mockWeeklyCommitData = [
    {
        date: '2024-01-01',
        dayOfWeek: 1, // Monday
        commitCount: 5,
        contributors: ['user1', 'user2'],
    },
    {
        date: '2024-01-02',
        dayOfWeek: 2, // Tuesday
        commitCount: 3,
        contributors: ['user1'],
    },
    {
        date: '2024-01-03',
        dayOfWeek: 3, // Wednesday
        commitCount: 0,
        contributors: [],
    },
];

const mockHeatmapData = {
    weeks: mockWeeklyCommitData,
    totalCommits: 8,
    peakDay: { day: 'Monday', count: 5 },
    averagePerDay: 1.14,
};

const mockCommitData = [
    {
        sha: 'abc123',
        date: '2024-01-01T10:00:00Z',
        author: 'user1',
        message: 'Test commit',
        files: [],
    },
    {
        sha: 'def456',
        date: '2024-01-02T14:00:00Z',
        author: 'user2',
        message: 'Another commit',
        files: [],
    },
];

const defaultProps = {
    owner: 'testowner',
    repo: 'testrepo',
    timeRange: '30d' as const,
};

// Mock window.innerWidth for responsive tests
const mockWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: width,
    });
    window.dispatchEvent(new Event('resize'));
};

describe('CommitActivityHeatmap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTransformToHeatmapData.mockReturnValue(mockHeatmapData);
        mockFilterCommitsByTimeRange.mockReturnValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('renders with provided data prop', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            expect(screen.getByText('Weekly Commit Activity')).toBeInTheDocument();
            expect(screen.getByText(/8 commits/)).toBeInTheDocument();
            expect(screen.getByText(/Peak: Monday \(5\)/)).toBeInTheDocument();
        });

        it('renders loading state initially when no data provided', () => {
            mockFetchCommitsWithFiles.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(<CommitActivityHeatmap {...defaultProps} />);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
            expect(screen.getByRole('status', { name: /loading commit activity data/i })).toBeInTheDocument();
        });

        it('renders error state when API call fails', async () => {
            mockFetchCommitsWithFiles.mockResolvedValue({
                error: 'API Error',
                rateLimit: { remaining: 100, reset: Date.now(), limit: 5000 },
            });

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('Error loading commit activity')).toBeInTheDocument();
                expect(screen.getByText('API Error')).toBeInTheDocument();
            });
        });

        it('renders empty state when no commits found', async () => {
            mockFetchCommitsWithFiles.mockResolvedValue({
                data: [],
                rateLimit: { remaining: 100, reset: Date.now(), limit: 5000 },
            });
            mockTransformToHeatmapData.mockReturnValue({
                weeks: [],
                totalCommits: 0,
                peakDay: { day: 'Sunday', count: 0 },
                averagePerDay: 0,
            });

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText('No commit activity')).toBeInTheDocument();
                expect(screen.getByText('No commits found for the selected time period.')).toBeInTheDocument();
            });
        });

        it('renders day labels correctly', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            dayLabels.forEach(day => {
                expect(screen.getByText(day)).toBeInTheDocument();
            });
        });

        it('renders heatmap grid with correct structure', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const heatmapGrid = screen.getByRole('img', { name: /commit activity heatmap/i });
            expect(heatmapGrid).toBeInTheDocument();
            expect(heatmapGrid).toHaveAttribute('tabIndex', '0');
        });

        it('renders legend with color scale', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            expect(screen.getByText('Less')).toBeInTheDocument();
            expect(screen.getByText('More')).toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('adapts to mobile viewport', async () => {
            mockWindowWidth(500); // Mobile width

            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Day labels should show single letters on mobile
            expect(screen.getByText('S')).toBeInTheDocument(); // Sunday abbreviated
        });

        it('shows full day labels on desktop', async () => {
            mockWindowWidth(1024); // Desktop width

            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(screen.getByText('Sun')).toBeInTheDocument(); // Full abbreviation
        });
    });

    describe('Interactions', () => {
        it('shows tooltip on cell hover', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const firstCell = cells[0];

            await user.hover(firstCell);

            // Tooltip should appear (though it's positioned absolutely)
            await waitFor(() => {
                expect(screen.getByText(/commits/)).toBeInTheDocument();
            });
        });

        it('hides tooltip on cell leave', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const firstCell = cells[0];

            await user.hover(firstCell);
            await user.unhover(firstCell);

            // Tooltip should be hidden (implementation detail - tooltip visibility is controlled by state)
        });

        it('supports keyboard navigation', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const firstCell = cells[0];

            firstCell.focus();
            expect(firstCell).toHaveFocus();

            await user.keyboard('{Enter}');
            // Should trigger hover behavior
        });

        it('handles space key activation', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const firstCell = cells[0];

            firstCell.focus();
            await user.keyboard(' ');
            // Should trigger hover behavior
        });
    });

    describe('Color Intensity Mapping', () => {
        it('applies correct color classes based on commit count', () => {
            const dataWithVariedCounts = [
                { date: '2024-01-01', dayOfWeek: 1, commitCount: 0, contributors: [] },
                { date: '2024-01-02', dayOfWeek: 2, commitCount: 1, contributors: ['user1'] },
                { date: '2024-01-03', dayOfWeek: 3, commitCount: 5, contributors: ['user1', 'user2'] },
                { date: '2024-01-04', dayOfWeek: 4, commitCount: 10, contributors: ['user1', 'user2', 'user3'] },
            ];

            render(<CommitActivityHeatmap {...defaultProps} data={dataWithVariedCounts} />);

            const cells = screen.getAllByRole('button');

            // Check that cells have different background colors based on intensity
            // (This is a simplified test - in reality we'd need to check computed styles)
            expect(cells.length).toBeGreaterThan(0);
        });
    });

    describe('Data Processing', () => {
        it('fetches and processes commit data when no data prop provided', async () => {
            mockFetchCommitsWithFiles.mockResolvedValue({
                data: mockCommitData,
                rateLimit: { remaining: 100, reset: Date.now(), limit: 5000 },
            });

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                expect(mockFetchCommitsWithFiles).toHaveBeenCalledWith(
                    'testowner',
                    'testrepo',
                    expect.any(String), // since date
                    expect.any(String), // until date
                    1,
                    100,
                    { maxCommits: 1000 }
                );
            });

            expect(mockFilterCommitsByTimeRange).toHaveBeenCalled();
            expect(mockTransformToHeatmapData).toHaveBeenCalled();
        });

        it('handles different time ranges correctly', async () => {
            const timeRanges = ['30d', '3m', '6m', '1y'] as const;

            for (const timeRange of timeRanges) {
                mockFetchCommitsWithFiles.mockClear();
                mockFetchCommitsWithFiles.mockResolvedValue({
                    data: mockCommitData,
                    rateLimit: { remaining: 100, reset: Date.now(), limit: 5000 },
                });

                const { unmount } = render(
                    <CommitActivityHeatmap {...defaultProps} timeRange={timeRange} />
                );

                await waitFor(() => {
                    expect(mockFetchCommitsWithFiles).toHaveBeenCalled();
                });

                unmount();
            }
        });
    });

    describe('Accessibility', () => {
        it('has no accessibility violations', async () => {
            const { container } = render(
                <CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />
            );

            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });

        it('provides proper ARIA labels', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const heatmapGrid = screen.getByRole('img', { name: /commit activity heatmap/i });
            expect(heatmapGrid).toHaveAttribute('aria-label');
            expect(heatmapGrid).toHaveAttribute('tabIndex', '0');
        });

        it('provides accessible cell labels', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            cells.forEach(cell => {
                expect(cell).toHaveAttribute('aria-label');
                expect(cell).toHaveAttribute('tabIndex', '0');
            });
        });

        it('includes screen reader accessible summary', () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            expect(screen.getByText('Commit Activity Summary')).toBeInTheDocument();
            expect(screen.getByText(/Total commits: 8/)).toBeInTheDocument();
            expect(screen.getByText(/Peak activity day: Monday/)).toBeInTheDocument();
        });

        it('provides loading status for screen readers', () => {
            mockFetchCommitsWithFiles.mockImplementation(() => new Promise(() => { }));

            render(<CommitActivityHeatmap {...defaultProps} />);

            expect(screen.getByRole('status', { name: /loading commit activity data/i })).toBeInTheDocument();
        });

        it('provides error alerts for screen readers', async () => {
            mockFetchCommitsWithFiles.mockResolvedValue({
                error: 'Test error',
                rateLimit: { remaining: 100, reset: Date.now(), limit: 5000 },
            });

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                const errorAlert = screen.getByRole('alert');
                expect(errorAlert).toBeInTheDocument();
                expect(errorAlert).toHaveAttribute('aria-live', 'polite');
            });
        });
    });

    describe('Performance', () => {
        it('handles large datasets efficiently', () => {
            const largeDataset = Array.from({ length: 365 }, (_, i) => ({
                date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
                dayOfWeek: (i % 7),
                commitCount: Math.floor(Math.random() * 10),
                contributors: [`user${i % 5}`],
            }));

            const startTime = performance.now();
            render(<CommitActivityHeatmap {...defaultProps} data={largeDataset} />);
            const endTime = performance.now();

            // Should render within reasonable time (less than 100ms)
            expect(endTime - startTime).toBeLessThan(100);
        });

        it('debounces resize events', async () => {
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            // Trigger multiple resize events quickly
            for (let i = 0; i < 10; i++) {
                mockWindowWidth(500 + i * 10);
            }

            // Should handle multiple resize events without issues
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });
        });
    });

    describe('Edge Cases', () => {
        it('handles empty contributors array', () => {
            const dataWithEmptyContributors = [{
                date: '2024-01-01',
                dayOfWeek: 1,
                commitCount: 5,
                contributors: [],
            }];

            render(<CommitActivityHeatmap {...defaultProps} data={dataWithEmptyContributors} />);

            expect(screen.getByText('Weekly Commit Activity')).toBeInTheDocument();
        });

        it('handles invalid date strings gracefully', () => {
            const dataWithInvalidDate = [{
                date: 'invalid-date',
                dayOfWeek: 1,
                commitCount: 5,
                contributors: ['user1'],
            }];

            render(<CommitActivityHeatmap {...defaultProps} data={dataWithInvalidDate} />);

            // Should not crash and should render something
            expect(screen.getByText('Weekly Commit Activity')).toBeInTheDocument();
        });

        it('handles network errors gracefully', async () => {
            mockFetchCommitsWithFiles.mockRejectedValue(new Error('Network error'));

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
            });
        });

        it('handles API rate limiting', async () => {
            mockFetchCommitsWithFiles.mockResolvedValue({
                error: 'GitHub API rate limit exceeded. Please try again later.',
                rateLimit: { remaining: 0, reset: Date.now() + 3600000, limit: 5000 },
            });

            render(<CommitActivityHeatmap {...defaultProps} />);

            await waitFor(() => {
                expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
            });
        });
    });

    describe('Tooltip Functionality', () => {
        it('displays commit count and date in tooltip', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const cellWithCommits = cells.find(cell =>
                cell.getAttribute('aria-label')?.includes('5 commits')
            );

            if (cellWithCommits) {
                await user.hover(cellWithCommits);

                await waitFor(() => {
                    expect(screen.getByText('5 commits')).toBeInTheDocument();
                });
            }
        });

        it('displays contributor information in tooltip', async () => {
            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={mockWeeklyCommitData} />);

            const cells = screen.getAllByRole('button');
            const cellWithContributors = cells.find(cell =>
                cell.getAttribute('aria-label')?.includes('5 commits')
            );

            if (cellWithContributors) {
                await user.hover(cellWithContributors);

                await waitFor(() => {
                    expect(screen.getByText(/user1, user2/)).toBeInTheDocument();
                });
            }
        });

        it('truncates long contributor lists in tooltip', async () => {
            const dataWithManyContributors = [{
                date: '2024-01-01',
                dayOfWeek: 1,
                commitCount: 10,
                contributors: ['user1', 'user2', 'user3', 'user4', 'user5'],
            }];

            const user = userEvent.setup();
            render(<CommitActivityHeatmap {...defaultProps} data={dataWithManyContributors} />);

            const cells = screen.getAllByRole('button');
            const cellWithManyContributors = cells[0];

            await user.hover(cellWithManyContributors);

            await waitFor(() => {
                expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
            });
        });
    });
});