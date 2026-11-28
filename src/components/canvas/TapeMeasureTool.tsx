import { Html, Line } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import type { FurniturePanel, Vec3 } from '../../types/furniture'
import { roundTo } from '../../utils/snapping'
import {
  computeAxisLockedMeasureTarget,
  getAxisColor,
  getAxisLabelAr,
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
  const tapeMeasureDraft = useDesignStore((s) => s.tapeMeasureDraft)

  const setIsDraggingTape = useDesignStore((s) => s.setIsDraggingTape)
  const setActiveReferenceEdge = useDesignStore((s) => s.setActiveReferenceEdge)
  const setDraftGuideParams = useDesignStore((s) => s.setDraftGuideParams)
  const commitDraftGuide = useDesignStore((s) => s.commitDraftGuide)
  const setTapeMeasureDraft = useDesignStore((s) => s.setTapeMeasureDraft)
  const addPointGuide = useDesignStore((s) => s.addPointGuide)

  const [hoverEdge, setHoverEdge] = useState<ReferenceEdge | null>(null)
  const [hoverSnapPoint, setHoverSnapPoint] = useState<SnappedMeasurePoint | null>(null)

  const dragStateRef = useRef<DragTapeState | null>(null)
  const emptyDownRef = useRef<{ x: number; y: number } | null>(null)
  const raycasterRef = useRef(new THREE.Raycaster())
  const ndcRef = useRef(new THREE.Vector2())
  const normalMatrixRef = useRef(new THREE.Matrix3())

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
      emptyDownRef.current = null
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

    const isDescendantOf = (obj: THREE.Object3D, root: THREE.Object3D): boolean => {
      let curr: THREE.Object3D | null = obj
      while (curr) {
        if (curr === root) return true
        curr = curr.parent
      }
      return false
    }

    const raycastPanelsAtClient = (
      clientX: number,
      clientY: number
    ): { panel: FurniturePanel; point: THREE.Vector3 } | null => {
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndcRef.current, camera)
      const roots = Object.values(objectMap)
      if (roots.length === 0) return null

      const hits = raycaster.intersectObjects(roots, true)
      const validHit = hits.find((h) => {
        const mat = (h.object as THREE.Mesh).material as THREE.Material | undefined
        return !(mat && mat.transparent && mat.opacity === 0)
      })
      if (!validHit) return null

      const panelId = Object.keys(objectMap).find((id) =>
        isDescendantOf(validHit.object, objectMap[id])
      )
      if (!panelId) return null
      const panel = panels.find((p) => p.id === panelId)
      if (!panel) return null
      return { panel, point: validHit.point }
    }

    const computeMeasureTargetAtClient = (
      clientX: number,
      clientY: number,
      start: Vec3
    ) => {
      const panelHit = raycastPanelsAtClient(clientX, clientY)
      if (panelHit) {
        const snapped = snapPointToPanelFeatures(panelHit.panel, panelHit.point)
        const isExact = snapped.snapKind === 'corner' || snapped.snapKind === 'midpoint'
        const locked = computeAxisLockedMeasureTarget(start, snapped.point, isExact)
        setHoverSnapPoint(
          isExact
            ? snapped
            : {
                point: locked.end,
                snapKind: 'surface',
                label: locked.lockedAxis ? getAxisLabelAr(locked.lockedAxis) : snapped.label,
              }
        )
        return locked
      }

      // القياس الحر في الفراغ عبر مستوى يمر بنقطة البداية ويواجه الكاميرا
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndcRef.current, camera)

      const camDir = new THREE.Vector3()
      camera.getWorldDirection(camDir)
      const planeNormal = camDir.negate()
      if (planeNormal.lengthSq() < 0.0001) {
        planeNormal.set(0, 1, 0)
      }
      const workPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal.normalize(),
        new THREE.Vector3(start[0], start[1], start[2])
      )

      const hitOnPlane = new THREE.Vector3()
      let ok = raycaster.ray.intersectPlane(workPlane, hitOnPlane)
      if (!ok) {
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
        ok = raycaster.ray.intersectPlane(floorPlane, hitOnPlane)
      }
      if (!ok) return null

      const locked = computeAxisLockedMeasureTarget(
        start,
        [hitOnPlane.x, hitOnPlane.y, hitOnPlane.z],
        false
      )
      setHoverSnapPoint({
        point: locked.end,
        snapKind: 'surface',
        label: getAxisLabelAr(locked.lockedAxis),
      })
      return locked
    }

    const onDomPointerDownCapture = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const hitPanel = raycastPanelsAtClient(e.clientX, e.clientY)
      if (hitPanel) {
        syncOrbitEnabled(false)
        emptyDownRef.current = null
      } else if (e.target === dom && tapeMode === 'measure' && useDesignStore.getState().tapeMeasureDraft) {
        emptyDownRef.current = { x: e.clientX, y: e.clientY }
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
        return
      }

      const activeDraft = useDesignStore.getState().tapeMeasureDraft
      if (tapeMode === 'measure' && activeDraft) {
        if (e.target !== dom) return
        const locked = computeMeasureTargetAtClient(e.clientX, e.clientY, activeDraft.start)
        if (locked) {
          setTapeMeasureDraft({
            start: activeDraft.start,
            end: locked.end,
            unitDir: locked.unitDir,
            lockedAxis: locked.lockedAxis,
            distanceCm: locked.distanceCm,
          })
        }
      }
    }

    const onWindowPointerUp = (e: PointerEvent) => {
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

      if (emptyDownRef.current) {
        const down = emptyDownRef.current
        emptyDownRef.current = null
        const movedPx = Math.hypot(e.clientX - down.x, e.clientY - down.y)
        const activeDraft = useDesignStore.getState().tapeMeasureDraft
        if (movedPx <= 6 && tapeMode === 'measure' && activeDraft) {
          const locked = computeMeasureTargetAtClient(e.clientX, e.clientY, activeDraft.start)
          if (locked && locked.distanceCm >= 0.05) {
            addPointGuide(activeDraft.start, locked.end, locked.lockedAxis, locked.unitDir)
          }
        }
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
          return
        }

        const snapped = snapPointToPanelFeatures(panel, e.point)
        setHoverSnapPoint(snapped)

        const activeDraft = useDesignStore.getState().tapeMeasureDraft
        if (!activeDraft) {
          setTapeMeasureDraft({
            start: snapped.point,
            end: snapped.point,
            unitDir: [1, 0, 0],
            lockedAxis: null,
            distanceCm: 0,
          })
          return
        }

        const isExact = snapped.snapKind === 'corner' || snapped.snapKind === 'midpoint'
        const locked = computeAxisLockedMeasureTarget(activeDraft.start, snapped.point, isExact)
        if (locked.distanceCm >= 0.05) {
          addPointGuide(activeDraft.start, locked.end, locked.lockedAxis, locked.unitDir)
        } else {
          setTapeMeasureDraft(null)
        }
      },
      onPanelPointerMove: (panel, e) => {
        if (dragStateRef.current) return
        e.stopPropagation()

        if (tapeMode === 'guide') {
          const worldNormal = getWorldNormal(e)
          setHoverEdge(pickReferenceEdgeFromHit(panel, e.point, worldNormal))
          setHoverSnapPoint(null)
          return
        }

        setHoverEdge(null)
        const snapped = snapPointToPanelFeatures(panel, e.point)
        const activeDraft = useDesignStore.getState().tapeMeasureDraft

        if (!activeDraft) {
          setHoverSnapPoint(snapped)
          return
        }

        const isExact = snapped.snapKind === 'corner' || snapped.snapKind === 'midpoint'
        const locked = computeAxisLockedMeasureTarget(activeDraft.start, snapped.point, isExact)
        setHoverSnapPoint(
          isExact
            ? snapped
            : {
                point: locked.end,
                snapKind: 'surface',
                label: locked.lockedAxis ? getAxisLabelAr(locked.lockedAxis) : snapped.label,
              }
        )
        setTapeMeasureDraft({
          start: activeDraft.start,
          end: locked.end,
          unitDir: locked.unitDir,
          lockedAxis: locked.lockedAxis,
          distanceCm: locked.distanceCm,
        })
      },
      onPanelPointerOut: () => {
        if (dragStateRef.current) return
        setHoverEdge(null)
        if (!useDesignStore.getState().tapeMeasureDraft) {
          setHoverSnapPoint(null)
        }
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
      emptyDownRef.current = null
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
    setTapeMeasureDraft,
    addPointGuide,
  ])

  if (toolMode !== 'tape') return null

  const activeColor = tapeMeasureDraft ? getAxisColor(tapeMeasureDraft.lockedAxis) : '#fbbf24'
  const showMeasureLine =
    tapeMode === 'measure' &&
    tapeMeasureDraft !== null &&
    tapeMeasureDraft.distanceCm >= 0.05

  const measureMid: Vec3 = tapeMeasureDraft
    ? [
        (tapeMeasureDraft.start[0] + tapeMeasureDraft.end[0]) / 2,
        (tapeMeasureDraft.start[1] + tapeMeasureDraft.end[1]) / 2,
        (tapeMeasureDraft.start[2] + tapeMeasureDraft.end[2]) / 2,
      ]
    : [0, 0, 0]

  const dx = tapeMeasureDraft
    ? roundTo(Math.abs(tapeMeasureDraft.end[0] - tapeMeasureDraft.start[0]), 1)
    : 0
  const dy = tapeMeasureDraft
    ? roundTo(Math.abs(tapeMeasureDraft.end[1] - tapeMeasureDraft.start[1]), 1)
    : 0
  const dz = tapeMeasureDraft
    ? roundTo(Math.abs(tapeMeasureDraft.end[2] - tapeMeasureDraft.start[2]), 1)
    : 0

  return (
    <group>
      {/* تمييز الحافة المرجعية المضيء عند التحويم في وضع العلام من حافة */}
      {tapeMode === 'guide' && hoverEdge && (
        <Line points={[hoverEdge.edgeStart, hoverEdge.edgeEnd]} color="#22d3ee" lineWidth={4} />
      )}

      {/* مؤشر الالتقاط الذكي بالزوايا ومنتصفات الحواف */}
      {tapeMode === 'measure' && hoverSnapPoint && (
        <group position={hoverSnapPoint.point}>
          <mesh>
            <sphereGeometry args={[1.15, 16, 16]} />
            <meshBasicMaterial
              color={
                hoverSnapPoint.snapKind === 'corner'
                  ? '#fbbf24'
                  : hoverSnapPoint.snapKind === 'midpoint'
                    ? '#22d3ee'
                    : activeColor
              }
            />
          </mesh>
        </group>
      )}

      {/* نقطة بداية القياس */}
      {tapeMode === 'measure' && tapeMeasureDraft && (
        <mesh position={tapeMeasureDraft.start}>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      )}

      {/* خط المعاينة المتقطع الحي + قراءة المسافة بالـ سم */}
      {showMeasureLine && tapeMeasureDraft && (
        <group>
          <Line
            points={[tapeMeasureDraft.start, tapeMeasureDraft.end]}
            color={activeColor}
            lineWidth={3}
            dashed
            dashSize={2.2}
            gapSize={1.2}
          />
          <mesh position={tapeMeasureDraft.end}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshBasicMaterial color={activeColor} />
          </mesh>
          <Html position={measureMid} center distanceFactor={135} zIndexRange={[10, 0]}>
            <div
              className="tabular-nums pointer-events-none select-none whitespace-nowrap rounded-md border bg-slate-950/95 px-2 py-0.5 text-center shadow-sm backdrop-blur-sm"
              style={{ borderColor: activeColor }}
            >
              <div className="text-[11px] font-extrabold leading-tight" style={{ color: activeColor }}>
                {tapeMeasureDraft.distanceCm} سم
              </div>
              <div className="text-[9px] font-semibold text-slate-300">
                {tapeMeasureDraft.lockedAxis
                  ? getAxisLabelAr(tapeMeasureDraft.lockedAxis)
                  : `X:${dx} · Y:${dy} · Z:${dz}`}
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  )
}
