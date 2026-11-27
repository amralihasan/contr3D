import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  ChevronDown,
  Copy,
  Minus,
  Plus,
  RotateCw,
  SlidersHorizontal,
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
  isInterfaceRole,
  isLegOrBaseRole,
  type Axis,
  type EdgeSide,
  type PanelDimensions,
} from '../../types/furniture'
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
  const setPanelHasHandle = useDesignStore((s) => s.setPanelHasHandle)
  const setPanelHingeSide = useDesignStore((s) => s.setPanelHingeSide)
  const togglePanelEdgeBanding = useDesignStore((s) => s.togglePanelEdgeBanding)
  const rotatePanel90 = useDesignStore((s) => s.rotatePanel90)
  const setPanelMaterial = useDesignStore((s) => s.setPanelMaterial)
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
  const isHardwareLegs = panel.role === 'wood_legs' || panel.role === 'metal_legs'
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
              <div className="grid grid-cols-4 gap-1">
                {[8, 10, 15, 20].map((h) => {
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
                )}

                <button
                  type="button"
                  onClick={() => setPanelHasHandle(panel.id, panel.hasHandle === false)}
                  className={`flex h-9 w-full items-center justify-between rounded-xl border px-3 text-xs font-bold transition ${
                    panel.hasHandle !== false
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/70 text-slate-400'
                  }`}
                >
                  <span>مقبض بسيط</span>
                  <span>{panel.hasHandle !== false ? 'مُفعل' : 'بدون'}</span>
                </button>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 2. اللون والخامة (مفتوح افتراضياً) */}
        <AccordionSection title="اللون والخامة" defaultOpen>
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
        {!isHardwareLegs && (
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
