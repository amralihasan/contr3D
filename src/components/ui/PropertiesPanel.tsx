import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  ChevronDown,
  Circle,
  Copy,
  Minus,
  Plus,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { MATERIAL_LIST } from '../../constants/materials'
import {
  CLEARANCE_PRESETS,
  MAX_CLEARANCE_CM,
  MAX_PANEL_DIM_CM,
  MIN_CLEARANCE_CM,
  MIN_PANEL_DIM_CM,
  THICKNESS_PRESETS,
} from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import {
  getEffectiveEdgeBanding,
  getEffectivePanelHandle,
  isInterfaceRole,
  isLegOrBaseRole,
  isMetalBaseRole,
  type Axis,
  type CornerRadius,
  type EdgeSide,
  type HandleColor,
  type HandlePosition,
  type HandleType,
  type MetalBaseColor,
  type PanelDimensions,
} from '../../types/furniture'
import { getMaxCornerRadius, getPanelFaceSize } from '../../utils/panelGeometry'
import { roundTo } from '../../utils/snapping'

interface PropertiesPanelProps {
  onCloseMobile?: () => void
}

interface AccordionSectionProps {
  title: string
  badge?: string
  defaultOpen: boolean
  children: ReactNode
}

function AccordionSection({ title, badge, defaultOpen, children }: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-slate-950/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between px-3 text-right transition hover:bg-slate-800/40"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200">{title}</span>
          {badge && (
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && <div className="border-t border-slate-800/80 p-2.5">{children}</div>}
    </div>
  )
}

interface DimensionControlProps {
  label: string
  axisLabel: string
  value: number
  onChange: (val: number) => void
  stepAmount?: number
  min?: number
  max?: number
}

