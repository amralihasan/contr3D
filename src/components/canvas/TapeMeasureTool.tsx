import { Html, Line } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
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

export interface TapePanelHandlers {
  onPanelPointerDown: (panel: FurniturePanel, e: ThreeEvent<PointerEvent>) => void
  onPanelPointerMove: (panel: FurniturePanel, e: ThreeEvent<PointerEvent>) => void
  onPanelPointerOut: () => void
}

interface TapeMeasureToolProps {
  objectMap: Record<string, THREE.Object3D>
  handlersRef: MutableRefObject<TapePanelHandlers | null>
}

interface DragTapeState {
  edge: ReferenceEdge
  facePlane: THREE.Plane
  startClientX: number
  startClientY: number
  didDrag: boolean
}

export function TapeMeasureTool({ objectMap, handlersRef }: TapeMeasureToolProps) {
  const { camera, gl, get } = useThree()

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
  const measureEndRef = useRef<Vec3 | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const ndcRef = useRef(new THREE.Vector2())
  const normalMatrixRef = useRef(new THREE.Matrix3())

  useEffect(() => {
    measureEndRef.current = measureEnd
  }, [measureEnd])

  // مزامنة فورية لـ OrbitControls + إدارة السحب عبر مستوى الوجه
  useEffect(() => {
    const syncOrbitEnabled = (enabled: boolean) => {
      const ctrl = get().controls as { enabled?: boolean } | null
      if (ctrl) {
        ctrl.enabled = enabled
      }
      setIsDraggingTape(!enabled)
    }

    if (toolMode !== 'tape') {
      dragStateRef.current = null
      handlersRef.current = null
      syncOrbitEnabled(true)
      return
    }

    const dom = gl.domElement
    const raycaster = raycasterRef.current

    const getWorldNormal = (e: ThreeEvent<PointerEvent>): THREE.Vector3 => {
      if (!e.face) return new THREE.Vector3(0, 0, 1)
      normalMatrixRef.current.getNormalMatrix(e.object.matrixWorld)
      return e.face.normal.clone().applyMatrix3(normalMatrixRef.current).normalize()
    }

    const buildFacePlane = (edge: ReferenceEdge, hitPoint: THREE.Vector3): THREE.Plane => {
      const normalVec = new THREE.Vector3(
        edge.normalAxis === 'x' ? edge.surfaceSign : 0,
        edge.normalAxis === 'y' ? edge.surfaceSign : 0,
        edge.normalAxis === 'z' ? edge.surfaceSign : 0
      )
      return new THREE.Plane().setFromNormalAndCoplanarPoint(normalVec, hitPoint.clone())
    }

    const hasPanelUnderClientPoint = (clientX: number, clientY: number): boolean => {
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndcRef.current, camera)
      const roots = Object.values(objectMap)
      if (roots.length === 0) return false
      const hits = raycaster.intersectObjects(roots, true)
      return hits.some((h) => {
        const mat = (h.object as THREE.Mesh).material as THREE.Material | undefined
        return !(mat && mat.transparent && mat.opacity === 0)
      })
    }

    // تعطيل OrbitControls لحظياً قبل معالج pointerdown الخاص بها عند لمس أي لوح
    const onDomPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (hasPanelUnderClientPoint(e.clientX, e.clientY)) {
        syncOrbitEnabled(false)
      }
    }

    const updateDragFromPointer = (clientX: number, clientY: number) => {
      const drag = dragStateRef.current
      if (!drag) return

      const movedPx = Math.hypot(clientX - drag.startClientX, clientY - drag.startClientY)
      if (!drag.didDrag && movedPx <= 8) return
      drag.didDrag = true

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

    const onWindowPointerMove = (e: PointerEvent) => {
      if (dragStateRef.current) {
        updateDragFromPointer(e.clientX, e.clientY)
      }
    }

    const onWindowPointerUp = () => {
      const drag = dragStateRef.current
      if (drag) {
        dragStateRef.current = null
        syncOrbitEnabled(true)
        const currentDist = useDesignStore.getState().draftGuideDistanceCm
        if (drag.didDrag && currentDist >= 0.5) {
          commitDraftGuide()
        }
        return
      }
      syncOrbitEnabled(true)
    }

    handlersRef.current = {
      onPanelPointerDown: (panel, e) => {
        e.stopPropagation()
        syncOrbitEnabled(false)

        if (tapeMode === 'guide') {
          const worldNormal = getWorldNormal(e)
          const edge = pickReferenceEdgeFromHit(panel, e.point, worldNormal)
          setActiveReferenceEdge(edge)
          setHoverEdge(edge)
          dragStateRef.current = {
            edge,
            facePlane: buildFacePlane(edge, e.point),
            startClientX: e.nativeEvent.clientX,
            startClientY: e.nativeEvent.clientY,
            didDrag: false,
          }
        } else {
          const snapped = snapPointToPanelFeatures(panel, e.point)
          setHoverSnapPoint(snapped)
          setMeasureStart((prevStart) => {
            if (!prevStart || measureEndRef.current !== null) {
              setMeasureEnd(null)
              return snapped.point
            }
            setMeasureEnd(snapped.point)
            return prevStart
          })
        }
      },
      onPanelPointerMove: (panel, e) => {
        if (dragStateRef.current) return
        e.stopPropagation()

        if (tapeMode === 'guide') {
          const worldNormal = getWorldNormal(e)
          setHoverEdge(pickReferenceEdgeFromHit(panel, e.point, worldNormal))
          setHoverSnapPoint(null)
        } else {
          setHoverSnapPoint(snapPointToPanelFeatures(panel, e.point))
          setHoverEdge(null)
        }
      },
      onPanelPointerOut: () => {
        if (dragStateRef.current) return
        setHoverEdge(null)
        setHoverSnapPoint(null)
      },
    }

    dom.addEventListener('pointerdown', onDomPointerDownCapture, { capture: true })
    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)

    return () => {
      dom.removeEventListener('pointerdown', onDomPointerDownCapture, { capture: true })
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
      handlersRef.current = null
      dragStateRef.current = null
      syncOrbitEnabled(true)
    }
  }, [
    toolMode,
    tapeMode,
    camera,
    gl,
    get,
    objectMap,
    panels,
    handlersRef,
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
      {/* تمييز الحافة المرجعية المضيء عند التحويم في وضع العلام */}
      {tapeMode === 'guide' && hoverEdge && (
        <Line points={[hoverEdge.edgeStart, hoverEdge.edgeEnd]} color="#22d3ee" lineWidth={4} />
      )}

      {/* مؤشر الالتقاط الذكي في وضع القياس */}
      {tapeMode === 'measure' && hoverSnapPoint && (
        <group position={hoverSnapPoint.point}>
          <mesh>
            <sphereGeometry args={[1.25, 16, 16]} />
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
          <sphereGeometry args={[1.35, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* نقطة نهاية القياس */}
      {tapeMode === 'measure' && measureEnd && (
        <mesh position={measureEnd}>
          <sphereGeometry args={[1.35, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* خط القياس المؤقت والنتيجة */}
      {showMeasureLine && measureStart && activeMeasureTarget && (
        <group>
          <Line points={[measureStart, activeMeasureTarget]} color="#fbbf24" lineWidth={2.8} />
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
