import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', toError(error), info.componentStack);
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-lg w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            This part of the app hit an error. The rest of the app is still running.
          </p>
          <button
            type="button"
            onClick={this.resetError}
            className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);