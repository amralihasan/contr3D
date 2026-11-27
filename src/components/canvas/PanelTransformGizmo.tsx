import { TransformControls } from '@react-three/drei'
import { useCallback } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { computeSnappedPosition } from '../../utils/snapping'

interface PanelTransformGizmoProps {
  selectedObject: THREE.Object3D | null
}

export function PanelTransformGizmo({ selectedObject }: PanelTransformGizmoProps) {
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const panels = useDesignStore((s) => s.panels)
  const toolMode = useDesignStore((s) => s.toolMode)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const beginTransformDrag = useDesignStore((s) => s.beginTransformDrag)
  const movePanelLive = useDesignStore((s) => s.movePanelLive)
  const endTransformDrag = useDesignStore((s) => s.endTransformDrag)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null

  const handleObjectChange = useCallback(() => {
    if (!selectedObject || !selectedPanel) return
    const state = useDesignStore.getState()
    if (!state.isDraggingGizmo) return

    const otherPanels = state.panels.filter((p) => p.id !== selectedPanel.id)
    const activeGuides = state.guidesVisible ? state.guides : []
    const proposed: [number, number, number] = [
      selectedObject.position.x,
      selectedObject.position.y,
      selectedObject.position.z,
    ]

    const { position, feedback } = computeSnappedPosition(
      selectedPanel,
      proposed,
      otherPanels,
      snappingEnabled,
      activeGuides
    )

    selectedObject.position.set(position[0], position[1], position[2])
    movePanelLive(selectedPanel.id, position, feedback)
  }, [selectedObject, selectedPanel, snappingEnabled, movePanelLive])

  if (!selectedObject || !selectedPanel || toolMode !== 'select') return null

  return (
    <TransformControls
      object={selectedObject}
      mode="translate"
      size={1.15}
      onMouseDown={beginTransformDrag}
      onMouseUp={endTransformDrag}
      onObjectChange={handleObjectChange}
    />
  )
}
