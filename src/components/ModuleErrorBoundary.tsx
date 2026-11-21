import { Component, type ReactNode } from 'react';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';

interface ModuleErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string;
  onReturnToDashboard?: () => void;
}

interface ModuleErrorBoundaryState {
  hasError: boolean;
}

/**
 * React Error Boundary specifically for lazy-loaded secondary workspace modules.
 * Displays an accessible recovery fallback without exposing raw stack traces or technical details.
 */
export class ModuleErrorBoundary extends Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  state: ModuleErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ModuleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Intentionally suppress raw internal error details in client UI
  }

  componentDidUpdate(prevProps: ModuleErrorBoundaryProps): void {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  private handleReturnToDashboard = (): void => {
    this.setState({ hasError: false });
    this.props.onReturnToDashboard?.();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="rounded-xl bg-white border border-[#FCA5A5] p-8 text-center space-y-4"
      >
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FEF2F2] text-[#991B1B] mx-auto">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold text-[#991B1B]">Unable to load this section</h2>
          <p className="text-sm text-[#4A5B54] max-w-md mx-auto">
            Something went wrong while loading this module. Your air quality monitoring and saved
            preferences remain unaffected.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button
            type="button"
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#11382B] rounded-lg hover:bg-[#174C3A] transition-colors"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          {this.props.onReturnToDashboard && (
            <button
              type="button"
              onClick={this.handleReturnToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#11382B] bg-white border border-[#CBD5D0] rounded-lg hover:bg-[#F2FAF6] transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }
}
