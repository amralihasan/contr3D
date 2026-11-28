import { TransformControls } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole, type GuideLine, type Vec3 } from '../../types/furniture'
import { computeOverallDimensions } from '../../utils/dimensions'
import {
  computeSnappedPositionFromBoxes,
  getPanelWorldBox,
  getWorldHalfExtents,
  roundTo,
  type WorldBox,
} from '../../utils/snapping'

interface PanelTransformGizmoProps {
  selectedObject: THREE.Object3D | null
  objectMap: Record<string, THREE.Object3D>
}

interface MultiDragStartItem {
  id: string
  startPos: Vec3
  obj: THREE.Object3D | null
}

export function PanelTransformGizmo({ selectedObject, objectMap }: PanelTransformGizmoProps) {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const toolMode = useDesignStore((s) => s.toolMode)
  const transformMode = useDesignStore((s) => s.transformMode)
  const isExporting = useDesignStore((s) => s.isExporting)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const beginTransformDrag = useDesignStore((s) => s.beginTransformDrag)
  const setSnapFeedback = useDesignStore((s) => s.setSnapFeedback)
  const endTransformDrag = useDesignStore((s) => s.endTransformDrag)

  const [groupAnchor, setGroupAnchor] = useState<THREE.Group | null>(null)

  // بيانات محسوبة مسبقاً عند بدء السحب لمنع أي تخصيص أو إعادة رسم أثناء التحريك
  const dragModeRef = useRef<'single' | 'multi' | null>(null)
  const activePanelIdRef = useRef<string | null>(null)
  const groupStartCenterRef = useRef<Vec3>([0, 0, 0])
  const multiStartItemsRef = useRef<MultiDragStartItem[]>([])
  const halfExtentsRef = useRef<Vec3>([1, 1, 1])
  const otherBoxesRef = useRef<WorldBox[]>([])
  const activeGuidesRef = useRef<GuideLine[]>([])

  const visibleSelectedPanels = useMemo(() => {
    if (selectedPanelIds.length === 0) return []
    const selectedSet = new Set(selectedPanelIds)
    return panels.filter(
      (p) => selectedSet.has(p.id) && !(interfacesHidden && isInterfaceRole(p.role))
    )
  }, [panels, selectedPanelIds, interfacesHidden])

  const isMultiSelection = visibleSelectedPanels.length > 1

  const groupBounds = useMemo(() => {
    if (!isMultiSelection) return null
    const overall = computeOverallDimensions(visibleSelectedPanels)
    if (!overall) return null
    return {
      center: [
        roundTo((overall.minX + overall.maxX) / 2, 2),
        roundTo((overall.minY + overall.maxY) / 2, 2),
        roundTo((overall.minZ + overall.maxZ) / 2, 2),
      ] as Vec3,
      halfExtents: [
        roundTo(overall.width / 2, 3),
        roundTo(overall.height / 2, 3),
        roundTo(overall.depth / 2, 3),
      ] as Vec3,
    }
  }, [isMultiSelection, visibleSelectedPanels])

  // مزامنة موضع مركز المجموعة الوهمية عند تغير التحديد أو الأبعاد خارج وقت السحب
  useEffect(() => {
    if (!groupAnchor || !groupBounds || isDraggingGizmo) return
    groupAnchor.position.set(groupBounds.center[0], groupBounds.center[1], groupBounds.center[2])
  }, [groupAnchor, groupBounds, isDraggingGizmo])

  const handleMouseDown = useCallback(() => {
    const state = useDesignStore.getState()
    const visibleIds = state.selectedPanelIds.filter((id) => {
      const p = state.panels.find((item) => item.id === id)
      return p && !(state.interfacesHidden && isInterfaceRole(p.role))
    })

    if (visibleIds.length === 0) return

    // حالة التحديد المتعدد: نحرك المجموعة كلها حول مركز الصندوق المحيط
    if (visibleIds.length > 1 && groupAnchor) {
      const selectedSet = new Set(visibleIds)
      const selectedPanels = state.panels.filter((p) => selectedSet.has(p.id))
      const overall = computeOverallDimensions(selectedPanels)
      if (!overall) return

      const center: Vec3 = [
        roundTo((overall.minX + overall.maxX) / 2, 2),
        roundTo((overall.minY + overall.maxY) / 2, 2),
        roundTo((overall.minZ + overall.maxZ) / 2, 2),
      ]
      groupAnchor.position.set(center[0], center[1], center[2])

      dragModeRef.current = 'multi'
      activePanelIdRef.current = null
      groupStartCenterRef.current = center
      multiStartItemsRef.current = selectedPanels.map((p) => ({
        id: p.id,
        startPos: [...p.position] as Vec3,
        obj: objectMap[p.id] ?? null,
      }))
      halfExtentsRef.current = [overall.width / 2, overall.height / 2, overall.depth / 2]
      otherBoxesRef.current = state.panels
        .filter((p) => !selectedSet.has(p.id))
        .map(getPanelWorldBox)
      activeGuidesRef.current = state.guidesVisible ? state.guides : []

      beginTransformDrag()
      return
    }

    // حالة العنصر الواحد
    const singleId = selectedPanelId ?? visibleIds[0]
    const panel = state.panels.find((p) => p.id === singleId)
    if (!panel) return

    dragModeRef.current = 'single'
    activePanelIdRef.current = panel.id
    multiStartItemsRef.current = []
    halfExtentsRef.current = getWorldHalfExtents(panel.dimensions, panel.rotation)
    otherBoxesRef.current = state.panels
      .filter((p) => p.id !== panel.id)
      .map(getPanelWorldBox)
    activeGuidesRef.current = state.guidesVisible ? state.guides : []

    beginTransformDrag()
  }, [selectedPanelId, groupAnchor, objectMap, beginTransformDrag])

  const handleObjectChange = useCallback(() => {
    const state = useDesignStore.getState()
    if (!state.isDraggingGizmo) return

    if (dragModeRef.current === 'multi' && groupAnchor) {
      const proposed: Vec3 = [
        groupAnchor.position.x,
        groupAnchor.position.y,
        groupAnchor.position.z,
      ]

      const { position, feedback } = computeSnappedPositionFromBoxes(
        halfExtentsRef.current,
        proposed,
        otherBoxesRef.current,
        snappingEnabled,
        activeGuidesRef.current
      )

      groupAnchor.position.set(position[0], position[1], position[2])

      const [startCx, startCy, startCz] = groupStartCenterRef.current
      const dx = Math.round((position[0] - startCx) * 100) / 100
      const dy = Math.round((position[1] - startCy) * 100) / 100
      const dz = Math.round((position[2] - startCz) * 100) / 100

      for (const item of multiStartItemsRef.current) {
        if (!item.obj) continue
        item.obj.position.set(
          Math.round((item.startPos[0] + dx) * 100) / 100,
          Math.round((item.startPos[1] + dy) * 100) / 100,
          Math.round((item.startPos[2] + dz) * 100) / 100
        )
      }

      setSnapFeedback(feedback)
      return
    }

    if (dragModeRef.current === 'single' && selectedObject && activePanelIdRef.current) {
      const proposed: Vec3 = [
        selectedObject.position.x,
        selectedObject.position.y,
        selectedObject.position.z,
      ]

      const { position, feedback } = computeSnappedPositionFromBoxes(
        halfExtentsRef.current,
        proposed,
        otherBoxesRef.current,
        snappingEnabled,
        activeGuidesRef.current
      )

      selectedObject.position.set(position[0], position[1], position[2])
      setSnapFeedback(feedback)
    }
  }, [groupAnchor, selectedObject, snappingEnabled, setSnapFeedback])

  const handleMouseUp = useCallback(() => {
    const mode = dragModeRef.current
    const singleId = activePanelIdRef.current
    const multiItems = multiStartItemsRef.current
    const [startCx, startCy, startCz] = groupStartCenterRef.current

    dragModeRef.current = null
    activePanelIdRef.current = null
    multiStartItemsRef.current = []
    otherBoxesRef.current = []
    activeGuidesRef.current = []

    if (mode === 'multi' && groupAnchor && multiItems.length > 0) {
      const finalCx = roundTo(groupAnchor.position.x, 2)
      const finalCy = roundTo(groupAnchor.position.y, 2)
      const finalCz = roundTo(groupAnchor.position.z, 2)
      groupAnchor.position.set(finalCx, finalCy, finalCz)

      const dx = Math.round((finalCx - startCx) * 100) / 100
      const dy = Math.round((finalCy - startCy) * 100) / 100
      const dz = Math.round((finalCz - startCz) * 100) / 100

      const finalMoves = multiItems.map((item) => {
        const finalPos: Vec3 = [
          Math.round((item.startPos[0] + dx) * 100) / 100,
          Math.round((item.startPos[1] + dy) * 100) / 100,
          Math.round((item.startPos[2] + dz) * 100) / 100,
        ]
        item.obj?.position.set(finalPos[0], finalPos[1], finalPos[2])
        return { id: item.id, position: finalPos }
      })

      endTransformDrag(finalMoves)
      return
    }

    if (mode === 'single' && singleId && selectedObject) {
      const finalPosition: Vec3 = [
        roundTo(selectedObject.position.x, 2),
        roundTo(selectedObject.position.y, 2),
        roundTo(selectedObject.position.z, 2),
      ]
      selectedObject.position.set(finalPosition[0], finalPosition[1], finalPosition[2])
      endTransformDrag({ id: singleId, position: finalPosition })
      return
    }

    endTransformDrag()
  }, [groupAnchor, selectedObject, endTransformDrag])

  const shouldRenderGizmo =
    visibleSelectedPanels.length >= 1 &&
    toolMode === 'select' &&
    transformMode === 'move' &&
    !isExporting

  const gizmoTarget = isMultiSelection ? groupAnchor : selectedObject

  return (
    <>
      {/* نقطة ارتكاز وهمية في مركز المجموعة المحددة لتحريك العناصر معاً */}
      <group ref={setGroupAnchor} name="multi-selection-gizmo-anchor" />

      {shouldRenderGizmo && gizmoTarget && (
        <TransformControls
          key={isMultiSelection ? 'multi-gizmo' : (selectedPanelId ?? 'single-gizmo')}
          object={gizmoTarget}
          mode="translate"
          translationSnap={null}
          size={1.15}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  )
}
