import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
  compact?: boolean
}

interface ErrorBoundaryState {
  error: Error | null
}

function resetLocalStorageAndReload() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  } catch {
    // تجاهل أخطاء الوصول للتخزين المحلي
  }
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear()
    }
  } catch {
    // تجاهل أخطاء الوصول لتخزين الجلسة
  }
  try {
    window.location.reload()
  } catch {
    // fallback no-op
  }
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, title, compact = false } = this.props

    if (!error) {
      return children
    }

    const errorMessage = error.message?.trim() || 'Unknown application error'

    return (
      <div
        dir="rtl"
        className={`flex w-full items-center justify-center bg-slate-950 p-4 text-slate-100 ${
          compact ? 'h-full min-h-[260px]' : 'min-h-dvh w-screen'
        }`}
      >
        <div className="w-full max-w-lg rounded-3xl border border-rose-500/35 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-md sm:p-7">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/35">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-slate-100 sm:text-lg">
                {title ?? 'حدث خطأ غير متوقع أثناء تشغيل التطبيق'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                يمكنك إعادة المحاولة أو إعادة تعيين البيانات المحلية المخزنة لإصلاح أي تعارض
                في بيانات التصفح على هذا الجهاز.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
            <div className="mb-1 text-[11px] font-bold text-slate-400">تفاصيل الخطأ التقنية:</div>
            <pre
              dir="ltr"
              className="max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-rose-300"
            >
              {errorMessage}
            </pre>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={resetLocalStorageAndReload}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 text-xs font-extrabold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-400 active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" />
              <span>إعادة تعيين البيانات المحلية وإعادة التحميل</span>
            </button>

            <button
              type="button"
              onClick={this.handleRetry}
              className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-[0.98]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      </div>
    )
  }
}
