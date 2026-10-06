import React from 'react';

interface HistoryNavigationControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  breadcrumbs?: string[];
}

export const HistoryNavigationControls: React.FC<HistoryNavigationControlsProps> = ({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  breadcrumbs = [],
}) => {
  return (
    <div className="flex items-center gap-2 sm:gap-3 py-1">
      {/* Nút Lùi và Tiến */}
      <div className="flex items-center gap-1 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 shadow-sm">
        <button
          type="button"
          onClick={onGoBack}
          disabled={!canGoBack}
          title={canGoBack ? 'Quay lại màn hình trước' : 'Không có trang trước'}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
            canGoBack
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 active:scale-95'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          }`}
          aria-label="Quay lại"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onGoForward}
          disabled={!canGoForward}
          title={canGoForward ? 'Tiến tới màn hình tiếp theo' : 'Không có trang sau'}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center ${
            canGoForward
              ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 active:scale-95'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          }`}
          aria-label="Tiến tới"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Thanh Breadcrumbs điều hướng trực quan */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto whitespace-nowrap">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span
                  className={`${
                    isLast
                      ? 'font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]'
                      : 'hover:text-slate-700 dark:hover:text-slate-300 truncate max-w-[150px]'
                  }`}
                >
                  {crumb}
                </span>
              </React.Fragment>
            );
          })}
        </nav>
      )}
    </div>
  );
};
