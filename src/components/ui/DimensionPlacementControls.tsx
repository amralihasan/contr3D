import type {
  DepthDimensionSide,
  DimensionPlacement,
  HeightDimensionSide,
  WidthDimensionSide,
} from '../../types/furniture'

interface DimensionPlacementControlsProps {
  placement: DimensionPlacement
  onChange: (patch: Partial<DimensionPlacement>) => void
  compact?: boolean
}

const HEIGHT_OPTIONS: { id: HeightDimensionSide; label: string }[] = [
  { id: 'left', label: 'يسار' },
  { id: 'right', label: 'يمين' },
]

const WIDTH_OPTIONS: { id: WidthDimensionSide; label: string }[] = [
  { id: 'front', label: 'أمام' },
  { id: 'top', label: 'أعلى' },
  { id: 'back', label: 'خلف' },
]

const DEPTH_OPTIONS: { id: DepthDimensionSide; label: string }[] = [
  { id: 'right', label: 'يمين' },
  { id: 'left', label: 'يسار' },
]

export function DimensionPlacementControls({
  placement,
  onChange,
  compact = false,
}: DimensionPlacementControlsProps) {
  const btnHeight = compact ? 'h-8 px-2.5 text-[11px]' : 'h-10 px-3 text-xs'

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">مكان الارتفاع:</span>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-0.5">
          {HEIGHT_OPTIONS.map((opt) => {
            const active = placement.heightSide === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ heightSide: opt.id })}
                className={`rounded-lg font-bold transition ${btnHeight} ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">مكان العرض:</span>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-0.5">
          {WIDTH_OPTIONS.map((opt) => {
            const active = placement.widthSide === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ widthSide: opt.id })}
                className={`rounded-lg font-bold transition ${btnHeight} ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">مكان العمق:</span>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-0.5">
          {DEPTH_OPTIONS.map((opt) => {
            const active = placement.depthSide === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ depthSide: opt.id })}
                className={`rounded-lg font-bold transition ${btnHeight} ${
                  active
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
