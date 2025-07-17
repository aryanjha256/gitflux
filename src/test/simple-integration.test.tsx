import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Simple component for testing
function TestComponent() {
  return <div>Hello World</div>;
}

describe('Simple Integration Test', () => {
  it('renders a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});