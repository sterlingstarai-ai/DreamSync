/**
 * 에러 바운더리 컴포넌트
 * React 런타임 에러를 캐치하여 앱 크래시를 방지
 */
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                문제가 발생했어요
              </h1>
              <p className="text-[var(--text-secondary)] text-sm">
                예기치 않은 오류가 발생했습니다. 다시 시도해주세요.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </button>
              <button
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                앱 새로고침
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mt-4">
                <summary className="text-xs text-[var(--text-muted)] cursor-pointer">
                  디버그 정보
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
