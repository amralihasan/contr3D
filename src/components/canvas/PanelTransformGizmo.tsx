import { TransformControls } from '@react-three/drei'
import { useCallback, useRef } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import type { GuideLine, Vec3 } from '../../types/furniture'
import {
  computeSnappedPositionFromBoxes,
  getPanelWorldBox,
  getWorldHalfExtents,
  roundTo,
  type WorldBox,
} from '../../utils/snapping'

interface PanelTransformGizmoProps {
  selectedObject: THREE.Object3D | null
}

export function PanelTransformGizmo({ selectedObject }: PanelTransformGizmoProps) {
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const toolMode = useDesignStore((s) => s.toolMode)
  const transformMode = useDesignStore((s) => s.transformMode)
  const isExporting = useDesignStore((s) => s.isExporting)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const beginTransformDrag = useDesignStore((s) => s.beginTransformDrag)
  const setSnapFeedback = useDesignStore((s) => s.setSnapFeedback)
  const endTransformDrag = useDesignStore((s) => s.endTransformDrag)

  // بيانات محسوبة مسبقاً عند بدء السحب لمنع أي عمليات تخصيص أو إعادة رسم أثناء التحريك
  const activePanelIdRef = useRef<string | null>(null)
  const halfExtentsRef = useRef<Vec3>([1, 1, 1])
  const otherBoxesRef = useRef<WorldBox[]>([])
  const activeGuidesRef = useRef<GuideLine[]>([])

  const handleMouseDown = useCallback(() => {
    if (!selectedPanelId) return
    const state = useDesignStore.getState()
    const panel = state.panels.find((p) => p.id === selectedPanelId)
    if (!panel) return

    activePanelIdRef.current = panel.id
    halfExtentsRef.current = getWorldHalfExtents(panel.dimensions, panel.rotation)
    otherBoxesRef.current = state.panels
      .filter((p) => p.id !== panel.id)
      .map(getPanelWorldBox)
    activeGuidesRef.current = state.guidesVisible ? state.guides : []

    beginTransformDrag()
  }, [selectedPanelId, beginTransformDrag])

  const handleObjectChange = useCallback(() => {
    if (!selectedObject || !activePanelIdRef.current) return
    const state = useDesignStore.getState()
    if (!state.isDraggingGizmo) return

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

    // تحريك الـ Object3D مباشرة في Three.js دون أي تحديث لمصفوفة panels في React أثناء السحب
    selectedObject.position.set(position[0], position[1], position[2])
    setSnapFeedback(feedback)
  }, [selectedObject, snappingEnabled, setSnapFeedback])

  const handleMouseUp = useCallback(() => {
    const id = activePanelIdRef.current
    activePanelIdRef.current = null
    otherBoxesRef.current = []
    activeGuidesRef.current = []

    if (!id || !selectedObject) {
      endTransformDrag()
      return
    }

    const finalPosition: Vec3 = [
      roundTo(selectedObject.position.x, 2),
      roundTo(selectedObject.position.y, 2),
      roundTo(selectedObject.position.z, 2),
    ]
    selectedObject.position.set(finalPosition[0], finalPosition[1], finalPosition[2])
    endTransformDrag({ id, position: finalPosition })
  }, [selectedObject, endTransformDrag])

  if (
    !selectedObject ||
    !selectedPanelId ||
    toolMode !== 'select' ||
    transformMode !== 'move' ||
    isExporting
  ) {
    return null
  }

  return (
    <TransformControls
      object={selectedObject}
      mode="translate"
      translationSnap={null}
      size={1.15}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onObjectChange={handleObjectChange}
    />
  )
}
