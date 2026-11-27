import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole } from '../../types/furniture'
import { CameraRig } from './CameraRig'
import { DimensionsOverlay3D } from './DimensionsOverlay3D'
import { GuideLines3D } from './GuideLines3D'
import { HumanReference } from './HumanReference'
import { PanelTransformGizmo } from './PanelTransformGizmo'
import { TapeMeasureTool, type TapePanelHandlers } from './TapeMeasureTool'
import { WoodPanelMesh } from './WoodPanelMesh'
import { WorkspaceGrid } from './WorkspaceGrid'

function buildExportFilename(designName: string): string {
  const cleaned = designName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
  const dateStr = new Date().toISOString().slice(0, 10)
  return `${cleaned || 'contr3d-design'}-${dateStr}.png`
}

function triggerPngDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
  }, 150)
}

function ExportCaptureController() {
  const { gl, scene, camera } = useThree()
  const exportRequestTick = useDesignStore((s) => s.exportRequestTick)
  const finishExportImage = useDesignStore((s) => s.finishExportImage)

  useEffect(() => {
    if (exportRequestTick === 0) return

    let raf1 = 0
    let raf2 = 0

    // انتظار إطارين لضمان إخفاء الشبكة وأسهم التحريك وإطار التحديد وتحديث الخلفية في Three.js
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const state = useDesignStore.getState()
        const mode = state.exportMode
        if (!mode) {
          finishExportImage(false)
          return
        }

        try {
          const prevBg = scene.background
          const prevFog = scene.fog
          const prevClearColor = gl.getClearColor(new THREE.Color())
          const prevClearAlpha = gl.getClearAlpha()

          if (mode === 'transparent') {
            scene.background = null
            scene.fog = null
            gl.setClearColor(0x000000, 0)
            gl.clear()
          }

          gl.render(scene, camera)
          const dataUrl = gl.domElement.toDataURL('image/png', 1.0)

          if (mode === 'transparent') {
            scene.background = prevBg
            scene.fog = prevFog
            gl.setClearColor(prevClearColor, prevClearAlpha)
          }

          triggerPngDownload(dataUrl, buildExportFilename(state.currentDesignName))
          finishExportImage(true)
        } catch {
          finishExportImage(false)
        }
      })
    })

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [exportRequestTick, gl, scene, camera, finishExportImage])

  return null
}

export function SceneCanvas() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const isDraggingTape = useDesignStore((s) => s.isDraggingTape)
  const toolMode = useDesignStore((s) => s.toolMode)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const selectGuide = useDesignStore((s) => s.selectGuide)

  const [objectMap, setObjectMap] = useState<Record<string, THREE.Object3D>>({})
  const tapeHandlersRef = useRef<TapePanelHandlers | null>(null)

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
    <div
      className={`relative h-full w-full canvas-touch-lock ${
        toolMode === 'tape' ? 'cursor-crosshair' : ''
      }`}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [145, 115, 175], fov: 42, near: 1, far: 1500 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => {
          if (!isDraggingGizmo && !isDraggingTape && toolMode === 'select') {
            selectPanel(null)
          } else if (toolMode === 'tape') {
            selectGuide(null)
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
              registerObject={registerObject}
              tapeHandlersRef={tapeHandlersRef}
            />
          ))}
        </group>

        <GuideLines3D />
        <HumanReference />
        <TapeMeasureTool objectMap={objectMap} handlersRef={tapeHandlersRef} />
        <DimensionsOverlay3D />
        <PanelTransformGizmo selectedObject={selectedObject} />
        <ExportCaptureController />
      </Canvas>
    </div>
  )
}
