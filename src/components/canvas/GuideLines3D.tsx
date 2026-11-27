import { Html, Line } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import type { GuideLine, Vec3 } from '../../types/furniture'
import { buildGuideLineGeometry } from '../../utils/tapeMeasure'

interface SingleGuideProps {
  guide: GuideLine
  isSelected: boolean
  onSelect: (id: string) => void
}

function SingleGuide({ guide, isSelected, onSelect }: SingleGuideProps) {
  const { hitPos, hitQuat, hitLen } = useMemo(() => {
    const start = new THREE.Vector3(...guide.spanStart)
    const end = new THREE.Vector3(...guide.spanEnd)
    const dir = new THREE.Vector3().subVectors(end, start)
    const len = Math.max(1, dir.length())
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    )
    return { hitPos: mid, hitQuat: quat, hitLen: len }
  }, [guide.spanStart, guide.spanEnd])

  return (
    <group>
      <Line
        points={[guide.spanStart, guide.spanEnd]}
        color={isSelected ? '#fbbf24' : '#22d3ee'}
        lineWidth={isSelected ? 3 : 2}
        dashed
        dashSize={2.4}
        gapSize={1.4}
      />

      {/* نقطة ارتكاز صغيرة على منتصف العلام */}
      <mesh position={guide.labelPosition}>
        <sphereGeometry args={[isSelected ? 1.1 : 0.75, 12, 12]} />
        <meshBasicMaterial color={isSelected ? '#fbbf24' : '#22d3ee'} />
      </mesh>

      {/* منطقة ضغط غير مرئية عريضة لتسهيل تحديد العلام باللمس */}
      <mesh
        position={hitPos}
        quaternion={hitQuat}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(guide.id)
        }}
      >
        <cylinderGeometry args={[1.8, 1.8, hitLen, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <Html position={guide.labelPosition} center distanceFactor={210} zIndexRange={[8, 0]}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(guide.id)
          }}
          className={`tabular-nums select-none whitespace-nowrap rounded-lg border px-2 py-0.5 text-[11px] font-bold shadow-md backdrop-blur-sm transition ${
            isSelected
              ? 'border-amber-400 bg-amber-500 text-slate-950'
              : 'border-cyan-400/70 bg-slate-950/90 text-cyan-200 hover:border-amber-400'
          }`}
        >
          علام: {guide.distanceCm} سم
        </button>
      </Html>
    </group>
  )
}

export function GuideLines3D() {
  const guides = useDesignStore((s) => s.guides)
  const guidesVisible = useDesignStore((s) => s.guidesVisible)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)
  const selectGuide = useDesignStore((s) => s.selectGuide)

  const toolMode = useDesignStore((s) => s.toolMode)
  const tapeMode = useDesignStore((s) => s.tapeMode)
  const activeReferenceEdge = useDesignStore((s) => s.activeReferenceEdge)
  const draftGuideDistanceCm = useDesignStore((s) => s.draftGuideDistanceCm)
  const draftGuideDirection = useDesignStore((s) => s.draftGuideDirection)

  const previewGuide = useMemo(() => {
    if (toolMode !== 'tape' || tapeMode !== 'guide' || !activeReferenceEdge) return null
    return buildGuideLineGeometry({
      id: 'preview_guide',
      panelId: activeReferenceEdge.panelId,
      panelName: activeReferenceEdge.panelName,
      edgeLabel: activeReferenceEdge.edgeLabel,
      lineAxis: activeReferenceEdge.lineAxis,
      offsetAxis: activeReferenceEdge.offsetAxis,
      normalAxis: activeReferenceEdge.normalAxis,
      surfaceCoord: activeReferenceEdge.surfaceCoord,
      surfaceSign: activeReferenceEdge.surfaceSign,
      referenceEdgeCoord: activeReferenceEdge.referenceEdgeCoord,
      direction: draftGuideDirection,
      distanceCm: draftGuideDistanceCm,
      spanMin: activeReferenceEdge.spanMin,
      spanMax: activeReferenceEdge.spanMax,
    })
  }, [
    toolMode,
    tapeMode,
    activeReferenceEdge,
    draftGuideDistanceCm,
    draftGuideDirection,
  ])

  const refMid: Vec3 | null = activeReferenceEdge
    ? [
        (activeReferenceEdge.edgeStart[0] + activeReferenceEdge.edgeEnd[0]) / 2,
        (activeReferenceEdge.edgeStart[1] + activeReferenceEdge.edgeEnd[1]) / 2,
        (activeReferenceEdge.edgeStart[2] + activeReferenceEdge.edgeEnd[2]) / 2,
      ]
    : null

  return (
    <group>
      {guidesVisible &&
        guides.map((guide) => (
          <SingleGuide
            key={guide.id}
            guide={guide}
            isSelected={guide.id === selectedGuideId}
            onSelect={selectGuide}
          />
        ))}

      {/* معاينة الحافة المرجعية والخط الإرشادي المباشر أثناء العمل */}
      {toolMode === 'tape' && tapeMode === 'guide' && activeReferenceEdge && previewGuide && (
        <group>
          <Line
            points={[activeReferenceEdge.edgeStart, activeReferenceEdge.edgeEnd]}
            color="#f59e0b"
            lineWidth={3.5}
          />
          <Line
            points={[previewGuide.spanStart, previewGuide.spanEnd]}
            color="#fb923c"
            lineWidth={2.5}
            dashed
            dashSize={2.4}
            gapSize={1.4}
          />
          {refMid && (
            <Line
              points={[refMid, previewGuide.labelPosition]}
              color="#fdba74"
              lineWidth={1.5}
              dashed
              dashSize={1.2}
              gapSize={1}
            />
          )}
          <Html
            position={previewGuide.labelPosition}
            center
            distanceFactor={200}
            zIndexRange={[10, 0]}
          >
            <div className="tabular-nums pointer-events-none select-none whitespace-nowrap rounded-lg border border-orange-400 bg-orange-950/95 px-2.5 py-1 text-xs font-extrabold text-orange-100 shadow-lg">
              {previewGuide.distanceCm} سم
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
