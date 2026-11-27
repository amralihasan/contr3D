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
    <group>
      <Line points={[start, end]} color={color} lineWidth={1.8} />
      <Html position={mid} center distanceFactor={210} zIndexRange={[5, 0]}>
        <div
          className={`pointer-events-none select-none whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-md backdrop-blur-sm tabular-nums ${badgeClassName}`}
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

  const visiblePanels = useMemo(
    () => (interfacesHidden ? panels.filter((p) => !isInterfaceRole(p.role)) : panels),
    [panels, interfacesHidden]
  )

  const overall = useMemo(
    () => (isDraggingGizmo ? null : computeOverallDimensions(visiblePanels)),
    [visiblePanels, isDraggingGizmo]
  )

  const selectedPanel = visiblePanels.find((p) => p.id === selectedPanelId) ?? null
  const clearances = useMemo(
    () =>
      !isDraggingGizmo && selectedPanel
        ? computeSelectedClearances(selectedPanel, visiblePanels)
        : [],
    [selectedPanel, visiblePanels, isDraggingGizmo]
  )

  if (!showDimensions || !overall || isDraggingGizmo) return null

  const offset = 14
  const floorY = 0.6

  return (
    <group>
      {/* العرض الكلي (X) */}
      <DimensionLine
        start={[overall.minX, floorY, overall.maxZ + offset]}
        end={[overall.maxX, floorY, overall.maxZ + offset]}
        label={`العرض: ${overall.width} سم`}
        color="#38bdf8"
        badgeClassName="border-sky-400/60 bg-slate-950/90 text-sky-200"
      />

      {/* الارتفاع الكلي (Y) */}
      <DimensionLine
        start={[overall.maxX + offset, overall.minY, overall.maxZ]}
        end={[overall.maxX + offset, overall.maxY, overall.maxZ]}
        label={`الارتفاع: ${overall.height} سم`}
        color="#38bdf8"
        badgeClassName="border-sky-400/60 bg-slate-950/90 text-sky-200"
      />

      {/* العمق الكلي (Z) */}
      <DimensionLine
        start={[overall.maxX + offset, floorY, overall.minZ]}
        end={[overall.maxX + offset, floorY, overall.maxZ]}
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
