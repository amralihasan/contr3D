import { Edges } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import type * as THREE from 'three'
import { MATERIALS } from '../../constants/materials'
import { useDesignStore } from '../../store/useDesignStore'
import type { FurniturePanel } from '../../types/furniture'
import { getWoodTexture } from '../../utils/woodTextures'

interface WoodPanelMeshProps {
  panel: FurniturePanel
  isSelected: boolean
  registerMesh: (id: string, mesh: THREE.Mesh | null) => void
}

export function WoodPanelMesh({ panel, isSelected, registerMesh }: WoodPanelMeshProps) {
  const meshRef = useRef<THREE.Mesh | null>(null)
  const selectPanel = useDesignStore((s) => s.selectPanel)

  const matSpec = MATERIALS[panel.materialId]
  const texture = useMemo(() => {
    const tex = getWoodTexture(panel.materialId)
    if (!tex) return null
    const cloned = tex.clone()
    // تكرار مناسب حسب حجم اللوح ليبدو تعريق الخشب متناسقاً
    const maxLen = Math.max(panel.dimensions.width, panel.dimensions.height, panel.dimensions.depth)
    const repeatVal = Math.max(1, maxLen / 85)
    cloned.repeat.set(repeatVal, repeatVal)
    cloned.needsUpdate = true
    return cloned
  }, [panel.materialId, panel.dimensions.width, panel.dimensions.height, panel.dimensions.depth])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  useEffect(() => {
    registerMesh(panel.id, meshRef.current)
    return () => {
      registerMesh(panel.id, null)
    }
  }, [panel.id, registerMesh])

  return (
    <mesh
      ref={meshRef}
      name={panel.id}
      position={panel.position}
      rotation={panel.rotation}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation()
        selectPanel(panel.id)
      }}
    >
      <boxGeometry args={[panel.dimensions.width, panel.dimensions.height, panel.dimensions.depth]} />
      <meshStandardMaterial
        color={texture ? '#ffffff' : matSpec.color}
        map={texture ?? null}
        roughness={matSpec.roughness}
        metalness={matSpec.metalness}
        emissive={isSelected ? '#f59e0b' : '#000000'}
        emissiveIntensity={isSelected ? 0.09 : 0}
      />
      <Edges
        scale={isSelected ? 1.003 : 1.001}
        threshold={15}
        color={isSelected ? '#fbbf24' : '#0f172a'}
        lineWidth={isSelected ? 2.4 : 0.8}
        transparent
        opacity={isSelected ? 1 : 0.22}
      />
    </mesh>
  )
}
