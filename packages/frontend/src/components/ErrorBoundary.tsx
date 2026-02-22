'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Sentry integration
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs')
        .then((Sentry) => {
          Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
        })
        .catch(() => {});
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 text-6xl">😔</div>
          <h2 className="mb-3 text-2xl font-bold text-slate-800">Что-то пошло не так</h2>
          <p className="mb-6 max-w-md text-slate-500">
            Произошла непредвиденная ошибка. Попробуйте обновить страницу или вернуться на главную.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-700 hover:shadow-lg"
            >
              Обновить страницу
            </button>
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              На главную
            </a>
          </div>
          <a href="/help" className="mt-4 text-sm text-slate-400 underline hover:text-slate-600">
            Связаться с поддержкой
          </a>
        </div>
      );
    }

    return this.props.children;
  }
}
