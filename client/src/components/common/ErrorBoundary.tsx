import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] w-full flex items-center justify-center p-6 bg-[#070B17] text-slate-100">
          <div className="max-w-md w-full p-6 rounded-3xl bg-slate-900/90 border border-rose-500/30 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {this.props.fallbackTitle || 'Đã xảy ra sự cố giao diện'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {this.state.error?.message || 'Một lỗi không mong muốn đã xảy ra khi hiển thị thành phần này.'}
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
