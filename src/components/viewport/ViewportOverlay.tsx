import { Magnet } from 'lucide-react'
import { useDesignStore } from '../../store/useDesignStore'

export function ViewportOverlay() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const snapFeedback = useDesignStore((s) => s.snapFeedback)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null
  const activeSnapAxes = [
    snapFeedback.x ? 'X' : null,
    snapFeedback.y ? (snapFeedback.floor ? 'الأرضية' : 'Y') : null,
    snapFeedback.z ? 'Z' : null,
  ].filter(Boolean)

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
      {/* مقياس الشبكة */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-300 backdrop-blur-md">
        المربع = 10 سم · الخطوة = 0.5 سم
      </div>

      {/* حالة المغناطيس أثناء التحريك أو معلومات اللوح المحدد */}
      <div className="flex flex-col items-end gap-1.5">
        {isDraggingGizmo && snappingEnabled && activeSnapAxes.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/60 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 backdrop-blur-md">
            <Magnet className="h-3.5 w-3.5 text-emerald-300" />
            <span>التصاق ذكي ({activeSnapAxes.join(' · ')})</span>
          </div>
        )}

        {selectedPanel && (
          <div className="tabular-nums rounded-xl border border-amber-500/40 bg-slate-900/85 px-3 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-md">
            {selectedPanel.name}: {selectedPanel.dimensions.width} ×{' '}
            {selectedPanel.dimensions.height} × {selectedPanel.dimensions.depth} سم
          </div>
        )}
      </div>
    </div>
  )
}
