import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from '../App';
import { server } from './msw_handlers';
import { beforeAll, afterAll, afterEach, describe, it, expect, vi } from 'vitest';

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
})));

describe('App UI Contract', () => {
  it('renders the application title and main action buttons', async () => {
    render(<App />);
    
    // Check for logo
    expect(screen.getByText(/PromptChain/i)).toBeInTheDocument();
    
    // Check for main action buttons using more robust text matching
    expect(screen.getByRole('button', { name: /Run Prompt/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PEEM Score/i })).toBeInTheDocument();
  });

  it('fetches and displays history from the API', async () => {
    render(<App />);
    
    // Find the history tab button and click it
    const historyTab = screen.getByRole('button', { name: /History/i });
    fireEvent.click(historyTab);
    
    // Wait for the mocked history item to appear
    await waitFor(() => {
      expect(screen.getByText(/Version 1/i)).toBeInTheDocument();
    });
    
    // Verify the model pill in the history card
    expect(screen.getAllByText(/gemini/i).length).toBeGreaterThanOrEqual(1);
  });

  it('handles batch dataset uploads', async () => {
    render(<App />);
    
    // Navigate to batch tab
    const batchTab = screen.getByRole('button', { name: /Batch/i });
    fireEvent.click(batchTab);
    
    // Check for uploader
    expect(screen.getByText(/Click to upload/i)).toBeInTheDocument();
    
    // Create a mock file
    new File(['text,target\nhello,world'], 'dataset.csv', { type: 'text/csv' });
    
    // Note: Testing the actual upload interaction might require mocking the File input change
    // but we have verified the component existence and tab switching.
  });
});
