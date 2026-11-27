import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useDesignStore } from '../../store/useDesignStore'
import type { CameraPreset } from '../../types/furniture'

const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  perspective: { position: [145, 115, 175], target: [0, 40, 0] },
  front: { position: [0, 45, 225], target: [0, 45, 0] },
  side: { position: [225, 45, 0], target: [0, 45, 0] },
  top: { position: [0, 245, 0.1], target: [0, 0, 0] },
}

export function CameraRig() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  const cameraPreset = useDesignStore((s) => s.cameraPreset)
  const cameraRequestTick = useDesignStore((s) => s.cameraRequestTick)
  const isDraggingGizmo = useDesignStore((s) => s.isDraggingGizmo)
  const isDraggingTape = useDesignStore((s) => s.isDraggingTape)

  const animatingRef = useRef(false)
  const desiredPosRef = useRef(new THREE.Vector3(...CAMERA_PRESETS.perspective.position))
  const desiredTargetRef = useRef(new THREE.Vector3(...CAMERA_PRESETS.perspective.target))

  useEffect(() => {
    if (cameraRequestTick === 0) return
    const cfg = CAMERA_PRESETS[cameraPreset]
    desiredPosRef.current.set(...cfg.position)
    desiredTargetRef.current.set(...cfg.target)
    animatingRef.current = true
  }, [cameraPreset, cameraRequestTick])

  useFrame((_, delta) => {
    if (!animatingRef.current || !controlsRef.current) return
    const alpha = Math.min(1, delta * 9)
    camera.position.lerp(desiredPosRef.current, alpha)
    controlsRef.current.target.lerp(desiredTargetRef.current, alpha)
    controlsRef.current.update()

    if (
      camera.position.distanceTo(desiredPosRef.current) < 0.35 &&
      controlsRef.current.target.distanceTo(desiredTargetRef.current) < 0.35
    ) {
      camera.position.copy(desiredPosRef.current)
      controlsRef.current.target.copy(desiredTargetRef.current)
      controlsRef.current.update()
      animatingRef.current = false
    }
  })

  return (
      <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isDraggingGizmo && !isDraggingTape}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.85}
      zoomSpeed={0.9}
      panSpeed={0.85}
      minDistance={25}
      maxDistance={560}
      maxPolarAngle={Math.PI / 2 - 0.015}
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
