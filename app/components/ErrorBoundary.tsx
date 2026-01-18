"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-camp-cream to-camp-warm flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-camp p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-rose-100 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>

            <h1 className="font-display text-2xl font-bold text-camp-pine mb-3">
              Something went wrong
            </h1>

            <p className="text-camp-bark/70 mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-camp-bark/50 cursor-pointer hover:text-camp-bark">
                  Error details
                </summary>
                <pre className="mt-2 p-3 bg-camp-warm rounded-lg text-xs text-rose-600 overflow-x-auto">
                  {this.state.error.message}
                  {this.state.error.stack && (
                    <>
                      {"\n\n"}
                      {this.state.error.stack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-camp-forest hover:bg-camp-pine text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-camp-sand hover:bg-camp-warm text-camp-bark font-semibold rounded-xl transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
