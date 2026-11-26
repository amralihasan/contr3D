import { Copy, Minus, Plus, RotateCw, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { MATERIAL_LIST } from '../../constants/materials'
import { MAX_PANEL_DIM_CM, MIN_PANEL_DIM_CM, THICKNESS_PRESETS } from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import type { Axis, PanelDimensions } from '../../types/furniture'
import { roundTo } from '../../utils/snapping'

interface PropertiesPanelProps {
  onCloseMobile?: () => void
}

interface DimensionControlProps {
  label: string
  axisLabel: string
  value: number
  onChange: (val: number) => void
}

function DimensionControl({ label, axisLabel, value, onChange }: DimensionControlProps) {
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
    const next = roundTo(Math.min(MAX_PANEL_DIM_CM, Math.max(MIN_PANEL_DIM_CM, value + delta)), 2)
    onChange(next)
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-bold text-slate-200">{label}</span>
        <span className="text-[11px] text-slate-500">{axisLabel} · سم</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => stepValue(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
          aria-label={`إنقاص ${label}`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          type="number"
          step="0.1"
          min={MIN_PANEL_DIM_CM}
          max={MAX_PANEL_DIM_CM}
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
          className="tabular-nums h-11 min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-900 px-2 text-center text-sm font-bold text-white outline-none focus:border-amber-500"
        />

        <button
          type="button"
          onClick={() => stepValue(1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
          aria-label={`زيادة ${label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function PropertiesPanel({ onCloseMobile }: PropertiesPanelProps) {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const updatePanelDimension = useDesignStore((s) => s.updatePanelDimension)
  const setPanelThickness = useDesignStore((s) => s.setPanelThickness)
  const rotatePanel90 = useDesignStore((s) => s.rotatePanel90)
  const setPanelMaterial = useDesignStore((s) => s.setPanelMaterial)
  const duplicatePanel = useDesignStore((s) => s.duplicatePanel)
  const deletePanel = useDesignStore((s) => s.deletePanel)

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null

  if (!panel) {
    return (
      <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-bold text-slate-100">خصائص اللوح</h2>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 lg:hidden"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <p className="text-sm font-bold text-slate-200">لم يتم تحديد أي لوح</p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            اضغط على أي لوح في مساحة الـ 3D لتعديل مقاساته، تدويره، تغيير خامته، أو تحريكه بالأسهم.
          </p>

          <div className="mt-6 w-full space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 text-right text-xs text-slate-400">
            <div className="font-bold text-slate-300">اختصارات التابلت واللمس:</div>
            <div>• إصبع واحد: تدوير الكاميرا</div>
            <div>• إصبعان: تقريب/تكبير وتحريك المشهد</div>
            <div>• اسحب أسهم التحريك لنقل اللوح بدقة 0.5 سم</div>
          </div>
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

  const deg = (rad: number) => {
    const normalized = Math.round(((rad * 180) / Math.PI) % 360)
    return normalized < 0 ? normalized + 360 : normalized
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* الرأس */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold text-amber-400">اللوح المحدد</span>
          <h2 className="truncate text-sm font-bold text-slate-100">{panel.name}</h2>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 lg:hidden"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-3.5">
        {/* أزرار السُمك السريعة */}
        <div>
          <div className="mb-2 text-xs font-bold text-slate-300">السُمك الشائع للكونتر</div>
          <div className="grid grid-cols-2 gap-2">
            {THICKNESS_PRESETS.map((opt) => {
              const active = Math.abs(currentThickness - opt.cm) < 0.05
              return (
                <button
                  key={opt.cm}
                  type="button"
                  onClick={() => setPanelThickness(panel.id, opt.cm)}
                  className={`flex h-11 items-center justify-center rounded-xl border text-xs font-bold transition ${
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
        </div>

        {/* المقاسات بالسنتيمتر */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-300">المقاسات بالسنتيمتر</div>
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
        </div>

        {/* التدوير السريع 90 درجة */}
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">تدوير سريع 90°</span>
            <span className="tabular-nums text-[11px] text-slate-500">
              {deg(panel.rotation[0])}° / {deg(panel.rotation[1])}° / {deg(panel.rotation[2])}°
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['x', 'y', 'z'] as const).map((axis) => (
              <button
                key={axis}
                type="button"
                onClick={() => rotatePanel90(panel.id, axis)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-bold text-slate-200 transition hover:border-amber-500/50 hover:bg-slate-800 active:scale-95"
              >
                <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                <span>{axis.toUpperCase()} 90°</span>
              </button>
            ))}
          </div>
        </div>

        {/* الخامة واللون */}
        <div>
          <div className="mb-2 text-xs font-bold text-slate-300">اللون والخامة</div>
          <div className="grid grid-cols-1 gap-1.5">
            {MATERIAL_LIST.map((mat) => {
              const active = panel.materialId === mat.id
              return (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setPanelMaterial(panel.id, mat.id)}
                  className={`flex h-11 items-center justify-between rounded-xl border px-3 transition ${
                    active
                      ? 'border-amber-500 bg-amber-500/15 text-amber-100'
                      : 'border-slate-800 bg-slate-950/50 text-slate-300 hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-6 w-6 rounded-lg shadow-inner ring-1 ring-white/20"
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
                    <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                      مختار
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* أزرار النسخ والحذف */}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={() => duplicatePanel(panel.id)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]"
        >
          <Copy className="h-4 w-4 text-sky-400" />
          <span>نسخ اللوح</span>
        </button>

        <button
          type="button"
          onClick={() => deletePanel(panel.id)}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/15 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25 active:scale-[0.98]"
        >
          <Trash2 className="h-4 w-4" />
          <span>حذف اللوح</span>
        </button>
      </div>
    </aside>
  )
}
