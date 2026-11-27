import {
  Box,
  Camera,
  ChevronDown,
  ClipboardList,
  DoorClosed,
  DoorOpen,
  DraftingCompass,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderOpen,
  ImageDown,
  Images,
  Layers,
  Lock,
  Magnet,
  Maximize2,
  Minimize2,
  Redo2,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  User,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

interface TopToolbarProps {
  onOpenDesignsModal: () => void
  onOpenWorkshopReport: () => void
  onTogglePartsDrawer: () => void
  onTogglePropsDrawer: () => void
  onLockApp: () => void
  isPartsOpen: boolean
  isPropsOpen: boolean
}

export function TopToolbar({
  onOpenDesignsModal,
  onOpenWorkshopReport,
  onTogglePartsDrawer,
  onTogglePropsDrawer,
  onLockApp,
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

  const showHumanReference = useDesignStore((s) => s.showHumanReference)
  const toggleHumanReference = useDesignStore((s) => s.toggleHumanReference)
  const humanScalePreset = useDesignStore((s) => s.humanScalePreset)
  const setHumanScalePreset = useDesignStore((s) => s.setHumanScalePreset)

  const focusMode = useDesignStore((s) => s.focusMode)
  const toggleFocusMode = useDesignStore((s) => s.toggleFocusMode)

  const triggerExportImage = useDesignStore((s) => s.triggerExportImage)
  const isExporting = useDesignStore((s) => s.isExporting)

  const currentDesignName = useDesignStore((s) => s.currentDesignName)
  const hasUnsavedChanges = useDesignStore((s) => s.hasUnsavedChanges)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)

  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!exportMenuOpen) return
    const onOutside = (e: PointerEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', onOutside)
    return () => window.removeEventListener('pointerdown', onOutside)
  }, [exportMenuOpen])

  return (
    <header className="z-30 flex h-[52px] min-h-[52px] items-center justify-between gap-2 border-b border-slate-800/90 bg-slate-900/95 px-2.5 backdrop-blur-md">
      {/* اليمين: قائمة الأجزاء (للموبايل) + اسم المشروع + التراجع والإعادة */}
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onTogglePartsDrawer}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition md:hidden ${
            isPartsOpen
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
          }`}
          title="مكتبة الأجزاء"
          aria-label="مكتبة الأجزاء"
        >
          <Layers className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenDesignsModal}
          className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 text-right transition hover:bg-slate-800/70"
          title={
            hasUnsavedChanges
              ? `${currentDesignName} (توجد تعديلات غير محفوظة — اضغط لفتح المشاريع)`
              : `${currentDesignName} — اضغط لإدارة المشاريع`
          }
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Box className="h-4 w-4" />
          </div>
          <span className="hidden max-w-[130px] truncate text-xs font-bold text-slate-100 sm:inline lg:max-w-[175px]">
            {currentDesignName}
          </span>
          {hasUnsavedChanges && (
            <span
              className="hidden h-2 w-2 shrink-0 rounded-full bg-amber-400 ring-2 ring-amber-400/25 sm:inline-block"
              title="توجد تعديلات غير محفوظة"
            />
          )}
        </button>

        <div className="mx-1 hidden h-5 w-px bg-slate-800 sm:block" />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={undo}
            disabled={pastCount === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/70 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
            title="تراجع (Ctrl+Z)"
            aria-label="تراجع"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={futureCount === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/70 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-35"
            title="إعادة (Ctrl+Y)"
            aria-label="إعادة"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* المنتصف: أدوات التصميم الأساسية كأيقونات نظيفة مع Tooltips */}
      <div className="flex items-center gap-1 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => setSnappingEnabled(!snappingEnabled)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            snappingEnabled
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-400 hover:text-slate-200'
          }`}
          title="المغناطيس الذكي (0.5 سم + الالتصاق بالأسطح والعلامات)"
          aria-label="المغناطيس الذكي"
        >
          <Magnet className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => setToolMode(toolMode === 'tape' ? 'select' : 'tape')}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            toolMode === 'tape'
              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
          }`}
          title="أداة المتر والعلام (عمل خطوط إرشادية وقياس المسافات)"
          aria-label="أداة المتر والعلام"
        >
          <Ruler className="h-4 w-4" />
        </button>

        {guidesCount > 0 && (
          <>
            <button
              type="button"
              onClick={toggleGuidesVisible}
              className={`flex h-9 items-center gap-1 rounded-xl border px-2 text-[11px] font-bold transition ${
                guidesVisible
                  ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                  : 'border-slate-700/80 bg-slate-800/70 text-slate-400'
              }`}
              title={guidesVisible ? 'إخفاء العلامات' : 'إظهار العلامات'}
            >
              {guidesVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span className="tabular-nums">{guidesCount}</span>
            </button>
            <button
              type="button"
              onClick={clearAllGuides}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
              title="مسح كل العلامات"
              aria-label="مسح كل العلامات"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={toggleShowDimensions}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            showDimensions
              ? 'border-sky-500/50 bg-sky-500/15 text-sky-200'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-400 hover:text-slate-200'
          }`}
          title="إظهار / إخفاء خطوط المقاسات 3D"
          aria-label="المقاسات 3D"
        >
          <DraftingCompass className="h-4 w-4" />
        </button>

        <div className="mx-0.5 hidden h-5 w-px bg-slate-800 sm:block" />

        <button
          type="button"
          onClick={toggleInterfacesOpen}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            interfacesOpen
              ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
          }`}
          title={interfacesOpen ? 'إغلاق الضلف والأدراج' : 'فتح الضلف والأدراج'}
          aria-label="فتح / إغلاق الواجهات"
        >
          {interfacesOpen ? <DoorOpen className="h-4 w-4" /> : <DoorClosed className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={toggleInterfacesHidden}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            interfacesHidden
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-200'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
          }`}
          title={interfacesHidden ? 'إظهار الضلف والأدراج' : 'إخفاء الضلف والأدراج مؤقتاً'}
          aria-label="إخفاء / إظهار الضلف"
        >
          {interfacesHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>

        <div className="mx-0.5 hidden h-5 w-px bg-slate-800 sm:block" />

        <button
          type="button"
          onClick={toggleHumanReference}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
            showHumanReference
              ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
          }`}
          title="إظهار / إخفاء المجسم البشري المرجعي"
          aria-label="المقياس البشري"
        >
          <User className="h-4 w-4" />
        </button>

        {showHumanReference && (
          <button
            type="button"
            onClick={() =>
              setHumanScalePreset(humanScalePreset === 'adult' ? 'child' : 'adult')
            }
            className="tabular-nums h-9 shrink-0 rounded-xl border border-amber-400/40 bg-slate-950/80 px-2 text-[11px] font-bold text-amber-200 hover:bg-slate-800"
            title="اضغط للتبديل بين شخص بالغ (175 سم) وطفل (110 سم)"
          >
            {humanScalePreset === 'adult' ? '175 سم' : '110 سم'}
          </button>
        )}

        <button
          type="button"
          onClick={toggleFocusMode}
          className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition md:flex ${
            focusMode
              ? 'border-amber-400 bg-amber-500 text-slate-950'
              : 'border-slate-700/80 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
          }`}
          title="وضع التركيز / ملء الشاشة (Tab)"
          aria-label="وضع التركيز"
        >
          {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      {/* اليسار: حفظ، تقرير الورشة، وتصدير صورة */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenDesignsModal}
          className="relative flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-2.5 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98]"
          title={
            hasUnsavedChanges
              ? 'مشاريعي / حفظ التعديلات غير المحفوظة'
              : 'مشاريعي وحفظ التصاميم'
          }
        >
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">مشاريعي / حفظ</span>
          {hasUnsavedChanges && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-rose-600 ring-2 ring-amber-200"
              title="تعديلات غير محفوظة"
            />
          )}
        </button>

        <button
          type="button"
          onClick={onOpenWorkshopReport}
          className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-500/45 bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.98]"
          title="تقرير الورشة وكشف التقطيع ورص الألواح"
        >
          <ClipboardList className="h-4 w-4 text-emerald-300" />
          <span className="hidden xl:inline">تقرير الورشة</span>
        </button>

        {/* تصدير صورة (4 خيارات) */}
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => setExportMenuOpen((v) => !v)}
            className="flex h-9 items-center gap-1 rounded-xl border border-sky-500/45 bg-sky-500/15 px-2.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/25 active:scale-[0.98] disabled:opacity-50"
            title="تصدير صورة PNG عالية الجودة"
          >
            <ImageDown className="h-4 w-4 text-sky-300" />
            <span className="hidden lg:inline">تصدير</span>
            <ChevronDown className="h-3 w-3 text-sky-300/80" />
          </button>

          {exportMenuOpen && (
            <div className="absolute left-0 top-11 z-50 w-64 rounded-2xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  triggerExportImage('clean')
                }}
                className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-right text-xs font-bold text-slate-100 transition hover:bg-slate-800"
              >
                <Camera className="h-4 w-4 shrink-0 text-sky-400" />
                <div>
                  <div>صورة بالزاوية الحالية</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    خلفية استوديو نظيفة بدون شبكة
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  triggerExportImage('transparent')
                }}
                className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-right text-xs font-bold text-slate-100 transition hover:bg-slate-800"
              >
                <Sparkles className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <div>صورة بخلفية شفافة (PNG)</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    شفافة تماماً للتركيب والتصميم
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  triggerExportImage('three_angles')
                }}
                className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-right text-xs font-bold text-slate-100 transition hover:bg-slate-800"
              >
                <Images className="h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <div>تصدير 3 زوايا تلقائياً</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    أمامي + جانبي + 3D دفعة واحدة
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  triggerExportImage('sketch')
                }}
                className="mt-1 flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-right text-xs font-bold text-slate-100 transition hover:bg-slate-800"
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-200" />
                <div>
                  <div>رسم هندسي بالمقاسات (أبيض وأسود)</div>
                  <div className="text-[10px] font-normal text-slate-400">
                    اسكتش تنفيذي بخطوط وأسهم الأبعاد
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLockApp}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 transition hover:border-rose-500/50 hover:bg-rose-500/15 hover:text-rose-300 active:scale-[0.98]"
          title="قفل التطبيق وتسجيل الخروج"
          aria-label="قفل التطبيق"
        >
          <Lock className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePropsDrawer}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition md:hidden ${
            isPropsOpen
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
              : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:bg-slate-800'
          }`}
          title="خصائص العنصر"
          aria-label="خصائص العنصر"
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
