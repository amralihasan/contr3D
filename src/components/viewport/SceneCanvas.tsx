import { Canvas } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { CameraRig } from './CameraRig'
import { PanelTransformGizmo } from './PanelTransformGizmo'
import { WoodPanelMesh } from './WoodPanelMesh'
import { WorkspaceGrid } from './WorkspaceGrid'

export function SceneCanvas() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const selectPanel = useDesignStore((s) => s.selectPanel)

  const meshMapRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const [selectedMesh, setSelectedMesh] = useState<THREE.Mesh | null>(null)

  const registerMesh = useCallback((id: string, mesh: THREE.Mesh | null) => {
    if (mesh) {
      meshMapRef.current.set(id, mesh)
    } else {
      meshMapRef.current.delete(id)
    }
    const currentSelectedId = useDesignStore.getState().selectedPanelId
    if (id === currentSelectedId) {
      setSelectedMesh(mesh)
    }
  }, [])

  useEffect(() => {
    setSelectedMesh(selectedPanelId ? meshMapRef.current.get(selectedPanelId) ?? null : null)
  }, [selectedPanelId])

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
          {panels.map((panel) => (
            <WoodPanelMesh
              key={panel.id}
              panel={panel}
              isSelected={panel.id === selectedPanelId}
              registerMesh={registerMesh}
            />
          ))}
        </group>

        <PanelTransformGizmo selectedMesh={selectedMesh} />
      </Canvas>
    </div>
  )
}
