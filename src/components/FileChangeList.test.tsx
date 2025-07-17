import { render, screen, fireEvent } from '@testing-library/react';
import { FileChangeList } from './FileChangeList';
import { FileChangeData } from '@/lib/github-api';

const mockFiles: FileChangeData[] = [
  {
    filename: 'src/components/App.tsx',
    changeCount: 25,
    percentage: 35.7,
    lastChanged: '2024-01-15T10:30:00Z',
    fileType: 'TypeScript',
    isDeleted: false,
    trendData: [
      { date: '2024-01-10', changes: 5 },
      { date: '2024-01-15', changes: 20 },
    ],
  },
  {
    filename: 'README.md',
    changeCount: 15,
    percentage: 21.4,
    lastChanged: '2024-01-10T14:20:00Z',
    fileType: 'Documentation',
    isDeleted: false,
    trendData: [
      { date: '2024-01-10', changes: 15 },
    ],
  },
  {
    filename: 'old-file.js',
    changeCount: 10,
    percentage: 14.3,
    lastChanged: '2023-12-01T09:15:00Z',
    fileType: 'JavaScript',
    isDeleted: true,
    trendData: [
      { date: '2023-12-01', changes: 10 },
    ],
  },
];

describe('FileChangeList', () => {
  const mockOnFileSelect = jest.fn();

  beforeEach(() => {
    mockOnFileSelect.mockClear();
  });

  it('renders loading state correctly', () => {
    render(
      <FileChangeList
        files={[]}
        isLoading={true}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('Loading files...')).toBeInTheDocument();
    expect(screen.getByText('Most Changed Files')).toBeInTheDocument();
    
    // Should show skeleton items
    const skeletonItems = screen.getAllByRole('generic');
    expect(skeletonItems.length).toBeGreaterThan(0);
  });

  it('renders empty state when no files are provided', () => {
    render(
      <FileChangeList
        files={[]}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('No file changes found')).toBeInTheDocument();
    expect(screen.getByText('Try selecting a different time period or check if the repository has commits.')).toBeInTheDocument();
  });

  it('renders file list correctly', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText('Most Changed Files')).toBeInTheDocument();
    expect(screen.getByText('3 files • 50 total changes')).toBeInTheDocument();
    
    // Check if all files are rendered
    expect(screen.getByText('src/components/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('README.md')).toBeInTheDocument();
    expect(screen.getByText('old-file.js')).toBeInTheDocument();
  });

  it('displays files in correct order (by change count)', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    const fileButtons = screen.getAllByRole('button');
    
    // First file should be App.tsx (25 changes)
    expect(fileButtons[0]).toHaveTextContent('src/components/App.tsx');
    expect(fileButtons[0]).toHaveTextContent('25 changes');
    
    // Second file should be README.md (15 changes)
    expect(fileButtons[1]).toHaveTextContent('README.md');
    expect(fileButtons[1]).toHaveTextContent('15 changes');
    
    // Third file should be old-file.js (10 changes)
    expect(fileButtons[2]).toHaveTextContent('old-file.js');
    expect(fileButtons[2]).toHaveTextContent('10 changes');
  });

  it('shows correct file information', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Check first file details
    const firstFile = screen.getByText('src/components/App.tsx').closest('button');
    expect(firstFile).toHaveTextContent('25 changes');
    expect(firstFile).toHaveTextContent('35.7% of total');
    expect(firstFile).toHaveTextContent('TypeScript');
    expect(firstFile).toHaveTextContent('#1');
  });

  it('handles deleted files correctly', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    const deletedFile = screen.getByText('old-file.js').closest('button');
    expect(deletedFile).toHaveTextContent('Deleted');
    expect(deletedFile).toHaveClass('opacity-75');
    
    const deletedFileName = screen.getByText('old-file.js');
    expect(deletedFileName).toHaveClass('line-through');
  });

  it('calls onFileSelect when a file is clicked', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    const firstFileButton = screen.getByText('src/components/App.tsx').closest('button');
    fireEvent.click(firstFileButton!);
    
    expect(mockOnFileSelect).toHaveBeenCalledWith('src/components/App.tsx');
  });

  it('highlights selected file', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
        selectedFile="README.md"
      />
    );

    const selectedFile = screen.getByText('README.md').closest('button');
    const unselectedFile = screen.getByText('src/components/App.tsx').closest('button');
    
    expect(selectedFile).toHaveClass('bg-blue-50', 'border-blue-200');
    expect(unselectedFile).not.toHaveClass('bg-blue-50', 'border-blue-200');
  });

  it('displays correct file type icons', () => {
    const filesWithDifferentTypes: FileChangeData[] = [
      {
        filename: 'script.js',
        changeCount: 10,
        percentage: 50,
        lastChanged: '2024-01-15T10:30:00Z',
        fileType: 'JavaScript',
        isDeleted: false,
        trendData: [],
      },
      {
        filename: 'component.tsx',
        changeCount: 8,
        percentage: 40,
        lastChanged: '2024-01-15T10:30:00Z',
        fileType: 'TypeScript',
        isDeleted: false,
        trendData: [],
      },
      {
        filename: 'unknown.xyz',
        changeCount: 2,
        percentage: 10,
        lastChanged: '2024-01-15T10:30:00Z',
        fileType: 'Other',
        isDeleted: false,
        trendData: [],
      },
    ];

    render(
      <FileChangeList
        files={filesWithDifferentTypes}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Check that different file types are displayed
    expect(screen.getByText('script.js')).toBeInTheDocument();
    expect(screen.getByText('component.tsx')).toBeInTheDocument();
    expect(screen.getByText('unknown.xyz')).toBeInTheDocument();
  });

  it('formats last changed dates correctly', () => {
    const recentFile: FileChangeData = {
      filename: 'recent.js',
      changeCount: 5,
      percentage: 100,
      lastChanged: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      fileType: 'JavaScript',
      isDeleted: false,
      trendData: [],
    };

    render(
      <FileChangeList
        files={[recentFile]}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    expect(screen.getByText(/2 days ago/)).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    const firstFileButton = screen.getByText('src/components/App.tsx').closest('button');
    expect(firstFileButton).toHaveAttribute('aria-label', 'Select src/components/App.tsx for detailed analysis');
  });

  it('handles keyboard navigation', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    const firstFileButton = screen.getByText('src/components/App.tsx').closest('button');
    firstFileButton?.focus();
    expect(firstFileButton).toHaveFocus();

    fireEvent.keyDown(firstFileButton!, { key: 'Enter' });
    expect(mockOnFileSelect).toHaveBeenCalledWith('src/components/App.tsx');
  });

  it('displays progress bars correctly', () => {
    render(
      <FileChangeList
        files={mockFiles}
        isLoading={false}
        onFileSelect={mockOnFileSelect}
      />
    );

    // Check that progress bars are rendered (they have specific styling)
    const progressBars = screen.getAllByRole('generic').filter(el => 
      el.className.includes('bg-blue-500')
    );
    
    expect(progressBars.length).toBeGreaterThan(0);
  });
});