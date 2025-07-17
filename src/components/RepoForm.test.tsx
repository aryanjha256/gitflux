import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoForm } from './RepoForm';

// Mock Next.js router
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

describe('RepoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders form with input and submit button', () => {
      render(<RepoForm />);
      
      expect(screen.getByLabelText(/github repository url/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/github\.com\/owner\/repository/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze repository/i })).toBeInTheDocument();
    });

    it('renders with initial values when provided', () => {
      render(<RepoForm initialOwner="facebook" initialRepo="react" />);
      
      const input = screen.getByDisplayValue('https://github.com/facebook/react');
      expect(input).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      expect(input).toHaveAttribute('id', 'github-url');
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('URL Validation', () => {
    it('shows error for empty input', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a github repository url/i)).toBeInTheDocument();
    });

    it('shows error for invalid URL format', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'invalid-url');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
    });

    it('shows error for invalid owner name format', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/-invalid/repo');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/invalid owner name format/i)).toBeInTheDocument();
    });

    it('shows error for invalid repository name format', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/owner/repo with spaces');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/invalid repository name format/i)).toBeInTheDocument();
    });

    it('displays error with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      const input = screen.getByLabelText(/github repository url/i);
      const errorMessage = screen.getByRole('alert');
      
      expect(input).toHaveAttribute('aria-describedby', 'url-error');
      expect(errorMessage).toHaveAttribute('id', 'url-error');
    });
  });

  describe('URL Parsing', () => {
    const validUrls = [
      { input: 'https://github.com/facebook/react', owner: 'facebook', repo: 'react' },
      { input: 'http://github.com/microsoft/vscode', owner: 'microsoft', repo: 'vscode' },
      { input: 'github.com/vercel/next.js', owner: 'vercel', repo: 'next.js' },
      { input: 'owner/repository', owner: 'owner', repo: 'repository' },
      { input: 'https://github.com/user/repo.git', owner: 'user', repo: 'repo' },
      { input: 'github.com/test-user/test-repo/', owner: 'test-user', repo: 'test-repo' },
    ];

    validUrls.forEach(({ input, owner, repo }) => {
      it(`parses ${input} correctly`, async () => {
        const user = userEvent.setup();
        render(<RepoForm />);
        
        const inputField = screen.getByLabelText(/github repository url/i);
        await user.type(inputField, input);
        
        const submitButton = screen.getByRole('button', { name: /analyze repository/i });
        await user.click(submitButton);
        
        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith(`/analyze/${owner}/${repo}`);
        });
      });
    });

    it('handles URLs with trailing whitespace', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, '  github.com/owner/repo  ');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/owner/repo');
      });
    });
  });

  describe('Form Submission', () => {
    it('navigates to analysis page on successful submission', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('calls custom onSubmit handler when provided', async () => {
      const mockOnSubmit = vi.fn();
      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/owner/repo');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('owner', 'repo');
      });
      
      // Should not navigate when custom handler is provided
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      // Create a custom onSubmit that introduces a delay to test loading state
      const mockOnSubmit = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      
      // Start the click and immediately check for loading state
      const clickPromise = user.click(submitButton);
      
      // Wait for loading state to appear
      await waitFor(() => {
        expect(screen.getByText(/analyzing\.\.\./i)).toBeInTheDocument();
      }, { timeout: 1000 });
      
      expect(submitButton).toBeDisabled();
      expect(input).toBeDisabled();
      
      // Wait for the click to complete
      await clickPromise;
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith('facebook', 'react');
      });
    });

    it('prevents form submission when already loading', async () => {
      // Create a custom onSubmit that introduces a delay to test loading prevention
      const mockOnSubmit = vi.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      
      // Start first submission
      const firstClickPromise = user.click(submitButton);
      
      // Wait for loading state to appear
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      }, { timeout: 1000 });
      
      // Try to submit again while loading - this should be prevented by disabled state
      await user.click(submitButton);
      
      // Wait for the first click to complete
      await firstClickPromise;
      
      // Wait for the first submission to complete
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('clears previous errors on new submission', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      // First submission with invalid URL
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'invalid');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      expect(screen.getByText(/please enter a valid github repository url/i)).toBeInTheDocument();
      
      // Clear input and enter valid URL
      await user.clear(input);
      await user.type(input, 'github.com/facebook/react');
      await user.click(submitButton);
      
      // Error should be cleared
      expect(screen.queryByText(/please enter a valid github repository url/i)).not.toBeInTheDocument();
    });

    it('handles submission errors gracefully', async () => {
      const mockOnSubmit = vi.fn().mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const user = userEvent.setup();
      render(<RepoForm onSubmit={mockOnSubmit} />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/owner/repo');
      
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/an error occurred while processing the url/i)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports form submission via Enter key', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      await user.type(input, 'github.com/facebook/react');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/analyze/facebook/react');
      });
    });

    it('maintains focus management during validation errors', async () => {
      const user = userEvent.setup();
      render(<RepoForm />);
      
      const input = screen.getByLabelText(/github repository url/i);
      const submitButton = screen.getByRole('button', { name: /analyze repository/i });
      
      await user.click(submitButton);
      
      // Input should still be focusable after validation error
      await user.click(input);
      expect(input).toHaveFocus();
    });
  });
});