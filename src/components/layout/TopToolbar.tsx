import {
  Box,
  Compass,
  FolderOpen,
  Layers,
  Magnet,
  Redo2,
  Save,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react'
import { useDesignStore } from '../../store/useDesignStore'
import type { CameraPreset } from '../../types/furniture'

interface TopToolbarProps {
  onOpenDesignsModal: () => void
  onTogglePartsDrawer: () => void
  onTogglePropsDrawer: () => void
  isPartsOpen: boolean
  isPropsOpen: boolean
}

const CAMERA_BUTTONS: { preset: CameraPreset; label: string }[] = [
  { preset: 'perspective', label: '3D' },
  { preset: 'front', label: 'أمامي' },
  { preset: 'side', label: 'جانبي' },
  { preset: 'top', label: 'علوي' },
]

export function TopToolbar({
  onOpenDesignsModal,
  onTogglePartsDrawer,
  onTogglePropsDrawer,
  isPartsOpen,
  isPropsOpen,
}: TopToolbarProps) {
  const pastCount = useDesignStore((s) => s.past.length)
  const futureCount = useDesignStore((s) => s.future.length)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)

  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const setSnappingEnabled = useDesignStore((s) => s.setSnappingEnabled)

  const cameraPreset = useDesignStore((s) => s.cameraPreset)
  const setCameraPreset = useDesignStore((s) => s.setCameraPreset)
  const currentDesignName = useDesignStore((s) => s.currentDesignName)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)

  return (
    <header className="z-30 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2 backdrop-blur-md">
      {/* الشعار واسم التصميم + أزرار القوائم للشاشات المتوسطة والصغيرة */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePartsDrawer}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition lg:hidden ${
            isPartsOpen
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
          }`}
          title="الأجزاء والقطع"
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">الألواح</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Box className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-slate-100 sm:text-base">
              مصمم أثاث الكونتر 3D
            </h1>
            <p className="max-w-[140px] truncate text-xs text-slate-400 sm:max-w-[220px]">
              {currentDesignName}
            </p>
          </div>
        </div>
      </div>

      {/* أزرار الكاميرا السريعة */}
      <div className="order-3 flex w-full items-center justify-between gap-2 pt-1 sm:order-2 sm:w-auto sm:justify-center sm:pt-0">
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <span className="hidden items-center gap-1 px-2 text-xs text-slate-400 md:flex">
            <Compass className="h-3.5 w-3.5" />
            المنظور
          </span>
          {CAMERA_BUTTONS.map((btn) => {
            const active = cameraPreset === btn.preset
            return (
              <button
                key={btn.preset}
                type="button"
                onClick={() => setCameraPreset(btn.preset)}
                className={`h-9 min-w-[48px] rounded-lg px-2.5 text-xs font-bold transition sm:text-sm ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {btn.label}
              </button>
            )
          })}
        </div>

        {/* زر المغناطيس الذكي */}
        <button
          type="button"
          onClick={() => setSnappingEnabled(!snappingEnabled)}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition sm:text-sm ${
            snappingEnabled
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="تفعيل أو إيقاف المغناطيس الذكي (0.5 سم + التصاق بالأسطح)"
        >
          <Magnet className="h-4 w-4" />
          <span>المغناطيس</span>
        </button>
      </div>

      {/* التراجع والإعادة والحفظ */}
      <div className="order-2 flex items-center gap-1.5 sm:order-3">
        <button
          type="button"
          onClick={undo}
          disabled={pastCount === 0}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/90 bg-slate-800/80 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
          title="تراجع (Ctrl+Z)"
          aria-label="تراجع"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={futureCount === 0}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700/90 bg-slate-800/80 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
          title="إعادة (Ctrl+Y)"
          aria-label="إعادة"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenDesignsModal}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] sm:text-sm"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">حفظ / التصاميم</span>
          <FolderOpen className="h-4 w-4 sm:hidden" />
        </button>

        <button
          type="button"
          onClick={onTogglePropsDrawer}
          className={`relative flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition lg:hidden ${
            isPropsOpen
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
          }`}
          title="خصائص اللوح المحدد"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {selectedPanelId && (
            <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          )}
        </button>
      </div>
    </header>
  )
}
