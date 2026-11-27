import { Html } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { MAX_PANEL_DIM_CM, SNAP_THRESHOLD_CM } from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import {
  isLegOrBaseRole,
  type Axis,
  type GuideLine,
  type PanelDimensions,
  type SnapFeedback,
  type Vec3,
} from '../../types/furniture'
import { getPanelWorldBox, roundTo, type WorldBox } from '../../utils/snapping'

const MIN_RESIZE_CM = 5
const RESIZE_STEP_CM = 0.5

interface PanelResizeHandlesProps {
  selectedObject: THREE.Object3D | null
}

interface FaceHandleDef {
  id: string
  axis: Axis
  sign: 1 | -1
  dimKey: keyof PanelDimensions
  label: string
  axisColor: string
  localDir: Vec3
}

const ALL_FACE_HANDLES: FaceHandleDef[] = [
  {
    id: '+x',
    axis: 'x',
    sign: 1,
    dimKey: 'width',
    label: 'العرض',
    axisColor: '#f43f5e',
    localDir: [1, 0, 0],
  },
  {
    id: '-x',
    axis: 'x',
    sign: -1,
    dimKey: 'width',
    label: 'العرض',
    axisColor: '#f43f5e',
    localDir: [-1, 0, 0],
  },
  {
    id: '+y',
    axis: 'y',
    sign: 1,
    dimKey: 'height',
    label: 'الارتفاع',
    axisColor: '#22c55e',
    localDir: [0, 1, 0],
  },
  {
    id: '-y',
    axis: 'y',
    sign: -1,
    dimKey: 'height',
    label: 'الارتفاع',
    axisColor: '#22c55e',
    localDir: [0, -1, 0],
  },
  {
    id: '+z',
    axis: 'z',
    sign: 1,
    dimKey: 'depth',
    label: 'العمق',
    axisColor: '#3b82f6',
    localDir: [0, 0, 1],
  },
  {
    id: '-z',
    axis: 'z',
    sign: -1,
    dimKey: 'depth',
    label: 'العمق',
    axisColor: '#3b82f6',
    localDir: [0, 0, -1],
  },
]

interface ActiveResizeDrag {
  panelId: string
  face: FaceHandleDef
  startDims: PanelDimensions
  startPos: Vec3
  panelQuat: THREE.Quaternion
  worldDir: THREE.Vector3
  worldAxis: Axis
  worldSign: 1 | -1
  startBox: WorldBox
  startMovingCoord: number
  otherBoxes: WorldBox[]
  guides: GuideLine[]
  dragPlane: THREE.Plane
  startHitPoint: THREE.Vector3
  latestDims: PanelDimensions
  latestPos: Vec3
}

function getWorldAxisRange(box: WorldBox, axis: Axis): [number, number] {
  if (axis === 'x') return [box.minX, box.maxX]
  if (axis === 'y') return [box.minY, box.maxY]
  return [box.minZ, box.maxZ]
}

