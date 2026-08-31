import React, { ErrorInfo } from 'react';
import { ReportProblemModal } from './ReportProblemModal';

export default class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
      isReportModalOpen: false
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in Application:', error, errorInfo);
  }

  public render() {
    const self = this as any;
    if (self.state.hasError) {
      if (self.props.fallback) {
        return self.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100/80">
          <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center max-w-lg mx-auto space-y-4 w-full">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
              !
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">Application Recovery</h2>
              <p className="text-xs text-slate-600">
                A component encountered an issue. You can safely reload the app or report this problem to technical support.
              </p>
            </div>

            {self.state.error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-left overflow-auto max-h-32 text-[11px] font-mono text-rose-700">
                {self.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  self.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="w-full px-4 py-2.5 bg-[#1A5E63] hover:bg-[#154c50] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                ↻ Reload Application
              </button>

              <button
                onClick={() => self.setState({ isReportModalOpen: true })}
                className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                ⚠️ Report This Problem
              </button>
            </div>

            <div className="flex gap-2 justify-center pt-1 border-t border-slate-100">
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('hms_active_tab');
                    sessionStorage.clear();
                  } catch (e) {}
                  window.location.href = '/';
                }}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold text-[11px] transition-all hover:bg-slate-100 rounded-lg"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => {
                  if (confirm('This will clear local temporary session cache. Continue?')) {
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                    } catch (e) {}
                    window.location.href = '/';
                  }
                }}
                className="px-3 py-1.5 text-rose-600 hover:text-rose-700 font-semibold text-[11px] transition-all hover:bg-rose-50 rounded-lg"
              >
                Reset Session Cache
              </button>
            </div>
          </div>

          <ReportProblemModal
            isOpen={self.state.isReportModalOpen}
            onClose={() => self.setState({ isReportModalOpen: false })}
            initialError={self.state.error?.toString()}
            initialCategory="Bug / App Error"
          />
        </div>
      );
    }

    return self.props.children;
  }
}


