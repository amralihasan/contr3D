import { Edges } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MATERIALS } from '../../constants/materials'
import { useDesignStore } from '../../store/useDesignStore'
import type { FurniturePanel } from '../../types/furniture'
import { getWoodTexture } from '../../utils/woodTextures'
import type { TapePanelHandlers } from './TapeMeasureTool'

interface WoodPanelMeshProps {
  panel: FurniturePanel
  registerObject: (id: string, obj: THREE.Object3D | null) => void
  tapeHandlersRef: MutableRefObject<TapePanelHandlers | null>
}

export const WoodPanelMesh = memo(function WoodPanelMesh({
  panel,
  registerObject,
  tapeHandlersRef,
}: WoodPanelMeshProps) {
  const groupRef = useRef<THREE.Group | null>(null)
  const animRef = useRef<THREE.Group | null>(null)

  const selectPanel = useDesignStore((s) => s.selectPanel)
  const interfacesOpen = useDesignStore((s) => s.interfacesOpen)
  const isSelected = useDesignStore(
    (s) =>
      !s.isExporting &&
      s.toolMode === 'select' &&
      s.selectedPanelIds.includes(panel.id)
  )

  const matSpec = MATERIALS[panel.materialId]
  const texture = useMemo(() => {
    const tex = getWoodTexture(panel.materialId)
    if (!tex) return null
    const cloned = tex.clone()
    const maxLen = Math.max(
      panel.dimensions.width,
      panel.dimensions.height,
      panel.dimensions.depth
    )
    const repeatVal = Math.max(1, maxLen / 85)
    cloned.repeat.set(repeatVal, repeatVal)
    cloned.needsUpdate = true
    return cloned
  }, [
    panel.materialId,
    panel.dimensions.width,
    panel.dimensions.height,
    panel.dimensions.depth,
  ])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  useEffect(() => {
    registerObject(panel.id, groupRef.current)
    return () => {
      registerObject(panel.id, null)
    }
  }, [panel.id, registerObject])

  // أنيميشن ناعم لفتح وإغلاق الضلف والأدراج
  useFrame((_, delta) => {
    const animObj = animRef.current
    if (!animObj) return
    const speed = 8

    if (panel.role === 'hinged_door') {
      const hingeSide = panel.hingeSide ?? 'right'
      const targetRot = interfacesOpen
        ? hingeSide === 'left'
          ? -Math.PI * 0.52
          : Math.PI * 0.52
        : 0
      animObj.rotation.y = THREE.MathUtils.damp(animObj.rotation.y, targetRot, speed, delta)
    } else if (panel.role === 'sliding_door') {
      const clearance = panel.clearanceCm ?? 0.2
      const effW = Math.max(2, panel.dimensions.width - clearance * 2)
      const dir = panel.hingeSide === 'right' ? -1 : 1
      const targetX = interfacesOpen ? dir * effW * 0.78 : 0
      animObj.position.x = THREE.MathUtils.damp(animObj.position.x, targetX, speed, delta)
    } else if (panel.role === 'drawer') {
      const targetZ = interfacesOpen ? Math.min(panel.dimensions.depth * 0.75, 30) : 0
      animObj.position.z = THREE.MathUtils.damp(animObj.position.z, targetZ, speed, delta)
    }
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (useDesignStore.getState().toolMode === 'tape') return
    selectPanel(panel.id, e.shiftKey || e.ctrlKey || e.metaKey)
  }

  const isIgnoredHelperHit = (e: ThreeEvent<PointerEvent>): boolean => {
    const mat = (e.object as THREE.Mesh).material as THREE.Material | undefined
    return Boolean(mat && mat.transparent && mat.opacity === 0)
  }

  const handleTapePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (useDesignStore.getState().toolMode !== 'tape') return
    if (isIgnoredHelperHit(e)) return
    tapeHandlersRef.current?.onPanelPointerDown(panel, e)
  }

  const handleTapePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (useDesignStore.getState().toolMode !== 'tape') return
    if (isIgnoredHelperHit(e)) return
    tapeHandlersRef.current?.onPanelPointerMove(panel, e)
  }

  const handleTapePointerOut = () => {
    if (useDesignStore.getState().toolMode !== 'tape') return
    tapeHandlersRef.current?.onPanelPointerOut()
  }

  const handleContextMenu = (e: ThreeEvent<MouseEvent>) => {
    if (useDesignStore.getState().toolMode === 'tape') return
    e.stopPropagation()
    if (!useDesignStore.getState().selectedPanelIds.includes(panel.id)) {
      selectPanel(panel.id)
    }
  }

  const edgeColor = isSelected ? '#fbbf24' : '#0f172a'
  const edgeWidth = isSelected ? 2.6 : 0.8
  const edgeOpacity = isSelected ? 1 : 0.22

  // إزاحة خفيفة متدرجة حسب نوع العنصر لمنع التداخل البصري (Z-Fighting) عند التقاء الأسطح المتطابقة
  const polyOffsetByRole: Record<FurniturePanel['role'], number> = {
    horizontal: 1,
    shelf: 2,
    vertical: 3,
    divider: 4,
    plinth_base: 5,
    hinged_door: 6,
    sliding_door: 7,
    drawer: 8,
    back: 9,
    wood_legs: 10,
    metal_legs: 11,
    custom: 2,
  }
  const polyOffset = polyOffsetByRole[panel.role] ?? 1
  const materialKey = `${panel.materialId}-${texture ? 'tex' : 'solid'}`

  const mainMaterialProps = {
    color: texture ? '#ffffff' : matSpec.color,
    map: texture ?? null,
    roughness: matSpec.roughness,
    metalness: matSpec.metalness,
    emissive: '#000000',
    emissiveIntensity: 0,
    polygonOffset: true,
    polygonOffsetFactor: polyOffset,
    polygonOffsetUnits: polyOffset,
  }

  const renderContent = () => {
    const { width, height, depth } = panel.dimensions
    const clearance = panel.clearanceCm ?? 0.2
    const hasHandle = panel.hasHandle !== false

    // 1. ضلفة مفصلية
    if (panel.role === 'hinged_door') {
      const effW = Math.max(2, width - clearance * 2)
      const effH = Math.max(2, height - clearance * 2)
      const effD = depth
      const hingeSide = panel.hingeSide ?? 'right'
      const hingeX = hingeSide === 'left' ? -effW / 2 : effW / 2
      const handleX = hingeSide === 'left' ? effW / 2 - 3.2 : -effW / 2 + 3.2

      return (
        <group position={[hingeX, 0, 0]} ref={animRef}>
          <group position={[-hingeX, 0, 0]}>
            <mesh castShadow receiveShadow onClick={handleClick}>
              <boxGeometry args={[effW, effH, effD]} />
              <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
              <Edges
                scale={isSelected ? 1.003 : 1.001}
                threshold={15}
                color={edgeColor}
                lineWidth={edgeWidth}
                transparent
                opacity={edgeOpacity}
              />
            </mesh>
            {hasHandle && (
              <mesh
                position={[handleX, 0, effD / 2 + 0.9]}
                castShadow
                onClick={handleClick}
              >
                <boxGeometry args={[0.9, Math.min(14, effH * 0.28), 1.4]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.28} />
              </mesh>
            )}
          </group>
        </group>
      )
    }

    // 2. ضلفة جرار
    if (panel.role === 'sliding_door') {
      const effW = Math.max(2, width - clearance * 2)
      const effH = Math.max(2, height - clearance * 2)
      const effD = depth
      const handleX = panel.hingeSide === 'right' ? effW / 2 - 2.5 : -effW / 2 + 2.5

      return (
        <group ref={animRef}>
          <mesh castShadow receiveShadow onClick={handleClick}>
            <boxGeometry args={[effW, effH, effD]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges
              scale={isSelected ? 1.003 : 1.001}
              threshold={15}
              color={edgeColor}
              lineWidth={edgeWidth}
              transparent
              opacity={edgeOpacity}
            />
          </mesh>
          {hasHandle && (
            <mesh
              position={[handleX, 0, effD / 2 + 0.35]}
              castShadow
              onClick={handleClick}
            >
              <boxGeometry args={[1.1, Math.min(18, effH * 0.32), 0.6]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.7} roughness={0.32} />
            </mesh>
          )}
        </group>
      )
    }

    // 3. درج كامل (واجهة + صندوق داخلي)
    if (panel.role === 'drawer') {
      const effW = Math.max(3, width - clearance * 2)
      const effH = Math.max(3, height - clearance * 2)
      const frontThick = Math.min(1.8, depth * 0.35)
      const boxW = Math.max(2, effW - 2.6)
      const boxH = Math.max(2, effH - 2.8)
      const boxD = Math.max(3, depth - frontThick)
      const boxWall = 1.2
      const boxCenterZ = -frontThick / 2

      return (
        <group ref={animRef}>
          {/* واجهة الدرج */}
          <mesh
            position={[0, 0, depth / 2 - frontThick / 2]}
            castShadow
            receiveShadow
            onClick={handleClick}
          >
            <boxGeometry args={[effW, effH, frontThick]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges
              scale={isSelected ? 1.003 : 1.001}
              threshold={15}
              color={edgeColor}
              lineWidth={edgeWidth}
              transparent
              opacity={edgeOpacity}
            />
          </mesh>

          {/* المقبض */}
          {hasHandle && (
            <mesh
              position={[0, 0, depth / 2 + 0.9]}
              castShadow
              onClick={handleClick}
            >
              <boxGeometry args={[Math.min(16, effW * 0.32), 0.9, 1.4]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.75} roughness={0.28} />
            </mesh>
          )}

          {/* صندوق الدرج الداخلي */}
          <group position={[0, -0.6, boxCenterZ]}>
            {/* جنب أيسر */}
            <mesh
              position={[-boxW / 2 + boxWall / 2, 0, 0]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[boxWall, boxH, boxD]} />
              <meshStandardMaterial color="#dfd6c7" roughness={0.65} />
            </mesh>
            {/* جنب أيمن */}
            <mesh
              position={[boxW / 2 - boxWall / 2, 0, 0]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[boxWall, boxH, boxD]} />
              <meshStandardMaterial color="#dfd6c7" roughness={0.65} />
            </mesh>
            {/* ضهر الدرج */}
            <mesh
              position={[0, 0, -boxD / 2 + boxWall / 2]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[Math.max(1, boxW - boxWall * 2), boxH, boxWall]} />
              <meshStandardMaterial color="#dfd6c7" roughness={0.65} />
            </mesh>
            {/* قاع الدرج */}
            <mesh
              position={[0, -boxH / 2 + 0.4, 0]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[Math.max(1, boxW - boxWall * 2), 0.8, boxD]} />
              <meshStandardMaterial color="#cfc4b2" roughness={0.7} />
            </mesh>
          </group>
        </group>
      )
    }

    // 4. سوكلة / وزرة كونتر
    if (panel.role === 'plinth_base') {
      const wall = Math.min(1.8, width / 4, depth / 4)
      const innerW = Math.max(1, width - wall * 2)
      return (
        <group>
          {/* واجهة أمامية وخلفية */}
          <mesh position={[0, 0, depth / 2 - wall / 2]} castShadow receiveShadow onClick={handleClick}>
            <boxGeometry args={[width, height, wall]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
          <mesh position={[0, 0, -depth / 2 + wall / 2]} castShadow receiveShadow onClick={handleClick}>
            <boxGeometry args={[width, height, wall]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
          {/* جوانب السوكلة */}
          <mesh position={[-width / 2 + wall / 2, 0, 0]} castShadow receiveShadow onClick={handleClick}>
            <boxGeometry args={[wall, height, Math.max(1, depth - wall * 2)]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
          <mesh position={[width / 2 - wall / 2, 0, 0]} castShadow receiveShadow onClick={handleClick}>
            <boxGeometry args={[wall, height, Math.max(1, depth - wall * 2)]} />
            <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
          {/* إطار تحديد خفيف للمساحة الكلية عند الاختيار */}
          {isSelected && innerW > 0 && (
            <mesh onClick={handleClick}>
              <boxGeometry args={[width, height, depth]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Edges color="#fbbf24" lineWidth={2.2} />
            </mesh>
          )}
        </group>
      )
    }

    // 5. طقم 4 رجول خشب مايلة
    if (panel.role === 'wood_legs') {
      const legRadiusTop = Math.min(2.2, width * 0.04, depth * 0.08)
      const legRadiusBot = legRadiusTop * 0.65
      const plateH = Math.min(0.6, height * 0.1)
      const legH = Math.max(2, height - plateH)
      const insetX = Math.max(2, width / 2 - 4)
      const insetZ = Math.max(2, depth / 2 - 4)

      const corners: [number, number, number, number][] = [
        [-insetX, -insetZ, -1, -1],
        [insetX, -insetZ, 1, -1],
        [-insetX, insetZ, -1, 1],
        [insetX, insetZ, 1, 1],
      ]

      return (
        <group>
          {corners.map(([cx, cz, sx, sz], idx) => (
            <group key={idx} position={[cx, 0, cz]}>
              {/* قاعدة تثبيت علوية */}
              <mesh
                position={[0, height / 2 - plateH / 2, 0]}
                castShadow
                receiveShadow
                onClick={handleClick}
              >
                <boxGeometry args={[5, plateH, 5]} />
                <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.45} />
              </mesh>
              {/* الرجل الخشبية المايلة */}
              <mesh
                position={[sx * 0.8, -plateH / 2, sz * 0.8]}
                rotation={[-sz * 0.11, 0, sx * 0.11]}
                castShadow
                receiveShadow
                onClick={handleClick}
              >
                <cylinderGeometry args={[legRadiusTop, legRadiusBot, legH, 16]} />
                <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
              </mesh>
            </group>
          ))}
          {isSelected && (
            <mesh onClick={handleClick}>
              <boxGeometry args={[width, height, depth]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Edges color="#fbbf24" lineWidth={2} />
            </mesh>
          )}
        </group>
      )
    }

    // 6. طقم 4 رجول معدن مستقيمة
    if (panel.role === 'metal_legs') {
      const postSize = Math.min(3.2, width * 0.05, depth * 0.1)
      const plateH = Math.min(0.5, height * 0.1)
      const glideH = Math.min(0.5, height * 0.1)
      const postH = Math.max(2, height - plateH - glideH)
      const insetX = Math.max(1.5, width / 2 - postSize / 2 - 1)
      const insetZ = Math.max(1.5, depth / 2 - postSize / 2 - 1)

      const corners: [number, number][] = [
        [-insetX, -insetZ],
        [insetX, -insetZ],
        [-insetX, insetZ],
        [insetX, insetZ],
      ]

      return (
        <group>
          {corners.map(([cx, cz], idx) => (
            <group key={idx} position={[cx, 0, cz]}>
              {/* قاعدة تثبيت علوية */}
              <mesh
                position={[0, height / 2 - plateH / 2, 0]}
                castShadow
                receiveShadow
                onClick={handleClick}
              >
                <boxGeometry args={[postSize + 2, plateH, postSize + 2]} />
                <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
              </mesh>
              {/* عمود الرجل المعدني */}
              <mesh
                position={[0, (glideH - plateH) / 2, 0]}
                castShadow
                receiveShadow
                onClick={handleClick}
              >
                <boxGeometry args={[postSize, postH, postSize]} />
                <meshStandardMaterial
                  key={panel.materialId}
                  color={matSpec.color}
                  metalness={0.75}
                  roughness={0.32}
                  polygonOffset
                  polygonOffsetFactor={polyOffset}
                  polygonOffsetUnits={polyOffset}
                />
                <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
              </mesh>
              {/* كعب أرضي */}
              <mesh
                position={[0, -height / 2 + glideH / 2, 0]}
                castShadow
                receiveShadow
                onClick={handleClick}
              >
                <cylinderGeometry args={[postSize * 0.55, postSize * 0.6, glideH, 12]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
            </group>
          ))}
          {isSelected && (
            <mesh onClick={handleClick}>
              <boxGeometry args={[width, height, depth]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              <Edges color="#fbbf24" lineWidth={2} />
            </mesh>
          )}
        </group>
      )
    }

    // 7. لوح كونتر عادي (قرصة، جنب، رف، قاطع، ضهر)
    return (
      <mesh castShadow receiveShadow onClick={handleClick}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial key={materialKey} {...mainMaterialProps} />
        <Edges
          scale={isSelected ? 1.003 : 1.001}
          threshold={15}
          color={edgeColor}
          lineWidth={edgeWidth}
          transparent
          opacity={edgeOpacity}
        />
      </mesh>
    )
  }

  return (
    <group
      ref={groupRef}
      name={panel.id}
      position={panel.position}
      rotation={panel.rotation}
      onPointerDown={handleTapePointerDown}
      onPointerMove={handleTapePointerMove}
      onPointerOut={handleTapePointerOut}
      onContextMenu={handleContextMenu}
    >
      {renderContent()}
    </group>
  )
})