export function PanelResizeHandles({ selectedObject }: PanelResizeHandlesProps) {
  const { camera, gl, get } = useThree()

  const panels = useDesignStore((s) => s.panels)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const toolMode = useDesignStore((s) => s.toolMode)
  const transformMode = useDesignStore((s) => s.transformMode)
  const isExporting = useDesignStore((s) => s.isExporting)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)

  const beginResizeDrag = useDesignStore((s) => s.beginResizeDrag)
  const setLiveResizePreview = useDesignStore((s) => s.setLiveResizePreview)
  const endResizeDrag = useDesignStore((s) => s.endResizeDrag)
  const setSnapFeedback = useDesignStore((s) => s.setSnapFeedback)

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<{
    dims: PanelDimensions
    pos: Vec3
    tooltipText: string
    tooltipLocalPos: Vec3
  } | null>(null)

  const dragRef = useRef<ActiveResizeDrag | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())

  const panel = useMemo(() => {
    if (
      !selectedObject ||
      !selectedPanelId ||
      selectedPanelIds.length !== 1 ||
      toolMode !== 'select' ||
      transformMode !== 'resize' ||
      isExporting
    ) {
      return null
    }
    return panels.find((p) => p.id === selectedPanelId) ?? null
  }, [
    selectedObject,
    selectedPanelId,
    selectedPanelIds.length,
    toolMode,
    transformMode,
    isExporting,
    panels,
  ])

  const visibleFaces = useMemo(() => {
    if (!panel) return []
    const isVolumetricAssembly = panel.role === 'drawer' || isLegOrBaseRole(panel.role)
    if (isVolumetricAssembly) return ALL_FACE_HANDLES
    // حماية سُمك الكونتر القياسي (1.8 / 0.6 سم) للألواح والضلف
    return ALL_FACE_HANDLES.filter((f) => f.axis !== panel.thicknessAxis)
  }, [panel])

  useEffect(() => {
    if (!draggingId) return

    const finishDrag = () => {
      const drag = dragRef.current
      dragRef.current = null

      const controls = get().controls as { enabled?: boolean } | null
      if (controls) controls.enabled = true

      if (selectedObject) {
        selectedObject.scale.set(1, 1, 1)
      }

      if (drag) {
        if (selectedObject) {
          selectedObject.position.set(drag.latestPos[0], drag.latestPos[1], drag.latestPos[2])
        }
        endResizeDrag({
          id: drag.panelId,
          dimensions: drag.latestDims,
          position: drag.latestPos,
        })
      } else {
        endResizeDrag()
      }

      setDraggingId(null)
      setPreviewState(null)
      setLiveResizePreview(null)
    }

    const onPointerMove = (ev: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || !selectedObject) return

      const rect = gl.domElement.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return

      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      )
      raycasterRef.current.setFromCamera(ndc, camera)

      const hit = new THREE.Vector3()
      if (!raycasterRef.current.ray.intersectPlane(drag.dragPlane, hit)) return

      const rawDelta = hit.sub(drag.startHitPoint).dot(drag.worldDir)
      const startDim = drag.startDims[drag.face.dimKey]
      let newDim = Math.max(MIN_RESIZE_CM, Math.min(MAX_PANEL_DIM_CM, startDim + rawDelta))

      const feedback: SnapFeedback = { x: false, y: false, z: false, floor: false, guide: false }

      if (snappingEnabled) {
        const otherAxes: Axis[] = (['x', 'y', 'z'] as const).filter((a) => a !== drag.worldAxis)
        const [a1Min, a1Max] = getWorldAxisRange(drag.startBox, otherAxes[0])
        const [a2Min, a2Max] = getWorldAxisRange(drag.startBox, otherAxes[1])

        const proposedCoord = drag.startMovingCoord + drag.worldSign * (newDim - startDim)
        let bestDist = SNAP_THRESHOLD_CM
        let snappedCoord: number | null = null
        let snappedGuide = false
        let snappedFloor = false

        if (drag.worldAxis === 'y' && drag.worldSign === -1) {
          const distFloor = Math.abs(proposedCoord)
          if (distFloor <= bestDist) {
            bestDist = distFloor
            snappedCoord = 0
            snappedFloor = true
          }
        }

        for (const g of drag.guides) {
          if (g.offsetAxis !== drag.worldAxis) continue
          const dist = Math.abs(proposedCoord - g.worldCoord)
          if (dist < bestDist) {
            bestDist = dist
            snappedCoord = g.worldCoord
            snappedGuide = true
            snappedFloor = drag.worldAxis === 'y' && Math.abs(g.worldCoord) < 0.01
          }
        }

        for (const ob of drag.otherBoxes) {
          const [b1Min, b1Max] = getWorldAxisRange(ob, otherAxes[0])
          const [b2Min, b2Max] = getWorldAxisRange(ob, otherAxes[1])
          if (
            b1Max < a1Min - 15 ||
            b1Min > a1Max + 15 ||
            b2Max < a2Min - 15 ||
            b2Min > a2Max + 15
          ) {
            continue
          }

          const [obMin, obMax] = getWorldAxisRange(ob, drag.worldAxis)
          for (const candidate of [obMin, obMax]) {
            const dist = Math.abs(proposedCoord - candidate)
            if (dist < bestDist) {
              bestDist = dist
              snappedCoord = candidate
              snappedGuide = false
              snappedFloor = drag.worldAxis === 'y' && Math.abs(candidate) < 0.01
            }
          }
        }

        if (snappedCoord !== null) {
          newDim = roundTo(startDim + drag.worldSign * (snappedCoord - drag.startMovingCoord), 2)
          feedback[drag.worldAxis] = true
          feedback.guide = snappedGuide
          feedback.floor = snappedFloor
        } else {
          newDim = roundTo(Math.round(newDim / RESIZE_STEP_CM) * RESIZE_STEP_CM, 2)
        }
      }

      // منع الجزء السفلي من النزول تحت الأرضية Y = 0
      if (drag.worldAxis === 'y' && drag.worldSign === -1) {
        const maxDownExtend = drag.startMovingCoord
        const maxDimAllowed = startDim + maxDownExtend
        if (newDim > maxDimAllowed) {
          newDim = roundTo(maxDimAllowed, 2)
          feedback.y = true
          feedback.floor = true
        }
      }

      newDim = roundTo(Math.max(MIN_RESIZE_CM, Math.min(MAX_PANEL_DIM_CM, newDim)), 2)

      const appliedDelta = newDim - startDim
      const nextDims: PanelDimensions = {
        ...drag.startDims,
        [drag.face.dimKey]: newDim,
      }
      const nextPosVec = new THREE.Vector3(...drag.startPos).addScaledVector(
        drag.worldDir,
        appliedDelta / 2
      )
      const nextPos: Vec3 = [
        roundTo(nextPosVec.x, 2),
        roundTo(nextPosVec.y, 2),
        roundTo(nextPosVec.z, 2),
      ]

      // تحديث مباشر لـ Three.js بدون إعادة رسم شجرة الألواح في React أثناء السحب
      selectedObject.position.set(nextPos[0], nextPos[1], nextPos[2])
      selectedObject.scale.set(
        drag.face.axis === 'x' ? newDim / startDim : 1,
        drag.face.axis === 'y' ? newDim / startDim : 1,
        drag.face.axis === 'z' ? newDim / startDim : 1
      )

      drag.latestDims = nextDims
      drag.latestPos = nextPos
      setSnapFeedback(feedback)
      setLiveResizePreview({
        id: drag.panelId,
        dimensions: nextDims,
        position: nextPos,
      })

      const faceHalf = newDim / 2 + 4.5
      setPreviewState({
        dims: nextDims,
        pos: nextPos,
        tooltipText: `${drag.face.label}: ${newDim} سم`,
        tooltipLocalPos: [
          drag.face.localDir[0] * faceHalf,
          drag.face.localDir[1] * faceHalf,
          drag.face.localDir[2] * faceHalf,
        ],
      })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', finishDrag)
    window.addEventListener('pointercancel', finishDrag)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', finishDrag)
      window.removeEventListener('pointercancel', finishDrag)
    }
  }, [
    draggingId,
    camera,
    gl,
    get,
    selectedObject,
    snappingEnabled,
    endResizeDrag,
    setLiveResizePreview,
    setSnapFeedback,
  ])

  if (!panel) return null

  const activeDims = previewState ? previewState.dims : panel.dimensions
  const activePos = previewState ? previewState.pos : panel.position

  const handlePointerDown = (face: FaceHandleDef, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()

    // تعطيل OrbitControls فوراً لمنع التفاف الكاميرا أثناء السحب
    const controls = get().controls as { enabled?: boolean } | null
    if (controls) controls.enabled = false

    const panelQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(panel.rotation[0], panel.rotation[1], panel.rotation[2], 'XYZ')
    )
    const worldDir = new THREE.Vector3(...face.localDir).applyQuaternion(panelQuat).normalize()

    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)
    const sideVec = new THREE.Vector3().crossVectors(camDir, worldDir)
    if (sideVec.lengthSq() < 1e-5) {
      sideVec.crossVectors(camera.up, worldDir)
    }
    const planeNormal = new THREE.Vector3().crossVectors(worldDir, sideVec).normalize()
    const startHitPoint = e.point.clone()
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, startHitPoint)

    const absX = Math.abs(worldDir.x)
    const absY = Math.abs(worldDir.y)
    const absZ = Math.abs(worldDir.z)
    const worldAxis: Axis = absX >= absY && absX >= absZ ? 'x' : absY >= absZ ? 'y' : 'z'
    const worldSign: 1 | -1 = worldDir[worldAxis] >= 0 ? 1 : -1

    const startBox = getPanelWorldBox(panel)
    const [bMin, bMax] = getWorldAxisRange(startBox, worldAxis)
    const startMovingCoord = worldSign > 0 ? bMax : bMin

    const state = useDesignStore.getState()
    const otherBoxes = state.panels.filter((p) => p.id !== panel.id).map(getPanelWorldBox)
    const activeGuides = state.guidesVisible ? state.guides : []

    dragRef.current = {
      panelId: panel.id,
      face,
      startDims: { ...panel.dimensions },
      startPos: [...panel.position] as Vec3,
      panelQuat,
      worldDir,
      worldAxis,
      worldSign,
      startBox,
      startMovingCoord,
      otherBoxes,
      guides: activeGuides,
      dragPlane,
      startHitPoint,
      latestDims: { ...panel.dimensions },
      latestPos: [...panel.position] as Vec3,
    }

    beginResizeDrag()
    setDraggingId(face.id)
    setPreviewState({
      dims: { ...panel.dimensions },
      pos: [...panel.position] as Vec3,
      tooltipText: `${face.label}: ${panel.dimensions[face.dimKey]} سم`,
      tooltipLocalPos: [
        face.localDir[0] * (panel.dimensions[face.dimKey] / 2 + 4.5),
        face.localDir[1] * (panel.dimensions[face.dimKey] / 2 + 4.5),
        face.localDir[2] * (panel.dimensions[face.dimKey] / 2 + 4.5),
      ],
    })
  }

  return (
    <group position={activePos} rotation={panel.rotation}>
      {visibleFaces.map((face) => {
        const halfAxisLen = activeDims[face.dimKey] / 2
        const pos: Vec3 = [
          face.localDir[0] * (halfAxisLen + 0.6),
          face.localDir[1] * (halfAxisLen + 0.6),
          face.localDir[2] * (halfAxisLen + 0.6),
        ]
        const isHovered = hoveredId === face.id
        const isActive = draggingId === face.id
        const scaleFactor = isActive ? 1.35 : isHovered ? 1.22 : 1

        return (
          <group key={face.id} position={pos}>
            {/* هدف لمس غير مرئي أكبر قليلاً لسهولة النقر بالماوس والقلم */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation()
                setHoveredId(face.id)
                document.body.style.cursor = 'grab'
              }}
              onPointerOut={(e) => {
                e.stopPropagation()
                setHoveredId((curr) => (curr === face.id ? null : curr))
                if (!draggingId) document.body.style.cursor = 'auto'
              }}
              onPointerDown={(e) => handlePointerDown(face, e)}
            >
              <sphereGeometry args={[3.1, 12, 12]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* المكعب/النقطة المرئية المضيئة */}
            <mesh scale={scaleFactor} renderOrder={20}>
              <boxGeometry args={[2.2, 2.2, 2.2]} />
              <meshStandardMaterial
                color={isActive || isHovered ? '#fbbf24' : face.axisColor}
                emissive={isActive || isHovered ? '#f59e0b' : face.axisColor}
                emissiveIntensity={isActive ? 0.75 : isHovered ? 0.45 : 0.2}
                roughness={0.3}
                metalness={0.2}
                depthTest={false}
              />
            </mesh>
          </group>
        )
      })}

      {/* شارة المقاس العائمة أثناء السحب */}
      {previewState && (
        <Html
          position={previewState.tooltipLocalPos}
          center
          zIndexRange={[30, 0]}
        >
          <div
            dir="rtl"
            className="pointer-events-none select-none whitespace-nowrap rounded-xl border border-amber-400/70 bg-slate-950/95 px-3 py-1.5 text-xs font-extrabold text-amber-200 shadow-xl backdrop-blur-md tabular-nums"
          >
            {previewState.tooltipText}
          </div>
        </Html>
      )}
    </group>
  )
}
