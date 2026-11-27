import {
  Box,
  ClipboardList,
  Compass,
  DoorClosed,
  DoorOpen,
  DraftingCompass,
  Eye,
  EyeOff,
  FolderOpen,
  Layers,
  Magnet,
  Redo2,
  Ruler,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useDesignStore } from '../../store/useDesignStore'
import type { CameraPreset } from '../../types/furniture'

interface TopToolbarProps {
  onOpenDesignsModal: () => void
  onOpenWorkshopReport: () => void
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
  onOpenWorkshopReport,
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

  const toolMode = useDesignStore((s) => s.toolMode)
  const setToolMode = useDesignStore((s) => s.setToolMode)
  const guidesCount = useDesignStore((s) => s.guides.length)
  const guidesVisible = useDesignStore((s) => s.guidesVisible)
  const toggleGuidesVisible = useDesignStore((s) => s.toggleGuidesVisible)
  const clearAllGuides = useDesignStore((s) => s.clearAllGuides)

  const interfacesOpen = useDesignStore((s) => s.interfacesOpen)
  const toggleInterfacesOpen = useDesignStore((s) => s.toggleInterfacesOpen)

  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const toggleInterfacesHidden = useDesignStore((s) => s.toggleInterfacesHidden)

  const showDimensions = useDesignStore((s) => s.showDimensions)
  const toggleShowDimensions = useDesignStore((s) => s.toggleShowDimensions)

  const cameraPreset = useDesignStore((s) => s.cameraPreset)
  const setCameraPreset = useDesignStore((s) => s.setCameraPreset)
  const currentDesignName = useDesignStore((s) => s.currentDesignName)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)

  return (
    <header className="z-30 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2 backdrop-blur-md">
      {/* الشعار واسم التصميم + زر قائمة الألواح للشاشات المتوسطة والصغيرة */}
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
          <span className="hidden sm:inline">الأجزاء</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Box className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-slate-100 sm:text-base">
              مصمم أثاث الكونتر 3D
            </h1>
            <p className="max-w-[140px] truncate text-xs text-slate-400 sm:max-w-[180px]">
              {currentDesignName}
            </p>
          </div>
        </div>
      </div>

      {/* أزرار الكاميرا + المتر والعلام + أدوات المعاينة */}
      <div className="order-3 flex w-full flex-wrap items-center justify-center gap-1.5 pt-1 xl:order-2 xl:w-auto xl:pt-0">
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
          <span className="hidden items-center gap-1 px-2 text-xs text-slate-400 md:flex">
            <Compass className="h-3.5 w-3.5" />
          </span>
          {CAMERA_BUTTONS.map((btn) => {
            const active = cameraPreset === btn.preset
            return (
              <button
                key={btn.preset}
                type="button"
                onClick={() => setCameraPreset(btn.preset)}
                className={`h-9 min-w-[44px] rounded-lg px-2.5 text-xs font-bold transition ${
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

        {/* زر أداة المتر / العلام + أزرار إدارة العلامات */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setToolMode(toolMode === 'tape' ? 'select' : 'tape')}
            className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
              toolMode === 'tape'
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
            }`}
            title="أداة المتر والخطوط الإرشادية (وضع العلام والقياس)"
          >
            <Ruler className="h-4 w-4 text-cyan-300" />
            <span>المتر / العلام</span>
          </button>

          {guidesCount > 0 && (
            <>
              <button
                type="button"
                onClick={toggleGuidesVisible}
                className={`flex h-11 items-center gap-1 rounded-xl border px-2.5 text-xs font-bold transition ${
                  guidesVisible
                    ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                    : 'border-slate-700 bg-slate-800/80 text-slate-400'
                }`}
                title={guidesVisible ? 'إخفاء العلامات مؤقتاً' : 'إظهار العلامات'}
              >
                {guidesVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                <span className="tabular-nums">{guidesCount}</span>
              </button>

              <button
                type="button"
                onClick={clearAllGuides}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                title="مسح كل العلامات"
                aria-label="مسح كل العلامات"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* فتح / إغلاق الضلف والأدراج */}
        <button
          type="button"
          onClick={toggleInterfacesOpen}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
            interfacesOpen
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-200'
              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
          title="فتح أو إغلاق الضلف والأدراج لمعاينة الداخل"
        >
          {interfacesOpen ? (
            <DoorOpen className="h-4 w-4 text-amber-400" />
          ) : (
            <DoorClosed className="h-4 w-4 text-slate-400" />
          )}
          <span className="hidden sm:inline">
            {interfacesOpen ? 'إغلاق الواجهات' : 'فتح الواجهات'}
          </span>
        </button>

        {/* إخفاء الضلف والأدراج مؤقتاً */}
        <button
          type="button"
          onClick={toggleInterfacesHidden}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
            interfacesHidden
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
          }`}
          title="إخفاء الضلف والأدراج مؤقتاً لتعديل الأرفف الداخلية"
        >
          {interfacesHidden ? (
            <EyeOff className="h-4 w-4 text-violet-300" />
          ) : (
            <Eye className="h-4 w-4 text-slate-400" />
          )}
          <span className="hidden md:inline">
            {interfacesHidden ? 'إظهار الضلف' : 'إخفاء الضلف'}
          </span>
        </button>

        {/* إظهار / إخفاء المقاسات 3D */}
        <button
          type="button"
          onClick={toggleShowDimensions}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
            showDimensions
              ? 'border-sky-500/60 bg-sky-500/15 text-sky-200'
              : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="إظهار أو إخفاء خطوط المقاسات ثلاثية الأبعاد"
        >
          <DraftingCompass className="h-4 w-4" />
          <span className="hidden sm:inline">المقاسات</span>
        </button>

        {/* زر المغناطيس الذكي */}
        <button
          type="button"
          onClick={() => setSnappingEnabled(!snappingEnabled)}
          className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${
            snappingEnabled
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-slate-200'
          }`}
          title="تفعيل أو إيقاف المغناطيس الذكي (0.5 سم + الالتصاق بالأسطح والعلامات)"
        >
          <Magnet className="h-4 w-4" />
          <span className="hidden sm:inline">المغناطيس</span>
        </button>
      </div>

      {/* التراجع والإعادة والحفظ وتقرير الورشة */}
      <div className="order-2 flex items-center gap-1.5 xl:order-3">
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
          onClick={onOpenWorkshopReport}
          className="flex h-11 items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.98] sm:text-sm"
          title="تقرير الورشة وكشف التقطيع ورص الألواح"
        >
          <ClipboardList className="h-4 w-4 text-emerald-300" />
          <span className="hidden md:inline">تقرير الورشة / التقطيع</span>
          <span className="md:hidden">التقطيع</span>
        </button>

        <button
          type="button"
          onClick={onOpenDesignsModal}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] sm:text-sm"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">حفظ</span>
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
          title="خصائص العنصر المحدد"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {selectedPanelIds.length > 0 && (
            <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900" />
          )}
        </button>
      </div>
    </header>
  )
}
