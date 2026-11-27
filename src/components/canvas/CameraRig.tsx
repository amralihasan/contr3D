import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CAMERA_PRESETS } from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  const cameraPreset = useDesignStore((s) => s.cameraPreset)
  const cameraRequestTick = useDesignStore((s) => s.cameraRequestTick)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const isDraggingTape = useDesignStore((s) => s.isDraggingTape)
  const isDraggingHuman = useDesignStore((s) => s.isDraggingHuman)

  const animatingRef = useRef(false)
  const animElapsedRef = useRef(0)
  const desiredPosRef = useRef(new THREE.Vector3(...CAMERA_PRESETS.perspective.position))
  const desiredTargetRef = useRef(new THREE.Vector3(...CAMERA_PRESETS.perspective.target))

  useEffect(() => {
    if (cameraRequestTick === 0) return
    const cfg = CAMERA_PRESETS[cameraPreset]
    desiredPosRef.current.set(...cfg.position)
    desiredTargetRef.current.set(...cfg.target)
    animElapsedRef.current = 0
    animatingRef.current = true
  }, [cameraPreset, cameraRequestTick])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return

    if (animatingRef.current) {
      animElapsedRef.current += delta
      const alpha = Math.min(1, delta * 9)
      camera.position.lerp(desiredPosRef.current, alpha)
      controls.target.lerp(desiredTargetRef.current, alpha)
      controls.update()

      const reachedTarget =
        camera.position.distanceTo(desiredPosRef.current) < 0.35 &&
        controls.target.distanceTo(desiredTargetRef.current) < 0.35

      if (reachedTarget || animElapsedRef.current >= 0.85) {
        if (reachedTarget) {
          camera.position.copy(desiredPosRef.current)
          controls.target.copy(desiredTargetRef.current)
        }
        controls.update()
        animatingRef.current = false
      }
    }

    // منع هدف الكاميرا أو الكاميرا نفسها من النزول تحت مستوى الأرضية عند التحريك (Pan)
    if (controls.target.y < 0 || camera.position.y < 1) {
      if (controls.target.y < 0) controls.target.setY(0)
      if (camera.position.y < 1) camera.position.setY(1)
      controls.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isDraggingGizmo && !isDraggingTape && !isDraggingHuman}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.85}
      zoomSpeed={0.9}
      panSpeed={0.85}
      minDistance={25}
      maxDistance={560}
      maxPolarAngle={Math.PI / 2 - 0.03}
      target={[0, 40, 0]}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      onStart={() => {
        animatingRef.current = false
      }}
    />
  )
}
