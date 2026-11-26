import { Canvas } from '@react-three/fiber'
import { useCallback, useState } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole } from '../../types/furniture'
import { CameraRig } from './CameraRig'
import { DimensionsOverlay3D } from './DimensionsOverlay3D'
import { PanelTransformGizmo } from './PanelTransformGizmo'
import { WoodPanelMesh } from './WoodPanelMesh'
import { WorkspaceGrid } from './WorkspaceGrid'

export function SceneCanvas() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const selectPanel = useDesignStore((s) => s.selectPanel)

  const [objectMap, setObjectMap] = useState<Record<string, THREE.Object3D>>({})

  const visiblePanels = interfacesHidden
    ? panels.filter((p) => !isInterfaceRole(p.role))
    : panels

  const registerObject = useCallback((id: string, obj: THREE.Object3D | null) => {
    setObjectMap((prev) => {
      if (obj) {
        if (prev[id] === obj) return prev
        return { ...prev, [id]: obj }
      }
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const isSelectedHidden =
    interfacesHidden &&
    selectedPanelId !== null &&
    panels.some((p) => p.id === selectedPanelId && isInterfaceRole(p.role))

  const selectedObject =
    selectedPanelId && !isSelectedHidden ? objectMap[selectedPanelId] ?? null : null

  return (
    <div className="relative h-full w-full canvas-touch-lock">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [145, 115, 175], fov: 42, near: 1, far: 1500 }}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        onPointerMissed={() => {
          if (!isDraggingGizmo) {
            selectPanel(null)
          }
        }}
      >
        <WorkspaceGrid />
        <CameraRig />

        <group>
          {visiblePanels.map((panel) => (
            <WoodPanelMesh
              key={panel.id}
              panel={panel}
              isSelected={selectedPanelIds.includes(panel.id)}
              registerObject={registerObject}
            />
          ))}
        </group>

        <DimensionsOverlay3D />
        <PanelTransformGizmo selectedObject={selectedObject} />
      </Canvas>
    </div>
  )
}
