import { Html, Line } from '@react-three/drei'
import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole, type Vec3 } from '../../types/furniture'
import { computeOverallDimensions, computeSelectedClearances } from '../../utils/dimensions'

interface DimensionLineProps {
  start: Vec3
  end: Vec3
  label: string
  color: string
  badgeClassName: string
}

function DimensionLine({ start, end, label, color, badgeClassName }: DimensionLineProps) {
  const mid: Vec3 = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ]

  return (
    <group name="workspace-dimensions-group">
      <Line points={[start, end]} color={color} lineWidth={1.6} />
      <Html position={mid} center distanceFactor={135} zIndexRange={[5, 0]}>
        <div
          className={`pointer-events-none select-none whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm tabular-nums ${badgeClassName}`}
        >
          {label}
        </div>
      </Html>
    </group>
  )
}

export function DimensionsOverlay3D() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const showDimensions = useDesignStore((s) => s.showDimensions)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const isExporting = useDesignStore((s) => s.isExporting)

  const visiblePanels = useMemo(
    () => (interfacesHidden ? panels.filter((p) => !isInterfaceRole(p.role)) : panels),
    [panels, interfacesHidden]
  )

  const dimensionPlacement = useDesignStore((s) => s.dimensionPlacement)

  const overall = useMemo(
    () => (isDraggingGizmo || isExporting ? null : computeOverallDimensions(visiblePanels)),
    [visiblePanels, isDraggingGizmo, isExporting]
  )

  const selectedPanel = visiblePanels.find((p) => p.id === selectedPanelId) ?? null
  const clearances = useMemo(
    () =>
      !isDraggingGizmo && !isExporting && selectedPanel
        ? computeSelectedClearances(selectedPanel, visiblePanels)
        : [],
    [selectedPanel, visiblePanels, isDraggingGizmo, isExporting]
  )

  if (!showDimensions || !overall || isDraggingGizmo || isExporting) return null

  const offset = 14
  const floorY = 0.6
  const sameSideHeightDepth = dimensionPlacement.heightSide === dimensionPlacement.depthSide
  const depthOffset = sameSideHeightDepth ? offset + 14 : offset

  // موضع خط العرض (X)
  const widthStart: Vec3 =
    dimensionPlacement.widthSide === 'back'
      ? [overall.minX, floorY, overall.minZ - offset]
      : dimensionPlacement.widthSide === 'top'
        ? [overall.minX, overall.maxY + offset, overall.maxZ]
        : [overall.minX, floorY, overall.maxZ + offset]
  const widthEnd: Vec3 =
    dimensionPlacement.widthSide === 'back'
      ? [overall.maxX, floorY, overall.minZ - offset]
      : dimensionPlacement.widthSide === 'top'
        ? [overall.maxX, overall.maxY + offset, overall.maxZ]
        : [overall.maxX, floorY, overall.maxZ + offset]

  // موضع خط الارتفاع (Y)
  const heightX =
    dimensionPlacement.heightSide === 'left' ? overall.minX - offset : overall.maxX + offset

  // موضع خط العمق (Z) مع إبعاد إضافي عند تشاركه نفس جهة الارتفاع لمنع التداخل
  const depthX =
    dimensionPlacement.depthSide === 'left'
      ? overall.minX - depthOffset
      : overall.maxX + depthOffset

  return (
    <group name="workspace-dimensions-group">
      {/* العرض الكلي (X) */}
      <DimensionLine
        start={widthStart}
        end={widthEnd}
        label={`العرض: ${overall.width} سم`}
        color="#38bdf8"
        badgeClassName="border-sky-400/60 bg-slate-950/90 text-sky-200"
      />

      {/* الارتفاع الكلي (Y) */}
      <DimensionLine
        start={[heightX, overall.minY, overall.maxZ]}
        end={[heightX, overall.maxY, overall.maxZ]}
        label={`الارتفاع: ${overall.height} سم`}
        color="#38bdf8"
        badgeClassName="border-sky-400/60 bg-slate-950/90 text-sky-200"
      />

      {/* العمق الكلي (Z) */}
      <DimensionLine
        start={[depthX, floorY, overall.minZ]}
        end={[depthX, floorY, overall.maxZ]}
        label={`العمق: ${overall.depth} سم`}
        color="#38bdf8"
        badgeClassName="border-sky-400/60 bg-slate-950/90 text-sky-200"
      />

      {/* المسافات الصافية للوح المحدد */}
      {clearances.map((seg) => (
        <DimensionLine
          key={seg.id}
          start={seg.start}
          end={seg.end}
          label={seg.label}
          color="#34d399"
          badgeClassName="border-emerald-400/70 bg-emerald-950/90 text-emerald-200"
        />
      ))}
    </group>
  )
}
