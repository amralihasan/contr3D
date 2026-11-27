import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Canvas, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { CAMERA_PRESETS } from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import { isInterfaceRole, type CameraPreset } from '../../types/furniture'
import { exportSketchWithDimensions } from '../../utils/sketchExport'
import { registerThumbnailCapturer } from '../../utils/thumbnail'
import { CameraRig } from './CameraRig'
import { DimensionsOverlay3D } from './DimensionsOverlay3D'
import { GuideLines3D } from './GuideLines3D'
import { HumanReference } from './HumanReference'
import { PanelResizeHandles } from './PanelResizeHandles'
import { PanelTransformGizmo } from './PanelTransformGizmo'
import { SelectedDimensionTip } from './SelectedDimensionTip'
import { TapeMeasureTool, type TapePanelHandlers } from './TapeMeasureTool'
import { WoodPanelMesh } from './WoodPanelMesh'
import { WorkspaceGrid } from './WorkspaceGrid'

function isWebGLSupported(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
    )
  } catch {
    return false
  }
}

function buildExportFilename(designName: string, suffix?: string): string {
  const cleaned = designName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
  const dateStr = new Date().toISOString().slice(0, 10)
  const base = `${cleaned || 'contr3d-design'}-${dateStr}`
  return suffix ? `${base}-${suffix}.png` : `${base}.png`
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ExportCaptureController() {
  const { gl, scene, camera, get } = useThree()
  const exportRequestTick = useDesignStore((s) => s.exportRequestTick)
  const finishExportImage = useDesignStore((s) => s.finishExportImage)

  useEffect(() => {
    registerThumbnailCapturer(() => {
      gl.render(scene, camera)
      const src = gl.domElement
      const targetW = 320
      const targetH = 200
      const out = document.createElement('canvas')
      out.width = targetW
      out.height = targetH
      const ctx = out.getContext('2d')
      if (!ctx) return undefined

      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, targetW, targetH)

      const srcW = src.width || 1
      const srcH = src.height || 1
      const scale = Math.max(targetW / srcW, targetH / srcH)
      const drawW = srcW * scale
      const drawH = srcH * scale
      const dx = (targetW - drawW) / 2
      const dy = (targetH - drawH) / 2
      ctx.drawImage(src, dx, dy, drawW, drawH)
      return out.toDataURL('image/jpeg', 0.78)
    })

    return () => {
      registerThumbnailCapturer(null)
    }
  }, [gl, scene, camera])

  useEffect(() => {
    if (exportRequestTick === 0) return

    let cancelled = false
    let raf1 = 0
    let raf2 = 0

    // انتظار إطارين لضمان إخفاء الشبكة وأسهم التحريك وإطار التحديد وتحديث الخلفية في Three.js
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(async () => {
        if (cancelled) return
        const state = useDesignStore.getState()
        const mode = state.exportMode
        if (!mode) {
          finishExportImage(false)
          return
        }

        try {
          if (mode === 'three_angles') {
            const controls = get().controls as {
              target?: THREE.Vector3
              update?: () => void
            } | null

            const prevPos = camera.position.clone()
            const prevTarget = controls?.target ? controls.target.clone() : new THREE.Vector3(0, 40, 0)

            const angles: { preset: CameraPreset; suffix: string }[] = [
              { preset: 'front', suffix: 'امامي' },
              { preset: 'side', suffix: 'جانبي' },
              { preset: 'perspective', suffix: '3D' },
            ]

            for (const angle of angles) {
              if (cancelled) break
              const cfg = CAMERA_PRESETS[angle.preset]
              camera.position.set(...cfg.position)
              if (controls?.target) {
                controls.target.set(...cfg.target)
                controls.update?.()
              } else {
                camera.lookAt(...cfg.target)
              }
              camera.updateMatrixWorld()
              gl.render(scene, camera)
              const shotUrl = gl.domElement.toDataURL('image/png', 1.0)
              triggerPngDownload(
                shotUrl,
                buildExportFilename(state.currentDesignName, angle.suffix)
              )
              await sleep(180)
            }

            camera.position.copy(prevPos)
            if (controls?.target) {
              controls.target.copy(prevTarget)
              controls.update?.()
            }
            camera.updateMatrixWorld()

            if (!cancelled) {
              finishExportImage(true, 'تم تصدير 3 زوايا للتصميم بنجاح')
            }
            return
          }

          const prevBg = scene.background
          const prevFog = scene.fog
          const prevClearColor = gl.getClearColor(new THREE.Color())
          const prevClearAlpha = gl.getClearAlpha()

          if (mode === 'sketch') {
            scene.background = new THREE.Color('#ffffff')
            scene.fog = null
            gl.setClearColor(0xffffff, 1)
            gl.render(scene, camera)

            const visibleForSketch = state.interfacesHidden
              ? state.panels.filter((p) => !isInterfaceRole(p.role))
              : state.panels

            const sketchUrl = exportSketchWithDimensions(
              gl.domElement,
              camera,
              visibleForSketch,
              state.currentDesignName
            )

            scene.background = prevBg
            scene.fog = prevFog
            gl.setClearColor(prevClearColor, prevClearAlpha)

            triggerPngDownload(
              sketchUrl,
              buildExportFilename(state.currentDesignName, 'رسم-هندسي')
            )
            if (!cancelled) {
              finishExportImage(true, 'تم تصدير الرسم الهندسي بالمقاسات بنجاح')
            }
            return
          }

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
          if (!cancelled) {
            finishExportImage(true)
          }
        } catch {
          if (!cancelled) {
            finishExportImage(false)
          }
        }
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [exportRequestTick, gl, scene, camera, get, finishExportImage])

  return null
}

export function SceneCanvas() {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const interfacesHidden = useDesignStore((s) => s.interfacesHidden)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const isDraggingTape = useDesignStore((s) => s.isDraggingTape)
  const isResizingHandle = useDesignStore((s) => s.isResizingHandle)
  const toolMode = useDesignStore((s) => s.toolMode)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const selectGuide = useDesignStore((s) => s.selectGuide)

  const [objectMap, setObjectMap] = useState<Record<string, THREE.Object3D>>({})
  const [contextLost, setContextLost] = useState(false)
  const tapeHandlersRef = useRef<TapePanelHandlers | null>(null)
  const detachWebglListenersRef = useRef<(() => void) | null>(null)
  const webglAvailable = useMemo(() => isWebGLSupported(), [])

  useEffect(() => {
    return () => {
      detachWebglListenersRef.current?.()
      detachWebglListenersRef.current = null
    }
  }, [])

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

  if (!webglAvailable || contextLost) {
    return (
      <div
        dir="rtl"
        className="flex h-full w-full items-center justify-center bg-slate-950 p-6 text-slate-100"
      >
        <div className="w-full max-w-md rounded-3xl border border-amber-500/35 bg-slate-900/95 p-6 text-center shadow-2xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-100">
            {contextLost
              ? 'توقف محرك الرسوميات ثلاثي الأبعاد مؤقتاً'
              : 'المتصفح أو الجهاز لا يدعم WebGL حالياً'}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {contextLost
              ? 'حدث فقدان لسياق WebGL بسبب ضغط الذاكرة على الجهاز. يمكنك إعادة تحميل الصفحة لاستئناف العمل.'
              : 'تأكد من تفعيل تسريع الرسوميات (Hardware Acceleration) أو استخدم متصفحاً حديثاً.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            <span>إعادة تحميل المشهد</span>
          </button>
        </div>
      </div>
    )
  }

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
        onCreated={({ gl }) => {
          detachWebglListenersRef.current?.()
          const canvas = gl.domElement
          const onContextLost = (event: Event) => {
            event.preventDefault()
            setContextLost(true)
          }
          const onContextRestored = () => {
            setContextLost(false)
          }
          canvas.addEventListener('webglcontextlost', onContextLost)
          canvas.addEventListener('webglcontextrestored', onContextRestored)
          detachWebglListenersRef.current = () => {
            canvas.removeEventListener('webglcontextlost', onContextLost)
            canvas.removeEventListener('webglcontextrestored', onContextRestored)
          }
        }}
        onPointerMissed={() => {
          if (!isDraggingGizmo && !isDraggingTape && !isResizingHandle && toolMode === 'select') {
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
        <PanelResizeHandles selectedObject={selectedObject} />
        <ExportCaptureController />
      </Canvas>
      <SelectedDimensionTip />
    </div>
  )
}
