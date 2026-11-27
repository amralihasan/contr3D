import { Minus, Plus, Ruler, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  MAX_PANEL_DIM_CM,
  MIN_PANEL_DIM_CM,
  THICKNESS_PRESETS,
  type PanelPreset,
} from '../../constants/presets'
import type { PanelDimensions } from '../../types/furniture'
import { roundTo } from '../../utils/snapping'

interface AddPartModalProps {
  preset: PanelPreset | null
  onClose: () => void
  onConfirm: (dimensions: PanelDimensions, quantity: number) => void
}

export function AddPartModal({ preset, onClose, onConfirm }: AddPartModalProps) {
  useEffect(() => {
    if (!preset) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [preset, onClose])

  if (!preset || typeof document === 'undefined') return null

  return createPortal(
    <div
      dir="rtl"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <AddPartModalForm key={preset.role} preset={preset} onClose={onClose} onConfirm={onConfirm} />
    </div>,
    document.body
  )
}

function AddPartModalForm({
  preset,
  onClose,
  onConfirm,
}: {
  preset: PanelPreset
  onClose: () => void
  onConfirm: (dimensions: PanelDimensions, quantity: number) => void
}) {
  const [widthInput, setWidthInput] = useState(String(preset.dimensions.width))
  const [heightInput, setHeightInput] = useState(String(preset.dimensions.height))
  const [depthInput, setDepthInput] = useState(String(preset.dimensions.depth))
  const [quantity, setQuantity] = useState(1)

  const parseDim = (raw: string, fallback: number) => {
    const val = Number.parseFloat(raw)
    if (!Number.isFinite(val)) return fallback
    return roundTo(Math.min(MAX_PANEL_DIM_CM, Math.max(MIN_PANEL_DIM_CM, val)), 2)
  }

  const showThicknessQuickButtons =
    preset.category === 'panel' ||
    preset.role === 'hinged_door' ||
    preset.role === 'sliding_door'

  const activeThicknessValue =
    preset.thicknessAxis === 'x'
      ? Number.parseFloat(widthInput)
      : preset.thicknessAxis === 'y'
        ? Number.parseFloat(heightInput)
        : Number.parseFloat(depthInput)

  const applyQuickThickness = (cm: number) => {
    const valStr = String(cm)
    if (preset.thicknessAxis === 'x') {
      setWidthInput(valStr)
    } else if (preset.thicknessAxis === 'y') {
      setHeightInput(valStr)
    } else {
      setDepthInput(valStr)
    }
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const dims: PanelDimensions = {
      width: parseDim(widthInput, preset.dimensions.width),
      height: parseDim(heightInput, preset.dimensions.height),
      depth: parseDim(depthInput, preset.dimensions.depth),
    }
    const safeQty = Math.min(20, Math.max(1, Math.round(quantity)))
    onConfirm(dims, safeQty)
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-md rounded-3xl border border-slate-700/90 bg-slate-900 p-5 shadow-2xl"
    >
      {/* الرأس */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/35">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white sm:text-base">
              إضافة: {preset.label}
            </h3>
            <p className="text-xs text-slate-400">
              حدّد المقاسات بالسنتيمتر والعدد قبل الإدراج في المشهد
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* حقول المقاسات الثلاثة */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div>
          <label
            htmlFor="add-part-width"
            className="mb-1.5 block text-xs font-bold text-slate-300"
          >
            العرض (X سم)
          </label>
          <input
            id="add-part-width"
            type="number"
            step="0.1"
            min={MIN_PANEL_DIM_CM}
            max={MAX_PANEL_DIM_CM}
            autoFocus
            onFocus={(e) => e.currentTarget.select()}
            value={widthInput}
            onChange={(e) => setWidthInput(e.target.value)}
            className="tabular-nums h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-center text-sm font-extrabold text-white outline-none transition focus:border-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="add-part-height"
            className="mb-1.5 block text-xs font-bold text-slate-300"
          >
            الارتفاع (Y سم)
          </label>
          <input
            id="add-part-height"
            type="number"
            step="0.1"
            min={MIN_PANEL_DIM_CM}
            max={MAX_PANEL_DIM_CM}
            onFocus={(e) => e.currentTarget.select()}
            value={heightInput}
            onChange={(e) => setHeightInput(e.target.value)}
            className="tabular-nums h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-center text-sm font-extrabold text-white outline-none transition focus:border-amber-500"
          />
        </div>

        <div>
          <label
            htmlFor="add-part-depth"
            className="mb-1.5 block text-xs font-bold text-slate-300"
          >
            العمق (Z سم)
          </label>
          <input
            id="add-part-depth"
            type="number"
            step="0.1"
            min={MIN_PANEL_DIM_CM}
            max={MAX_PANEL_DIM_CM}
            onFocus={(e) => e.currentTarget.select()}
            value={depthInput}
            onChange={(e) => setDepthInput(e.target.value)}
            className="tabular-nums h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-center text-sm font-extrabold text-white outline-none transition focus:border-amber-500"
          />
        </div>
      </div>

      {/* أزرار السُمك القياسي للألواح */}
      {showThicknessQuickButtons && (
        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
          <span className="text-xs font-bold text-slate-300">السُمك القياسي للوح:</span>
          <div className="flex items-center gap-1.5">
            {THICKNESS_PRESETS.map((tp) => {
              const active = Math.abs(activeThicknessValue - tp.cm) < 0.05
              return (
                <button
                  key={tp.cm}
                  type="button"
                  onClick={() => applyQuickThickness(tp.cm)}
                  className={`h-9 rounded-xl border px-3 text-xs font-bold transition ${
                    active
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tp.cm} سم ({tp.label})
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* خانة الكمية */}
      <div className="mt-3.5 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
        <div>
          <label htmlFor="add-part-qty" className="text-xs font-bold text-slate-200">
            الكمية (العدد)
          </label>
          <p className="text-[11px] text-slate-400">
            لإضافة أكثر من قطعة بنفس المقاس مرة واحدة
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            aria-label="تقليل الكمية"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            id="add-part-qty"
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10)
              setQuantity(Number.isFinite(v) ? Math.min(20, Math.max(1, v)) : 1)
            }}
            className="tabular-nums h-11 w-14 rounded-xl border border-slate-700 bg-slate-950 text-center text-sm font-extrabold text-white outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 transition hover:bg-slate-700 active:scale-95"
            aria-label="زيادة الكمية"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* أزرار التنفيذ */}
      <div className="mt-5 flex gap-2.5">
        <button
          type="submit"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-400 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة للمشهد{quantity > 1 ? ` (${quantity})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-2xl border border-slate-700 bg-slate-800 px-5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-[0.98]"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
