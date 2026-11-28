import { Html, Line } from '@react-three/drei'
import { useMemo, useState } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import type { GuideLine, Vec3 } from '../../types/furniture'
import { buildGuideLineGeometry, getAxisColor } from '../../utils/tapeMeasure'

interface SingleGuideProps {
  guide: GuideLine
  isSelected: boolean
  onSelect: (id: string) => void
  onUpdateDistance: (id: string, distanceCm: number) => void
  onDelete: (id: string) => void
}

function SingleGuide({
  guide,
  isSelected,
  onSelect,
  onUpdateDistance,
  onDelete,
}: SingleGuideProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftVal, setDraftVal] = useState(String(guide.distanceCm))

  const { hitPos, hitQuat, hitLen } = useMemo(() => {
    const start = new THREE.Vector3(...guide.spanStart)
    const end = new THREE.Vector3(...guide.spanEnd)
    const dir = new THREE.Vector3().subVectors(end, start)
    const len = Math.max(1, dir.length())
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      len > 0.001 ? dir.clone().normalize() : new THREE.Vector3(0, 1, 0)
    )
    return { hitPos: mid, hitQuat: quat, hitLen: len }
  }, [guide.spanStart, guide.spanEnd])

  const lineColor = isSelected
    ? '#fbbf24'
    : guide.kind === 'point'
      ? getAxisColor(guide.lockedAxis ?? null)
      : '#22d3ee'

  const commitInlineEdit = () => {
    setIsEditing(false)
    const parsed = Number.parseFloat(draftVal)
    if (Number.isFinite(parsed) && parsed >= 0) {
      onUpdateDistance(guide.id, parsed)
    }
  }

  return (
    <group name="workspace-guides-group">
      <Line
        points={[guide.spanStart, guide.spanEnd]}
        color={lineColor}
        lineWidth={isSelected ? 3 : 2.2}
        dashed
        dashSize={2.4}
        gapSize={1.4}
      />

      {guide.kind === 'point' ? (
        <>
          <mesh position={guide.spanStart}>
            <sphereGeometry args={[isSelected ? 1.05 : 0.75, 12, 12]} />
            <meshBasicMaterial color={lineColor} />
          </mesh>
          <mesh position={guide.spanEnd}>
            <sphereGeometry args={[isSelected ? 1.05 : 0.75, 12, 12]} />
            <meshBasicMaterial color={lineColor} />
          </mesh>
        </>
      ) : (
        <mesh position={guide.labelPosition}>
          <sphereGeometry args={[isSelected ? 1.1 : 0.75, 12, 12]} />
          <meshBasicMaterial color={lineColor} />
        </mesh>
      )}

      {/* منطقة ضغط غير مرئية لتسهيل التحديد */}
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

      <Html position={guide.labelPosition} center distanceFactor={135} zIndexRange={[12, 0]}>
        <div
          className={`pointer-events-auto flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-sm transition ${
            isSelected
              ? 'border-amber-400 bg-amber-500 text-slate-950'
              : 'border-cyan-400/70 bg-slate-950/90 text-cyan-100 hover:border-amber-400'
          }`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                min={0}
                max={999}
                autoFocus
                value={draftVal}
                onChange={(e) => setDraftVal(e.target.value)}
                onBlur={commitInlineEdit}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Enter') {
                    commitInlineEdit()
                  } else if (e.key === 'Escape') {
                    setIsEditing(false)
                  }
                }}
                className="tabular-nums h-6 w-14 rounded bg-slate-900 px-1 text-center text-[11px] font-extrabold text-white outline-none ring-1 ring-amber-400"
              />
              <span className="text-[10px] opacity-85">سم</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect(guide.id)
                setDraftVal(String(guide.distanceCm))
                setIsEditing(true)
              }}
              className="tabular-nums cursor-pointer select-none whitespace-nowrap px-0.5"
              title="اضغط لتعديل المسافة بالـ سم"
            >
              علام: {guide.distanceCm} سم
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(guide.id)
            }}
            className={`flex h-4 w-4 items-center justify-center rounded text-[11px] leading-none transition ${
              isSelected
                ? 'bg-slate-950/20 text-slate-950 hover:bg-rose-600 hover:text-white'
                : 'text-rose-300 hover:bg-rose-500/30 hover:text-white'
            }`}
            title="حذف هذا العلام"
            aria-label="حذف العلام"
          >
            ×
          </button>
        </div>
      </Html>
    </group>
  )
}

export function GuideLines3D() {
  const guides = useDesignStore((s) => s.guides)
  const guidesVisible = useDesignStore((s) => s.guidesVisible)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)
  const selectGuide = useDesignStore((s) => s.selectGuide)
  const updateGuideDistance = useDesignStore((s) => s.updateGuideDistance)
  const deleteGuide = useDesignStore((s) => s.deleteGuide)
  const isExporting = useDesignStore((s) => s.isExporting)

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

  if (isExporting) return null

  return (
    <group name="workspace-guides-group">
      {guidesVisible &&
        guides.map((guide) => (
          <SingleGuide
            key={guide.id}
            guide={guide}
            isSelected={guide.id === selectedGuideId}
            onSelect={selectGuide}
            onUpdateDistance={updateGuideDistance}
            onDelete={deleteGuide}
          />
        ))}

      {/* معاينة الحافة المرجعية والخط الإرشادي المباشر في وضع السحب من حافة */}
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
            distanceFactor={135}
            zIndexRange={[10, 0]}
          >
            <div className="tabular-nums pointer-events-none select-none whitespace-nowrap rounded-md border border-orange-400 bg-orange-950/95 px-2 py-0.5 text-[11px] font-bold text-orange-100 shadow-sm">
              {previewGuide.distanceCm} سم
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
