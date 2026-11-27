import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole, isLegOrBaseRole, type FurniturePanel } from '../../types/furniture'
import { computeOverallDimensions } from '../../utils/dimensions'
import { roundTo } from '../../utils/snapping'

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

export function SelectedDimensionTip() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const isExporting = useDesignStore((s) => s.isExporting)
  const liveResizePreview = useDesignStore((s) => s.liveResizePreview)

  const tipData = useMemo(() => {
    if (isExporting || selectedPanelIds.length === 0) {
      return null
    }

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
      return {
        title: single.name,
        dimensionsText: formatSinglePanelDimensions(single),
      }
    }

    const overall = computeOverallDimensions(selectedPanels)
    if (!overall) return null

    return {
      title: `${selectedPanels.length} قطع محددة`,
      dimensionsText: `المقاس الإجمالي: ${formatCmValue(overall.width)} × ${formatCmValue(overall.height)} × ${formatCmValue(overall.depth)} سم`,
    }
  }, [panels, selectedPanelIds, interfacesHidden, isExporting, liveResizePreview])

  if (!tipData) return null

  return (
    <div
      dir="rtl"
      className="pointer-events-none absolute top-4 right-4 z-30 select-none rounded-xl border border-amber-400/50 bg-slate-900/90 px-3 py-1.5 text-right text-xs text-white shadow-lg backdrop-blur-md"
    >
      <div className="font-semibold leading-tight text-amber-300">{tipData.title}</div>
      <div className="mt-0.5 font-medium leading-tight text-slate-100 tabular-nums">
        {tipData.dimensionsText}
      </div>
    </div>
  )
}
