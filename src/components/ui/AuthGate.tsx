import { Box, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  hasConfiguredPasswordEnv,
  verifyAndCreateAuthSession,
} from '../../utils/auth'

interface AuthGateProps {
  onAuthenticated: () => void
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const hasConfiguredEnv = hasConfiguredPasswordEnv()

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور أولاً')
      return
    }

    setIsVerifying(true)
    setErrorMsg(null)

    try {
      const ok = await verifyAndCreateAuthSession(password, rememberMe)
      if (!ok) {
        setErrorMsg('كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى')
        setIsVerifying(false)
        return
      }

      setPassword('')
      onAuthenticated()
    } catch {
      setErrorMsg('تعذر التحقق من كلمة المرور، يرجى المحاولة مرة أخرى')
      setIsVerifying(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="relative flex min-h-dvh w-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 text-slate-100"
    >
      {/* إضاءة خلفية هادئة متناسقة مع هوية التطبيق */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800/90 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* شعار واسم التطبيق */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/35 shadow-lg shadow-amber-500/10">
            <Box className="h-8 w-8" />
            <span className="absolute -bottom-1.5 -left-1.5 flex h-7 w-7 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-amber-300 shadow">
              <Lock className="h-3.5 w-3.5" />
            </span>
          </div>

          <h1 className="text-xl font-extrabold tracking-tight text-slate-100 sm:text-2xl">
            مصمم أثاث الكونتر 3D
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            أدخل كلمة المرور لفتح مساحة التصميم الهندسي
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label
              htmlFor="auth-password-input"
              className="mb-2 block text-xs font-bold text-slate-300"
            >
              كلمة المرور
            </label>

            <div className="relative flex items-center">
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errorMsg) setErrorMsg(null)
                }}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                className={`h-12 w-full rounded-2xl border bg-slate-950/80 pr-4 pl-12 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 transition ${
                  errorMsg
                    ? 'border-rose-500/70 focus:border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-700/90 focus:border-amber-500/80 focus:ring-amber-500/20'
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-1 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-3.5 py-2 transition hover:border-slate-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/40"
            />
            <span className="text-xs font-semibold text-slate-200">
              تذكرني على هذا الجهاز
            </span>
          </label>

          <button
            type="submit"
            disabled={isVerifying}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isVerifying ? 'جاري التحقق...' : 'دخول إلى مساحة العمل'}</span>
          </button>
        </form>

        {import.meta.env.DEV && !hasConfiguredEnv && (
          <p className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-[11px] leading-relaxed text-amber-200/90">
            وضع التجربة المحلية نشط (لم يُضبط{' '}
            <code className="font-mono text-amber-300">VITE_APP_PASSWORD</code> في ملف{' '}
            <code className="font-mono text-amber-300">.env</code>). راجع{' '}
            <code className="font-mono text-amber-300">.env.example</code>.
          </p>
        )}
      </div>
    </div>
  )
}
