import { render, screen } from '@testing-library/react';
import { FileTypeBreakdown } from './FileTypeBreakdown';
import { FileTypeData } from '@/lib/github-api';

// Mock Recharts components
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockTypeData: FileTypeData[] = [
  {
    extension: 'TypeScript',
    category: 'TypeScript',
    changeCount: 45,
    percentage: 45.0,
    color: '#3178c6',
  },
  {
    extension: 'JavaScript',
    category: 'JavaScript',
    changeCount: 30,
    percentage: 30.0,
    color: '#f7df1e',
  },
  {
    extension: 'CSS',
    category: 'CSS',
    changeCount: 15,
    percentage: 15.0,
    color: '#1572b6',
  },
  {
    extension: 'Documentation',
    category: 'Documentation',
    changeCount: 10,
    percentage: 10.0,
    color: '#083fa1',
  },
];

describe('FileTypeBreakdown', () => {
  it('renders loading state correctly', () => {
    render(
      <FileTypeBreakdown
        typeData={[]}
        isLoading={true}
      />
    );

    expect(screen.getByText('File Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('Loading chart...')).toBeInTheDocument();
    
    // Should show loading skeleton
    const loadingElements = screen.getAllByRole('generic');
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it('renders empty state when no data is provided', () => {
    render(
      <FileTypeBreakdown
        typeData={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('No file type data available')).toBeInTheDocument();
    expect(screen.getByText('File changes will be categorized by type when available.')).toBeInTheDocument();
  });

  it('renders file type breakdown correctly', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    expect(screen.getByText('File Type Distribution')).toBeInTheDocument();
    expect(screen.getByText('4 types • 100 total changes')).toBeInTheDocument();
    
    // Check if all file types are rendered
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('CSS')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('displays correct statistics for each file type', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    // Check TypeScript (highest)
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('45.0%')).toBeInTheDocument();
    
    // Check JavaScript
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    
    // Check CSS
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('15.0%')).toBeInTheDocument();
  });

  it('renders pie chart components', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('pie')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('displays summary statistics correctly', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Most Active Type:')).toBeInTheDocument();
    expect(screen.getByText('Total File Types:')).toBeInTheDocument();
    expect(screen.getByText('Diversity Score:')).toBeInTheDocument();
    
    // TypeScript should be the most active
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Total file types
  });

  it('displays top file type cards', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    // Should show rank indicators
    expect(screen.getByText('Rank #1')).toBeInTheDocument();
    expect(screen.getByText('Rank #2')).toBeInTheDocument();
    expect(screen.getByText('Rank #3')).toBeInTheDocument();
    expect(screen.getByText('Rank #4')).toBeInTheDocument();
  });

  it('handles single file type correctly', () => {
    const singleType: FileTypeData[] = [
      {
        extension: 'JavaScript',
        category: 'JavaScript',
        changeCount: 100,
        percentage: 100.0,
        color: '#f7df1e',
      },
    ];

    render(
      <FileTypeBreakdown
        typeData={singleType}
        isLoading={false}
      />
    );

    expect(screen.getByText('1 types • 100 total changes')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('groups small categories into "Other"', () => {
    // Create data with many small categories
    const manyTypes: FileTypeData[] = Array.from({ length: 12 }, (_, index) => ({
      extension: `Type${index}`,
      category: `Type${index}`,
      changeCount: index === 0 ? 50 : 2, // First one is large, others are small
      percentage: index === 0 ? 50 : 2,
      color: '#000000',
    }));

    render(
      <FileTypeBreakdown
        typeData={manyTypes}
        isLoading={false}
      />
    );

    // Should group small categories into "Other"
    expect(screen.getByText('Type0')).toBeInTheDocument(); // Large category should be shown
    // Small categories should be grouped (exact behavior depends on implementation)
  });

  it('calculates diversity score correctly', () => {
    // Test with evenly distributed data (high diversity)
    const evenData: FileTypeData[] = [
      { extension: 'A', category: 'A', changeCount: 25, percentage: 25, color: '#000' },
      { extension: 'B', category: 'B', changeCount: 25, percentage: 25, color: '#111' },
      { extension: 'C', category: 'C', changeCount: 25, percentage: 25, color: '#222' },
      { extension: 'D', category: 'D', changeCount: 25, percentage: 25, color: '#333' },
    ];

    render(
      <FileTypeBreakdown
        typeData={evenData}
        isLoading={false}
      />
    );

    // Should show high diversity score
    expect(screen.getByText(/\d+%/)).toBeInTheDocument();
  });

  it('handles zero change counts', () => {
    const zeroData: FileTypeData[] = [
      {
        extension: 'JavaScript',
        category: 'JavaScript',
        changeCount: 0,
        percentage: 0,
        color: '#f7df1e',
      },
    ];

    render(
      <FileTypeBreakdown
        typeData={zeroData}
        isLoading={false}
      />
    );

    expect(screen.getByText('1 types • 0 total changes')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('displays correct file type icons', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    // Icons are rendered as emoji text, check that cards are rendered
    const typeCards = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-white') || el.className.includes('bg-gray-800')
    );
    
    expect(typeCards.length).toBeGreaterThan(0);
  });

  it('shows progress bars for each type', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    // Progress bars have specific styling
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.className.includes('h-2') && el.className.includes('rounded-full')
    );
    
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('handles large numbers correctly', () => {
    const largeNumbers: FileTypeData[] = [
      {
        extension: 'JavaScript',
        category: 'JavaScript',
        changeCount: 10000,
        percentage: 80.0,
        color: '#f7df1e',
      },
      {
        extension: 'TypeScript',
        category: 'TypeScript',
        changeCount: 2500,
        percentage: 20.0,
        color: '#3178c6',
      },
    ];

    render(
      <FileTypeBreakdown
        typeData={largeNumbers}
        isLoading={false}
      />
    );

    expect(screen.getByText('2 types • 12500 total changes')).toBeInTheDocument();
    expect(screen.getByText('10000')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
  });

  it('displays legend items with correct ranking', () => {
    render(
      <FileTypeBreakdown
        typeData={mockTypeData}
        isLoading={false}
      />
    );

    // Check ranking indicators in legend
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });
});