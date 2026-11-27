import { MATERIALS } from '../../constants/materials'
import {
  STANDARD_SHEET_LENGTH_CM,
  STANDARD_SHEET_WIDTH_CM,
  type PackedSheet,
} from '../../utils/sheetOptimizer'

interface SheetNestingDiagramProps {
  sheet: PackedSheet
  printMode?: boolean
}

export function SheetNestingDiagram({ sheet, printMode = false }: SheetNestingDiagramProps) {
  const matSpec = MATERIALS[sheet.materialId]

  return (
    <div
      className={`rounded-2xl border p-3 ${
        printMode
          ? 'border-slate-300 bg-white text-slate-900 break-inside-avoid'
          : 'border-slate-800 bg-slate-950/70 text-slate-100'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 font-bold">
          <span
            className="h-3.5 w-3.5 rounded-full ring-1 ring-slate-400/50"
            style={{ backgroundColor: matSpec.swatch }}
          />
          <span>
            لوح #{sheet.sheetNumber} — {sheet.materialLabel} ({sheet.thicknessMm} مم)
          </span>
        </div>
        <div className="tabular-nums flex items-center gap-3 text-[11px]">
          <span className={printMode ? 'text-emerald-700 font-bold' : 'text-emerald-300 font-bold'}>
            استغلال: {sheet.utilizationPct}%
          </span>
          <span className={printMode ? 'text-rose-700 font-bold' : 'text-rose-300 font-bold'}>
            هالك: {sheet.wastePct}%
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${STANDARD_SHEET_LENGTH_CM} ${STANDARD_SHEET_WIDTH_CM}`}
        className="w-full rounded-lg border border-slate-500/40"
        style={{
          background: printMode ? '#f8fafc' : '#0f172a',
        }}
      >
        {/* شبكة الهالك الخلفية */}
        <defs>
          <pattern
            id={`waste-${sheet.materialId}-${sheet.thicknessMm}-${sheet.sheetNumber}-${printMode ? 'p' : 's'}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke={printMode ? '#cbd5e1' : '#1e293b'}
              strokeWidth="1.5"
            />
          </pattern>
        </defs>

        <rect
          x={0}
          y={0}
          width={STANDARD_SHEET_LENGTH_CM}
          height={STANDARD_SHEET_WIDTH_CM}
          fill={`url(#waste-${sheet.materialId}-${sheet.thicknessMm}-${sheet.sheetNumber}-${printMode ? 'p' : 's'})`}
        />

        {sheet.placements.map((p) => {
          const canShowLabel = p.width >= 16 && p.height >= 10
          const canShowDims = p.width >= 18 && p.height >= 16
          const fontSizeName = Math.max(3.6, Math.min(6, p.height * 0.22, p.width * 0.08))
          const fontSizeDim = Math.max(3.2, Math.min(4.8, fontSizeName * 0.85))

          return (
            <g key={p.id}>
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                fill={printMode ? '#fef3c7' : '#d97706'}
                fillOpacity={printMode ? 0.9 : 0.28}
                stroke={printMode ? '#92400e' : '#fbbf24'}
                strokeWidth="0.65"
              />
              {canShowLabel && (
                <text
                  x={p.x + p.width / 2}
                  y={p.y + p.height / 2 - (canShowDims ? fontSizeDim * 0.55 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={printMode ? '#1e293b' : '#fef3c7'}
                  fontSize={fontSizeName}
                  fontWeight="700"
                  fontFamily="Cairo, sans-serif"
                >
                  {p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name}
                </text>
              )}
              {canShowDims && (
                <text
                  x={p.x + p.width / 2}
                  y={p.y + p.height / 2 + fontSizeName * 0.75}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={printMode ? '#475569' : '#fde68a'}
                  fontSize={fontSizeDim}
                  fontWeight="600"
                  fontFamily="sans-serif"
                >
                  {p.width}×{p.height}
                  {p.rotated ? ' ↻' : ''}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-1.5 flex items-center justify-between text-[11px] opacity-75">
        <span>مقاس اللوح القياسي: 244 × 122 سم</span>
        <span>عدد القطع على اللوح: {sheet.placements.length}</span>
      </div>
    </div>
  )
}
