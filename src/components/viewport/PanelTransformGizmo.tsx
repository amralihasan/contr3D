import { TransformControls } from '@react-three/drei'
import { useCallback } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { computeSnappedPosition } from '../../utils/snapping'

interface PanelTransformGizmoProps {
  selectedMesh: THREE.Mesh | null
}

export function PanelTransformGizmo({ selectedMesh }: PanelTransformGizmoProps) {
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const panels = useDesignStore((s) => s.panels)
  const snappingEnabled = useDesignStore((s) => s.snappingEnabled)
  const beginTransformDrag = useDesignStore((s) => s.beginTransformDrag)
  const movePanelLive = useDesignStore((s) => s.movePanelLive)
  const endTransformDrag = useDesignStore((s) => s.endTransformDrag)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null

  const handleObjectChange = useCallback(() => {
    if (!selectedMesh || !selectedPanel) return
    const state = useDesignStore.getState()
    if (!state.isDraggingGizmo) return

    const otherPanels = state.panels.filter((p) => p.id !== selectedPanel.id)
    const proposed: [number, number, number] = [
      selectedMesh.position.x,
      selectedMesh.position.y,
      selectedMesh.position.z,
    ]

    const { position, feedback } = computeSnappedPosition(
      selectedPanel,
      proposed,
      otherPanels,
      snappingEnabled
    )

    selectedMesh.position.set(position[0], position[1], position[2])
    movePanelLive(selectedPanel.id, position, feedback)
  }, [selectedMesh, selectedPanel, snappingEnabled, movePanelLive])

  if (!selectedMesh || !selectedPanel) return null

  return (
    <TransformControls
      object={selectedMesh}
      mode="translate"
      size={1.15}
      onMouseDown={beginTransformDrag}
      onMouseUp={endTransformDrag}
      onObjectChange={handleObjectChange}
    />
  )
}
