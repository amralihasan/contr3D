import { Html, Line } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import type { FurniturePanel, Vec3 } from '../../types/furniture'
import { roundTo } from '../../utils/snapping'
import {
  pickReferenceEdgeFromHit,
  snapPointToPanelFeatures,
  type ReferenceEdge,
  type SnappedMeasurePoint,
} from '../../utils/tapeMeasure'

interface TapeMeasureToolProps {
  objectMap: Record<string, THREE.Object3D>
}

interface DragTapeState {
  edge: ReferenceEdge
  facePlane: THREE.Plane
  startClientX: number
  startClientY: number
}

export function TapeMeasureTool({ objectMap }: TapeMeasureToolProps) {
  const { camera, gl } = useThree()

  const toolMode = useDesignStore((s) => s.toolMode)
  const tapeMode = useDesignStore((s) => s.tapeMode)
  const panels = useDesignStore((s) => s.panels)
  const setIsDraggingTape = useDesignStore((s) => s.setIsDraggingTape)
  const setActiveReferenceEdge = useDesignStore((s) => s.setActiveReferenceEdge)
  const setDraftGuideParams = useDesignStore((s) => s.setDraftGuideParams)
  const commitDraftGuide = useDesignStore((s) => s.commitDraftGuide)

  const [hoverEdge, setHoverEdge] = useState<ReferenceEdge | null>(null)
  const [hoverSnapPoint, setHoverSnapPoint] = useState<SnappedMeasurePoint | null>(null)
  const [measureStart, setMeasureStart] = useState<Vec3 | null>(null)
  const [measureEnd, setMeasureEnd] = useState<Vec3 | null>(null)

  const dragStateRef = useRef<DragTapeState | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const ndcRef = useRef(new THREE.Vector2())
  const normalMatrixRef = useRef(new THREE.Matrix3())

  useEffect(() => {
    if (toolMode !== 'tape') {
      dragStateRef.current = null
      return
    }

    const dom = gl.domElement
    const raycaster = raycasterRef.current

    const findPanelByObject = (obj: THREE.Object3D | null): FurniturePanel | null => {
      let curr: THREE.Object3D | null = obj
      while (curr) {
        if (curr.name) {
          const found = panels.find((p) => p.id === curr?.name)
          if (found) return found
        }
        curr = curr.parent
      }
      return null
    }

    const raycastPanel = (clientX: number, clientY: number) => {
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(ndcRef.current, camera)
      const roots = Object.values(objectMap)
      if (roots.length === 0) return null

      const hits = raycaster.intersectObjects(roots, true)
      for (const hit of hits) {
        const mesh = hit.object as THREE.Mesh
        const mat = mesh.material as THREE.Material | undefined
        if (mat && mat.transparent && mat.opacity === 0) continue
        const panel = findPanelByObject(hit.object)
        if (!panel || !hit.face) continue

        normalMatrixRef.current.getNormalMatrix(hit.object.matrixWorld)
        const worldNormal = hit.face.normal
          .clone()
          .applyMatrix3(normalMatrixRef.current)
          .normalize()

        return { panel, point: hit.point, worldNormal }
      }
      return null
    }

    const buildFacePlane = (edge: ReferenceEdge): THREE.Plane => {
      const normalVec = new THREE.Vector3(
        edge.normalAxis === 'x' ? edge.surfaceSign : 0,
        edge.normalAxis === 'y' ? edge.surfaceSign : 0,
        edge.normalAxis === 'z' ? edge.surfaceSign : 0
      )
      const anchor = new THREE.Vector3(...edge.edgeStart)
      return new THREE.Plane().setFromNormalAndCoplanarPoint(normalVec, anchor)
    }

    const updateDragFromPointer = (clientX: number, clientY: number) => {
      const drag = dragStateRef.current
      if (!drag) return

      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndcRef.current, camera)

      const hitOnPlane = new THREE.Vector3()
      const intersected = raycaster.ray.intersectPlane(drag.facePlane, hitOnPlane)
      if (!intersected) return

      const coordVal = hitOnPlane[drag.edge.offsetAxis]
      const signedDelta = coordVal - drag.edge.referenceEdgeCoord
      const dir: 1 | -1 =
        Math.abs(signedDelta) < 0.2
          ? drag.edge.defaultDirection
          : signedDelta >= 0
            ? 1
            : -1
      const snappedDist = roundTo(Math.round(Math.abs(signedDelta) * 2) / 2, 1)
      setDraftGuideParams(snappedDist, dir)
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const hit = raycastPanel(e.clientX, e.clientY)
      if (!hit) return

      if (tapeMode === 'guide') {
        e.stopPropagation()
        const edge = pickReferenceEdgeFromHit(hit.panel, hit.point, hit.worldNormal)
        setActiveReferenceEdge(edge)
        setHoverEdge(edge)
        dragStateRef.current = {
          edge,
          facePlane: buildFacePlane(edge),
          startClientX: e.clientX,
          startClientY: e.clientY,
        }
        setIsDraggingTape(true)
      } else {
        e.stopPropagation()
        const snapped = snapPointToPanelFeatures(hit.panel, hit.point)
        setHoverSnapPoint(snapped)
        setMeasureStart((prevStart) => {
          if (!prevStart || measureEnd !== null) {
            setMeasureEnd(null)
            return snapped.point
          }
          setMeasureEnd(snapped.point)
          return prevStart
        })
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (dragStateRef.current) {
        updateDragFromPointer(e.clientX, e.clientY)
        return
      }

      const hit = raycastPanel(e.clientX, e.clientY)
      if (!hit) {
        setHoverEdge(null)
        setHoverSnapPoint(null)
        return
      }

      if (tapeMode === 'guide') {
        setHoverEdge(pickReferenceEdgeFromHit(hit.panel, hit.point, hit.worldNormal))
        setHoverSnapPoint(null)
      } else {
        setHoverSnapPoint(snapPointToPanelFeatures(hit.panel, hit.point))
        setHoverEdge(null)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragStateRef.current
      if (!drag) return

      const movedPx = Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY)
      dragStateRef.current = null
      setIsDraggingTape(false)

      // إذا سحب المستخدم مسافة كافية، ثبت العلام مباشرة؛ أما إذا ضغط فقط فتبقى الخانة العائمة مفتوحة لإدخال الرقم بدقة
      const currentDist = useDesignStore.getState().draftGuideDistanceCm
      if (movedPx > 14 && currentDist >= 0.5) {
        commitDraftGuide()
      }
    }

    dom.addEventListener('pointerdown', onPointerDown, { capture: true })
    dom.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown, { capture: true })
      dom.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      dragStateRef.current = null
      setIsDraggingTape(false)
    }
  }, [
    toolMode,
    tapeMode,
    camera,
    gl,
    objectMap,
    panels,
    measureEnd,
    setIsDraggingTape,
    setActiveReferenceEdge,
    setDraftGuideParams,
    commitDraftGuide,
  ])

  if (toolMode !== 'tape') return null

  const activeMeasureTarget = measureEnd ?? hoverSnapPoint?.point ?? null
  const showMeasureLine = tapeMode === 'measure' && measureStart && activeMeasureTarget

  let measureDist = 0
  let dx = 0
  let dy = 0
  let dz = 0
  let measureMid: Vec3 = [0, 0, 0]

  if (showMeasureLine && measureStart && activeMeasureTarget) {
    dx = roundTo(Math.abs(activeMeasureTarget[0] - measureStart[0]), 1)
    dy = roundTo(Math.abs(activeMeasureTarget[1] - measureStart[1]), 1)
    dz = roundTo(Math.abs(activeMeasureTarget[2] - measureStart[2]), 1)
    measureDist = roundTo(Math.hypot(dx, dy, dz), 1)
    measureMid = [
      (measureStart[0] + activeMeasureTarget[0]) / 2,
      (measureStart[1] + activeMeasureTarget[1]) / 2,
      (measureStart[2] + activeMeasureTarget[2]) / 2,
    ]
  }

  return (
    <group>
      {/* تمييز الحافة المرجعية عند التحويم في وضع العلام */}
      {tapeMode === 'guide' && hoverEdge && (
        <Line points={[hoverEdge.edgeStart, hoverEdge.edgeEnd]} color="#22d3ee" lineWidth={3} />
      )}

      {/* مؤشر الالتقاط الذكي في وضع القياس */}
      {tapeMode === 'measure' && hoverSnapPoint && (
        <group position={hoverSnapPoint.point}>
          <mesh>
            <sphereGeometry args={[1.1, 14, 14]} />
            <meshBasicMaterial
              color={
                hoverSnapPoint.snapKind === 'corner'
                  ? '#fbbf24'
                  : hoverSnapPoint.snapKind === 'midpoint'
                    ? '#22d3ee'
                    : '#34d399'
              }
            />
          </mesh>
        </group>
      )}

      {/* نقطة بداية القياس */}
      {tapeMode === 'measure' && measureStart && (
        <mesh position={measureStart}>
          <sphereGeometry args={[1.2, 14, 14]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* نقطة نهاية القياس */}
      {tapeMode === 'measure' && measureEnd && (
        <mesh position={measureEnd}>
          <sphereGeometry args={[1.2, 14, 14]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* خط القياس المؤقت والنتيجة */}
      {showMeasureLine && measureStart && activeMeasureTarget && (
        <group>
          <Line points={[measureStart, activeMeasureTarget]} color="#fbbf24" lineWidth={2.6} />
          <Html position={measureMid} center distanceFactor={200} zIndexRange={[10, 0]}>
            <div className="tabular-nums pointer-events-none select-none whitespace-nowrap rounded-xl border border-amber-400 bg-slate-950/95 px-2.5 py-1 text-center shadow-xl">
              <div className="text-xs font-extrabold text-amber-300">
                المسافة: {measureDist} سم
              </div>
              <div className="text-[10px] text-slate-300">
                X:{dx} · Y:{dy} · Z:{dz}
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