function DimensionControl({
  label,
  axisLabel,
  value,
  onChange,
  stepAmount = 1,
  min = MIN_PANEL_DIM_CM,
  max = MAX_PANEL_DIM_CM,
}: DimensionControlProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commitDraft = () => {
    setIsEditing(false)
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) {
      onChange(parsed)
    }
  }

  const stepValue = (delta: number) => {
    const next = roundTo(Math.min(max, Math.max(min, value + delta)), 2)
    onChange(next)
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 px-2.5 py-1.5">
      <div className="min-w-[54px]">
        <div className="text-xs font-bold text-slate-200">{label}</div>
        <div className="text-[10px] text-slate-500">{axisLabel} · سم</div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => stepValue(-stepAmount)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
          aria-label={`إنقاص ${label}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <input
          type="number"
          step="0.1"
          min={min}
          max={max}
          value={isEditing ? draft : String(value)}
          onFocus={() => {
            setDraft(String(value))
            setIsEditing(true)
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitDraft()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="tabular-nums h-9 w-16 rounded-lg border border-slate-700/80 bg-slate-950 px-1.5 text-center text-xs font-bold text-white outline-none focus:border-amber-500"
        />

        <button
          type="button"
          onClick={() => stepValue(stepAmount)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
          aria-label={`زيادة ${label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const EDGE_LABELS: { side: EdgeSide; label: string }[] = [
  { side: 'top', label: 'أمامي / أعلى' },
  { side: 'bottom', label: 'خلفي / أسفل' },
  { side: 'right', label: 'يمين' },
  { side: 'left', label: 'يسار' },
]

const HANDLE_TYPE_OPTIONS: { type: HandleType; label: string }[] = [
  { type: 'bar', label: 'بار مودرن' },
  { type: 'knob', label: 'زرار دائري' },
  { type: 'edge', label: 'بروفايل حافة' },
  { type: 'recessed', label: 'غاطس' },
  { type: 'none', label: 'بدون / تاتش' },
]

const HANDLE_COLOR_OPTIONS: { color: HandleColor; label: string; swatch: string }[] = [
  { color: 'black', label: 'أسود مط', swatch: '#1f2937' },
  { color: 'gold', label: 'ذهبي', swatch: '#d4af37' },
  { color: 'silver', label: 'فضي', swatch: '#cbd5e1' },
  { color: 'wood', label: 'خشبي', swatch: '#b48252' },
]

const HANDLE_LENGTH_PRESETS = [12, 16, 20, 32] as const

const METAL_COLOR_OPTIONS: { color: MetalBaseColor; label: string; swatch: string }[] = [
  { color: 'silver', label: 'فضي / ستانلس', swatch: '#cbd5e1' },
  { color: 'matte_black', label: 'أسود مط', swatch: '#18181b' },
  { color: 'gold', label: 'ذهبي', swatch: '#d4af37' },
  { color: 'matte_white', label: 'أبيض مط', swatch: '#f8fafc' },
  { color: 'anthracite', label: 'رمادي أنثراسيت', swatch: '#334155' },
]

export function PropertiesPanel({ onCloseMobile }: PropertiesPanelProps) {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const clearSelection = useDesignStore((s) => s.clearSelection)
  const autoDistributeSelected = useDesignStore((s) => s.autoDistributeSelected)
  const deleteSelectedPanels = useDesignStore((s) => s.deleteSelectedPanels)

  const updatePanelDimension = useDesignStore((s) => s.updatePanelDimension)
  const setPanelThickness = useDesignStore((s) => s.setPanelThickness)
  const setPanelClearance = useDesignStore((s) => s.setPanelClearance)
  const setPanelHandle = useDesignStore((s) => s.setPanelHandle)
  const applyHandleToAllFronts = useDesignStore((s) => s.applyHandleToAllFronts)
  const setPanelHingeSide = useDesignStore((s) => s.setPanelHingeSide)
  const setPanelHasMirror = useDesignStore((s) => s.setPanelHasMirror)
  const togglePanelEdgeBanding = useDesignStore((s) => s.togglePanelEdgeBanding)
  const setPanelCornerRadius = useDesignStore((s) => s.setPanelCornerRadius)
  const addPanelCutout = useDesignStore((s) => s.addPanelCutout)
  const updatePanelCutout = useDesignStore((s) => s.updatePanelCutout)
  const removePanelCutout = useDesignStore((s) => s.removePanelCutout)
  const rotatePanel90 = useDesignStore((s) => s.rotatePanel90)
  const setPanelMaterial = useDesignStore((s) => s.setPanelMaterial)
  const setPanelMetalColor = useDesignStore((s) => s.setPanelMetalColor)
  const duplicatePanel = useDesignStore((s) => s.duplicatePanel)
  const deletePanel = useDesignStore((s) => s.deletePanel)

  // حالة التحديد المتعدد: التوزيع المتساوي للأرفف والقواطع
  if (selectedPanelIds.length >= 2) {
    const selectedItems = panels.filter((p) => selectedPanelIds.includes(p.id))
    return (
      <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
          <div>
            <span className="text-[11px] font-semibold text-sky-400">تحديد متعدد</span>
            <h2 className="text-sm font-bold text-slate-100">
              {selectedItems.length} قطع محددة
            </h2>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 md:hidden"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <div className="mb-1 text-xs font-bold text-emerald-200">
              التوزيع المتساوي (Auto-Distribute)
            </div>
            <p className="mb-2.5 text-[11px] leading-relaxed text-slate-300">
              يرتب الأرفف الأفقية أو القواطع الرأسية بمسافات داخلية صافية متساوية تماماً.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => autoDistributeSelected()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 active:scale-[0.98]"
              >
                <AlignVerticalSpaceAround className="h-4 w-4" />
                <span>توزيع متساوي تلقائي</span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => autoDistributeSelected('y')}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                >
                  <AlignVerticalSpaceAround className="h-3.5 w-3.5 text-emerald-400" />
                  <span>رأسي (أرفف)</span>
                </button>
                <button
                  type="button"
                  onClick={() => autoDistributeSelected('x')}
                  className="flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
                >
                  <AlignHorizontalSpaceAround className="h-3.5 w-3.5 text-sky-400" />
                  <span>أفقي (قواطع)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
              >
                <span className="truncate font-bold text-slate-200">{item.name}</span>
                <span className="tabular-nums text-[11px] text-slate-400">
                  {item.dimensions.width}×{item.dimensions.height}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-2.5">
          <button
            type="button"
            onClick={clearSelection}
            className="flex h-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700"
          >
            إلغاء التحديد
          </button>
          <button
            type="button"
            onClick={deleteSelectedPanels}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
          >
            <Trash2 className="h-4 w-4" />
            <span>حذف المحدد</span>
          </button>
        </div>
      </aside>
    )
  }

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null

  if (!panel) {
    return (
      <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100">خصائص العنصر</h2>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 md:hidden"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <p className="text-xs font-bold text-slate-200">لم يتم تحديد أي قطعة</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            اضغط على أي لوح في المشهد لتعديل مقاساته وخامته وشريط الحرف.
          </p>
        </div>
      </aside>
    )
  }

  const axisToDimKey: Record<Axis, keyof PanelDimensions> = {
    x: 'width',
    y: 'height',
    z: 'depth',
  }
  const currentThickness = panel.dimensions[axisToDimKey[panel.thicknessAxis]]
  const isFront = isInterfaceRole(panel.role)
  const isBaseOrLeg = isLegOrBaseRole(panel.role)
  const isMetalBase = isMetalBaseRole(panel.role)
  const supportsEdgeBanding =
    !isBaseOrLeg ||
    panel.role === 'plinth_base' ||
    panel.role === 'plinth_recessed' ||
    panel.role === 'wood_arch'
  const supportsShapeAndCutouts =
    !isBaseOrLeg && panel.role !== 'drawer'
  const clearance = panel.clearanceCm ?? 0.2
  const netW = roundTo(Math.max(1, panel.dimensions.width - clearance * 2), 2)
  const netH = roundTo(Math.max(1, panel.dimensions.height - clearance * 2), 2)
  const edgeBanding = getEffectiveEdgeBanding(panel)
  const activeEdgesCount = [
    edgeBanding.top,
    edgeBanding.bottom,
    edgeBanding.right,
    edgeBanding.left,
  ].filter(Boolean).length

  const cr: CornerRadius = panel.cornerRadius ?? { tl: 0, tr: 0, bl: 0, br: 0 }
  const maxCornerR = getMaxCornerRadius(panel.dimensions, panel.thicknessAxis)
  const { faceW, faceH } = getPanelFaceSize(panel.dimensions, panel.thicknessAxis)
  const cutouts = panel.cutouts ?? []
  const roundedCornersCount = [cr.tl, cr.tr, cr.bl, cr.br].filter((v) => v > 0.01).length
  const shapeModsCount = (roundedCornersCount > 0 ? 1 : 0) + cutouts.length

  const handleConfig = getEffectivePanelHandle(panel)
  const activeHandleBadge =
    HANDLE_TYPE_OPTIONS.find((o) => o.type === handleConfig.type)?.label ?? 'بار مودرن'
  const doorPosOptions: { pos: HandlePosition; label: string }[] =
    panel.role === 'drawer'
      ? [
          { pos: 'center', label: 'منتصف' },
          { pos: 'top', label: 'حافة علوية' },
          { pos: 'bottom', label: 'حافة سفلية' },
        ]
      : [
          { pos: 'right', label: 'يمين' },
          { pos: 'left', label: 'يسار' },
          { pos: 'top', label: 'أعلى' },
          { pos: 'bottom', label: 'أسفل' },
          { pos: 'center', label: 'منتصف' },
        ]

  const deg = (rad: number) => {
    const normalized = Math.round(((rad * 180) / Math.PI) % 360)
    return normalized < 0 ? normalized + 360 : normalized
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* الرأس */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold text-amber-400">العنصر المحدد</span>
          <h2 className="truncate text-sm font-bold text-slate-100">{panel.name}</h2>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 md:hidden"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* الأقسام القابلة للطي مرتبة حسب الأولوية */}
      <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-3">
        {/* 1. المقاسات والسُمك (مفتوح افتراضياً في الأعلى) */}
        <AccordionSection
          title="المقاسات والسُمك"
          badge={`${panel.dimensions.width}×${panel.dimensions.height}×${panel.dimensions.depth}`}
          defaultOpen
        >
          <div className="space-y-2">
            {!isBaseOrLeg && panel.role !== 'drawer' && (
              <div className="grid grid-cols-2 gap-1.5">
                {THICKNESS_PRESETS.map((opt) => {
                  const active = Math.abs(currentThickness - opt.cm) < 0.05
                  return (
                    <button
                      key={opt.cm}
                      type="button"
                      onClick={() => setPanelThickness(panel.id, opt.cm)}
                      className={`flex h-9 items-center justify-center rounded-xl border text-xs font-bold transition ${
                        active
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt.label} ({opt.cm} سم)
                    </button>
                  )
                })}
              </div>
            )}

            {isBaseOrLeg && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-4 gap-1">
                  {(panel.role === 'tv_short_legs' ? [3, 5, 8, 12] : [10, 18, 40, 73]).map((h) => {
                    const active = Math.abs(panel.dimensions.height - h) < 0.05
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => updatePanelDimension(panel.id, 'height', h)}
                        className={`h-9 rounded-xl border text-[11px] font-bold transition ${
                          active
                            ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {h} سم
                      </button>
                    )
                  })}
                </div>
                {panel.role === 'tv_short_legs' && (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                    عدد الرجول التلقائي:{' '}
                    <span className="font-extrabold text-amber-300">
                      {panel.dimensions.width >= 140 ? '6 رجول (دعم أوسط)' : '4 رجول'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <DimensionControl
              label="العرض"
              axisLabel="X"
              value={panel.dimensions.width}
              onChange={(v) => updatePanelDimension(panel.id, 'width', v)}
            />
            <DimensionControl
              label="الارتفاع"
              axisLabel="Y"
              value={panel.dimensions.height}
              min={panel.role === 'tv_short_legs' ? 2 : MIN_PANEL_DIM_CM}
              max={panel.role === 'tv_short_legs' ? 15 : MAX_PANEL_DIM_CM}
              onChange={(v) => updatePanelDimension(panel.id, 'height', v)}
            />
            <DimensionControl
              label="العمق"
              axisLabel="Z"
              value={panel.dimensions.depth}
              onChange={(v) => updatePanelDimension(panel.id, 'depth', v)}
            />

            {/* إعدادات الضلف والأدراج (الخلوص والمقبض وجهة الفتح) */}
            {isFront && (
              <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-200">خلوص التركيب</span>
                  <span className="tabular-nums text-slate-400">
                    صافي: {netW}×{netH} سم
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CLEARANCE_PRESETS.map((opt) => {
                    const active = Math.abs(clearance - opt.cm) < 0.01
                    return (
                      <button
                        key={opt.cm}
                        type="button"
                        onClick={() => setPanelClearance(panel.id, opt.cm)}
                        className={`h-9 rounded-xl border text-xs font-bold transition ${
                          active
                            ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <DimensionControl
                  label="الخلوص"
                  axisLabel="لكل حافة"
                  value={clearance}
                  stepAmount={0.1}
                  min={MIN_CLEARANCE_CM}
                  max={MAX_CLEARANCE_CM}
                  onChange={(v) => setPanelClearance(panel.id, v)}
                />

                {(panel.role === 'hinged_door' || panel.role === 'sliding_door') && (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(['right', 'left'] as const).map((side) => {
                        const active = (panel.hingeSide ?? 'right') === side
                        return (
                          <button
                            key={side}
                            type="button"
                            onClick={() => setPanelHingeSide(panel.id, side)}
                            className={`h-9 rounded-xl border text-xs font-bold transition ${
                              active
                                ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                                : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {side === 'right' ? 'جهة: يمين' : 'جهة: يسار'}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => setPanelHasMirror(panel.id, !panel.hasMirror)}
                      className={`flex h-11 w-full items-center justify-between rounded-xl border px-3 text-xs font-bold transition ${
                        panel.hasMirror
                          ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-200'
                          : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                      }`}
                      aria-pressed={Boolean(panel.hasMirror)}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles
                          className={`h-4 w-4 ${
                            panel.hasMirror ? 'text-cyan-300' : 'text-slate-400'
                          }`}
                        />
                        <span>تغطية الوجه بمرايا</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          panel.hasMirror
                            ? 'bg-cyan-400 text-slate-950'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {panel.hasMirror ? 'مفعّل' : 'بدون'}
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* قسم تخصيص المقبض (للضلف والأدراج فقط) */}
        {isFront && (
          <AccordionSection
            title="المقبض (Handle)"
            badge={activeHandleBadge}
            defaultOpen
          >
            <div className="space-y-3">
              {/* نوع المقبض */}
              <div>
                <div className="mb-1.5 text-[11px] font-bold text-slate-300">نوع المقبض</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {HANDLE_TYPE_OPTIONS.map((opt) => {
                    const active = handleConfig.type === opt.type
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => {
                          const patch: {
                            type: HandleType
                            position?: HandlePosition
                            orientation?: 'horizontal' | 'vertical'
                          } = { type: opt.type }
                          if (opt.type === 'edge' && handleConfig.position === 'center') {
                            patch.position = 'top'
                          } else if (
                            (opt.type === 'bar' || opt.type === 'recessed') &&
                            panel.role === 'drawer'
                          ) {
                            patch.orientation = 'horizontal'
                          }
                          setPanelHandle(panel.id, patch)
                        }}
                        className={`h-9 rounded-xl border px-2 text-xs font-bold transition ${
                          opt.type === 'none' ? 'col-span-2' : ''
                        } ${
                          active
                            ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {handleConfig.type !== 'none' && (
                <>
                  {/* لون المقبض */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold text-slate-300">لون المقبض</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HANDLE_COLOR_OPTIONS.map((opt) => {
                        const active = handleConfig.color === opt.color
                        return (
                          <button
                            key={opt.color}
                            type="button"
                            onClick={() => setPanelHandle(panel.id, { color: opt.color })}
                            className={`flex h-10 flex-col items-center justify-center gap-1 rounded-xl border transition ${
                              active
                                ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                                : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full ring-1 ring-white/30"
                              style={{ backgroundColor: opt.swatch }}
                            />
                            <span className="text-[10px] font-bold leading-none">
                              {opt.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* الموضع */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-bold text-slate-300">الموضع</div>
                    <div className="flex flex-wrap gap-1.5">
                      {doorPosOptions.map((opt) => {
                        const active = handleConfig.position === opt.pos
                        return (
                          <button
                            key={opt.pos}
                            type="button"
                            onClick={() => setPanelHandle(panel.id, { position: opt.pos })}
                            className={`h-9 flex-1 min-w-[64px] rounded-xl border px-2 text-[11px] font-bold transition ${
                              active
                                ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                                : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            {opt.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* الاتجاه (للبار والغاطس) */}
                  {(handleConfig.type === 'bar' || handleConfig.type === 'recessed') && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-bold text-slate-300">الاتجاه</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { val: 'horizontal', label: 'أفقي' },
                            { val: 'vertical', label: 'رأسي' },
                          ] as const
                        ).map((opt) => {
                          const active = (handleConfig.orientation ?? 'horizontal') === opt.val
                          return (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setPanelHandle(panel.id, { orientation: opt.val })}
                              className={`h-9 rounded-xl border text-xs font-bold transition ${
                                active
                                  ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                                  : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* الطول (للبار وبروفايل الحافة) */}
                  {(handleConfig.type === 'bar' || handleConfig.type === 'edge') && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-bold text-slate-300">
                        طول المقبض (سم)
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {HANDLE_LENGTH_PRESETS.map((len) => {
                          const active = Math.abs((handleConfig.length ?? 16) - len) < 0.5
                          return (
                            <button
                              key={len}
                              type="button"
                              onClick={() => setPanelHandle(panel.id, { length: len })}
                              className={`tabular-nums h-9 rounded-xl border text-[11px] font-bold transition ${
                                active
                                  ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                                  : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {len} سم
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* زر توحيد المقبض على كل الضلف والأدراج */}
              <button
                type="button"
                onClick={() => applyHandleToAllFronts(panel.id)}
                className="flex h-10 w-full items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.98]"
              >
                تطبيق على كل الضلف والأدراج
              </button>
            </div>
          </AccordionSection>
        )}

        {/* 2. اللون والخامة (مفتوح افتراضياً) */}
        <AccordionSection
          title={isMetalBase ? 'لون المعدن' : 'اللون والخامة'}
          defaultOpen
        >
          {isMetalBase ? (
            <div className="grid grid-cols-1 gap-1.5">
              {METAL_COLOR_OPTIONS.map((opt) => {
                const defaultColor = panel.role === 'tv_short_legs' ? 'silver' : 'matte_black'
                const active = (panel.metalColor ?? defaultColor) === opt.color
                return (
                  <button
                    key={opt.color}
                    type="button"
                    onClick={() => setPanelMetalColor(panel.id, opt.color)}
                    className={`flex h-9 items-center justify-between rounded-xl border px-2.5 transition ${
                      active
                        ? 'border-amber-500 bg-amber-500/15 text-amber-100'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-md shadow-inner ring-1 ring-white/25"
                        style={{ backgroundColor: opt.swatch }}
                      />
                      <span className="text-xs font-bold">{opt.label}</span>
                    </div>
                    {active && (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                        مختار
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {MATERIAL_LIST.map((mat) => {
                const active = panel.materialId === mat.id
                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => setPanelMaterial(panel.id, mat.id)}
                    className={`flex h-9 items-center justify-between rounded-xl border px-2.5 transition ${
                      active
                        ? 'border-amber-500 bg-amber-500/15 text-amber-100'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded-md shadow-inner ring-1 ring-white/20"
                        style={{
                          backgroundColor: mat.swatch,
                          backgroundImage: mat.hasWoodGrain
                            ? 'repeating-linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 2px, transparent 2px, transparent 6px)'
                            : undefined,
                        }}
                      />
                      <span className="text-xs font-bold">{mat.label}</span>
                    </div>
                    {active && (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                        مختار
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </AccordionSection>

        {/* 3. التدوير السريع (قابل للطي) */}
        <AccordionSection
          title="التدوير السريع 90°"
          badge={`${deg(panel.rotation[0])}°/${deg(panel.rotation[1])}°/${deg(panel.rotation[2])}°`}
          defaultOpen={false}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => rotatePanel90(panel.id, axis)}
                className="flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-bold text-slate-200 transition hover:border-amber-500/50 hover:bg-slate-800 active:scale-95"
              >
                <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                <span>{axis.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </AccordionSection>

        {/* 4. شريط الحرف (مطوي افتراضياً) */}
        {supportsEdgeBanding && (
          <AccordionSection
            title="شريط الحرف (Edge Banding)"
            badge={`${activeEdgesCount} حروف`}
            defaultOpen={false}
          >
            <div className="mb-2 flex justify-center">
              <div
                className="flex h-9 w-24 items-center justify-center rounded bg-slate-800/80 text-[10px] font-semibold text-slate-400"
                style={{
                  borderTop: edgeBanding.top ? '3px solid #f59e0b' : '1px dashed #475569',
                  borderBottom: edgeBanding.bottom ? '3px solid #f59e0b' : '1px dashed #475569',
                  borderRight: edgeBanding.right ? '3px solid #f59e0b' : '1px dashed #475569',
                  borderLeft: edgeBanding.left ? '3px solid #f59e0b' : '1px dashed #475569',
                }}
              >
                معاينة الحروف
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {EDGE_LABELS.map((edge) => {
                const active = edgeBanding[edge.side]
                return (
                  <button
                    key={edge.side}
                    type="button"
                    onClick={() => togglePanelEdgeBanding(panel.id, edge.side)}
                    className={`flex h-9 items-center justify-center rounded-xl border text-xs font-bold transition ${
                      active
                        ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700 bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {edge.label}
                  </button>
                )
              })}
            </div>
          </AccordionSection>
        )}

        {/* 5. الدوران والفتحات (مطوي افتراضياً) */}
        {supportsShapeAndCutouts && (
          <AccordionSection
            title="الدوران والفتحات"
            badge={shapeModsCount > 0 ? `${shapeModsCount} تعديل` : undefined}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {/* دوران الزوايا */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">دوران الزوايا (سم)</span>
                  <span className="tabular-nums text-slate-500">أقصى R: {maxCornerR} سم</span>
                </div>

                <div className="mb-2 grid grid-cols-4 gap-1">
                  {[0, 3, 5, 10].map((r) => {
                    const allSame =
                      Math.abs(cr.tl - r) < 0.05 &&
                      Math.abs(cr.tr - r) < 0.05 &&
                      Math.abs(cr.bl - r) < 0.05 &&
                      Math.abs(cr.br - r) < 0.05
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() =>
                          setPanelCornerRadius(panel.id, { tl: r, tr: r, bl: r, br: r })
                        }
                        className={`h-8 rounded-lg border text-[11px] font-bold transition ${
                          allSame
                            ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {r === 0 ? 'حاد 0' : `${r} سم`}
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { key: 'tr', label: 'أعلى يمين' },
                      { key: 'tl', label: 'أعلى يسار' },
                      { key: 'br', label: 'أسفل يمين' },
                      { key: 'bl', label: 'أسفل يسار' },
                    ] as const
                  ).map((corner) => (
                    <div
                      key={corner.key}
                      className="flex items-center justify-between gap-1 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1"
                    >
                      <span className="text-[10px] font-semibold text-slate-400">
                        {corner.label}
                      </span>
                      <input
                        type="number"
                        step="0.5"
                        min={0}
                        max={maxCornerR}
                        value={cr[corner.key]}
                        onChange={(e) => {
                          const v = Number.parseFloat(e.target.value)
                          setPanelCornerRadius(panel.id, {
                            ...cr,
                            [corner.key]: Number.isFinite(v) ? v : 0,
                          })
                        }}
                        className="tabular-nums h-7 w-12 rounded border border-slate-700 bg-slate-950 text-center text-xs font-bold text-white outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* فتحات الأسلاك (الفحر) */}
              <div className="border-t border-slate-800/80 pt-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    فتحات الأسلاك ({cutouts.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => addPanelCutout(panel.id)}
                    className="flex h-8 items-center gap-1 rounded-lg bg-cyan-500/20 px-2.5 text-[11px] font-bold text-cyan-200 ring-1 ring-cyan-500/40 transition hover:bg-cyan-500/30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>إضافة فتحة سلك</span>
                  </button>
                </div>

                {cutouts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-800 p-2.5 text-center text-[11px] text-slate-500">
                    لا توجد فتحات في هذا اللوح
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cutouts.map((c, idx) => (
                      <div
                        key={c.id}
                        className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-cyan-200">
                            فتحة #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updatePanelCutout(panel.id, c.id, { shape: 'circle' })
                              }
                              className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold ${
                                c.shape === 'circle'
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              <Circle className="h-3 w-3" />
                              <span>دائرية</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updatePanelCutout(panel.id, c.id, { shape: 'rect' })
                              }
                              className={`flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold ${
                                c.shape === 'rect'
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              <Square className="h-3 w-3" />
                              <span>مستطيلة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removePanelCutout(panel.id, c.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                              aria-label="حذف الفتحة"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* مقاس الفتحة */}
                        {c.shape === 'circle' ? (
                          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                            <span className="text-[11px] text-slate-300">القطر (سم)</span>
                            <input
                              type="number"
                              step="0.5"
                              min={1}
                              max={Math.max(2, Math.min(faceW, faceH) - 1)}
                              value={c.diameter ?? 6}
                              onChange={(e) => {
                                const v = Number.parseFloat(e.target.value)
                                if (Number.isFinite(v)) {
                                  updatePanelCutout(panel.id, c.id, {
                                    diameter: Math.max(1, v),
                                    width: Math.max(1, v),
                                    height: Math.max(1, v),
                                  })
                                }
                              }}
                              className="tabular-nums h-7 w-16 rounded border border-slate-700 bg-slate-900 text-center text-xs font-bold text-white outline-none focus:border-cyan-400"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                              <span className="text-[10px] text-slate-400">عرض</span>
                              <input
                                type="number"
                                step="0.5"
                                min={1}
                                max={Math.max(2, faceW - 1)}
                                value={c.width}
                                onChange={(e) => {
                                  const v = Number.parseFloat(e.target.value)
                                  if (Number.isFinite(v)) {
                                    updatePanelCutout(panel.id, c.id, {
                                      width: Math.max(1, v),
                                    })
                                  }
                                }}
                                className="tabular-nums h-7 w-12 rounded border border-slate-700 bg-slate-900 text-center text-xs font-bold text-white outline-none focus:border-cyan-400"
                              />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                              <span className="text-[10px] text-slate-400">طول</span>
                              <input
                                type="number"
                                step="0.5"
                                min={1}
                                max={Math.max(2, faceH - 1)}
                                value={c.height}
                                onChange={(e) => {
                                  const v = Number.parseFloat(e.target.value)
                                  if (Number.isFinite(v)) {
                                    updatePanelCutout(panel.id, c.id, {
                                      height: Math.max(1, v),
                                    })
                                  }
                                }}
                                className="tabular-nums h-7 w-12 rounded border border-slate-700 bg-slate-900 text-center text-xs font-bold text-white outline-none focus:border-cyan-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* موقع الفتحة بالنسبة لمركز اللوح */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                            <span className="text-[10px] text-slate-400">يمين/يسار X</span>
                            <input
                              type="number"
                              step="1"
                              value={c.x}
                              onChange={(e) => {
                                const v = Number.parseFloat(e.target.value)
                                if (Number.isFinite(v)) {
                                  updatePanelCutout(panel.id, c.id, { x: v })
                                }
                              }}
                              className="tabular-nums h-7 w-12 rounded border border-slate-700 bg-slate-900 text-center text-xs font-bold text-white outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1">
                            <span className="text-[10px] text-slate-400">أعلى/أسفل Y</span>
                            <input
                              type="number"
                              step="1"
                              value={c.y}
                              onChange={(e) => {
                                const v = Number.parseFloat(e.target.value)
                                if (Number.isFinite(v)) {
                                  updatePanelCutout(panel.id, c.id, { y: v })
                                }
                              }}
                              className="tabular-nums h-7 w-12 rounded border border-slate-700 bg-slate-900 text-center text-xs font-bold text-white outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AccordionSection>
        )}
      </div>

      {/* أزرار النسخ والحذف */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-2.5">
        <button
          type="button"
          onClick={() => duplicatePanel(panel.id)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]"
        >
          <Copy className="h-4 w-4 text-sky-400" />
          <span>نسخ</span>
        </button>

        <button
          type="button"
          onClick={() => deletePanel(panel.id)}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25 active:scale-[0.98]"
        >
          <Trash2 className="h-4 w-4" />
          <span>حذف</span>
        </button>
      </div>
    </aside>
  )
}
