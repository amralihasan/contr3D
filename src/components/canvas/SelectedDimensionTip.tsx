import { Html } from '@react-three/drei'
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
  const toolMode = useDesignStore((s) => s.toolMode)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const liveResizePreview = useDesignStore((s) => s.liveResizePreview)

  const tipData = useMemo(() => {
    if (isExporting || toolMode !== 'select' || isDraggingGizmo || selectedPanelIds.length === 0) {
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

    const overall = computeOverallDimensions(selectedPanels)
    if (!overall) return null

    const centerX = (overall.minX + overall.maxX) / 2
    const topY = overall.maxY + 4
    const centerZ = (overall.minZ + overall.maxZ) / 2

    if (selectedPanels.length === 1) {
      const single = selectedPanels[0]
      return {
        position: [centerX, topY, centerZ] as [number, number, number],
        title: single.name,
        dimensionsText: formatSinglePanelDimensions(single),
      }
    }

    return {
      position: [centerX, topY, centerZ] as [number, number, number],
      title: `${selectedPanels.length} قطع محددة`,
      dimensionsText: `${formatCmValue(overall.width)} × ${formatCmValue(overall.height)} × ${formatCmValue(overall.depth)} سم`,
    }
  }, [
    panels,
    selectedPanelIds,
    interfacesHidden,
    isExporting,
    toolMode,
    isDraggingGizmo,
    liveResizePreview,
  ])

  if (!tipData) return null

  return (
    <Html
      position={tipData.position}
      center
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        dir="rtl"
        className="pointer-events-none select-none rounded-lg border border-amber-400/50 bg-slate-900/90 px-2.5 py-1 text-center text-xs text-white shadow-lg backdrop-blur-sm whitespace-nowrap"
      >
        <div className="font-semibold text-amber-300 leading-tight">{tipData.title}</div>
        <div className="mt-0.5 text-[11px] font-medium text-slate-100 leading-tight">
          {tipData.dimensionsText}
        </div>
      </div>
    </Html>
  )
}
