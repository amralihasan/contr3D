import { Compass, Magnet } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  isInterfaceRole,
  isLegOrBaseRole,
  type CameraPreset,
  type FurniturePanel,
} from '../../types/furniture'
import { computeOverallDimensions } from '../../utils/dimensions'
import { roundTo } from '../../utils/snapping'

const CAMERA_BUTTONS: { preset: CameraPreset; label: string }[] = [
  { preset: 'perspective', label: '3D' },
  { preset: 'front', label: 'أمامي' },
  { preset: 'side', label: 'جانبي' },
  { preset: 'top', label: 'علوي' },
]

function formatCmValue(value: number): string {
  return String(roundTo(value, 1))
}

function formatSinglePanelDimensions(panel: FurniturePanel): string {
  const { width, height, depth } = panel.dimensions
  if (isLegOrBaseRole(panel.role) || panel.role === 'drawer') {
    return `عرض ${formatCmValue(width)} × ارتفاع ${formatCmValue(height)} × عمق ${formatCmValue(depth)} سم`
  }

  switch (panel.thicknessAxis) {
    case 'y':
      return `عرض ${formatCmValue(width)} × عمق ${formatCmValue(depth)} × سُمك ${formatCmValue(height)} سم`
    case 'x':
      return `عمق ${formatCmValue(depth)} × ارتفاع ${formatCmValue(height)} × سُمك ${formatCmValue(width)} سم`
    case 'z':
    default:
      return `عرض ${formatCmValue(width)} × ارتفاع ${formatCmValue(height)} × سُمك ${formatCmValue(depth)} سم`
  }
}

export function ViewportOverlay() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const isExporting = useDesignStore((s) => s.isExporting)
  const liveResizePreview = useDesignStore((s) => s.liveResizePreview)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const snapFeedback = useDesignStore((s) => s.snapFeedback)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const statusToast = useDesignStore((s) => s.statusToast)
  const clearStatusToast = useDesignStore((s) => s.clearStatusToast)

  const cameraPreset = useDesignStore((s) => s.cameraPreset)
  const setCameraPreset = useDesignStore((s) => s.setCameraPreset)

  useEffect(() => {
    if (!statusToast) return
    const timer = setTimeout(() => clearStatusToast(), 3200)
    return () => clearTimeout(timer)
  }, [statusToast, clearStatusToast])

  const selectionSummary = useMemo(() => {
    if (isExporting || selectedPanelIds.length === 0) return null

    const selectedSet = new Set(selectedPanelIds)
    const selectedPanels: FurniturePanel[] = []

    for (const panel of panels) {
      if (!selectedSet.has(panel.id)) continue
      if (interfacesHidden && isInterfaceRole(panel.role)) continue
      if (liveResizePreview && liveResizePreview.id === panel.id) {
        selectedPanels.push({
          ...panel,
          dimensions: liveResizePreview.dimensions,
          position: liveResizePreview.position,
        })
      } else {
        selectedPanels.push(panel)
      }
    }

    if (selectedPanels.length === 0) return null

    if (selectedPanels.length === 1) {
      const single = selectedPanels[0]
      return `${single.name}: ${formatSinglePanelDimensions(single)}`
    }

    const overall = computeOverallDimensions(selectedPanels)
    if (!overall) {
      return `${selectedPanels.length} قطع محددة`
    }

    return `${selectedPanels.length} قطع محددة — ${formatCmValue(overall.width)} × ${formatCmValue(overall.height)} × ${formatCmValue(overall.depth)} سم`
  }, [panels, selectedPanelIds, interfacesHidden, isExporting, liveResizePreview])

  const activeSnapAxes = [
    snapFeedback.x ? 'X' : null,
    snapFeedback.y ? (snapFeedback.floor ? 'الأرضية' : 'Y') : null,
    snapFeedback.z ? 'Z' : null,
  ].filter(Boolean)

  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-wrap items-start justify-between gap-2">
      {/* مقياس الشبكة + حالة الالتصاق */}
      <div className="flex flex-col items-start gap-1.5">
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/75 px-2.5 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-md">
          المربع = 10 سم · الخطوة = 0.5 سم
        </div>

        {isDraggingGizmo && snappingEnabled && activeSnapAxes.length > 0 && (
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${
              snapFeedback.guide
                ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-100'
                : 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
            }`}
          >
            <Magnet
              className={`h-3.5 w-3.5 ${
                snapFeedback.guide ? 'text-cyan-300' : 'text-emerald-300'
              }`}
            />
            <span>
              {snapFeedback.guide
                ? `التصاق بالعلام (${activeSnapAxes.join(' · ')})`
                : `التصاق ذكي (${activeSnapAxes.join(' · ')})`}
            </span>
          </div>
        )}
      </div>

      {/* اليسار: أزرار زوايا الكاميرا العائمة + معلومات العنصر + الإشعار */}
      <div className="flex flex-col items-end gap-1.5">
        {/* شريط الكاميرا العائم */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/85 p-1 shadow-lg backdrop-blur-md">
          <span className="hidden items-center px-1.5 text-slate-400 sm:flex">
            <Compass className="h-3.5 w-3.5" />
          </span>
          {CAMERA_BUTTONS.map((btn) => {
            const active = cameraPreset === btn.preset
            return (
              <button
                key={btn.preset}
                type="button"
                onClick={() => setCameraPreset(btn.preset)}
                className={`h-8 min-w-[40px] rounded-full px-2.5 text-[11px] font-bold transition ${
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

        {statusToast && (
          <div className="rounded-xl border border-sky-400/60 bg-sky-950/90 px-3 py-1.5 text-xs font-bold text-sky-100 shadow-lg backdrop-blur-md">
            {statusToast}
          </div>
        )}

        {selectionSummary && (
          <div className="select-none tabular-nums rounded-xl border border-amber-500/40 bg-slate-900/85 px-2.5 py-1 text-[11px] font-bold text-amber-200 backdrop-blur-md">
            {selectionSummary}
          </div>
        )}
      </div>
    </div>
  )
}
