import { Edges } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MATERIALS } from '../../constants/materials'
import { useDesignStore } from '../../store/useDesignStore'
import {
  getEffectivePanelHandle,
  isLegOrBaseRole,
  type FurniturePanel,
} from '../../types/furniture'
import {
  buildExtrudedPanelGeometry,
  hasCustomPanelGeometry,
} from '../../utils/panelGeometry'
import { getMirrorTexture, getWoodTexture } from '../../utils/woodTextures'
import { FurnitureBaseMesh } from './FurnitureBaseMesh'
import { PanelHandle } from './PanelHandle'
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
  const renderMode = useDesignStore((s) => s.renderMode)
  const isSketch = renderMode === 'sketch'
  const isEcommerceWhite = renderMode === 'ecommerce_white'
  const isSelected = useDesignStore(
    (s) =>
      !s.isExporting &&
      s.toolMode === 'select' &&
      s.selectedPanelIds.includes(panel.id)
  )

  const matSpec = MATERIALS[panel.materialId] ?? MATERIALS.light_oak
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

  const useCustomExtrude =
    hasCustomPanelGeometry(panel) &&
    panel.role !== 'drawer' &&
    !isLegOrBaseRole(panel.role)

  const customGeometry = useMemo(() => {
    if (!useCustomExtrude) return null
    const clearance = panel.clearanceCm ?? 0.2
    const isDoor = panel.role === 'hinged_door' || panel.role === 'sliding_door'
    const geomDims = isDoor
      ? {
          width: Math.max(2, panel.dimensions.width - clearance * 2),
          height: Math.max(2, panel.dimensions.height - clearance * 2),
          depth: panel.dimensions.depth,
        }
      : panel.dimensions

    return buildExtrudedPanelGeometry(
      geomDims,
      panel.thicknessAxis,
      panel.cornerRadius,
      panel.cutouts,
      panel.cornerCutout
    )
  }, [
    useCustomExtrude,
    panel.role,
    panel.clearanceCm,
    panel.dimensions,
    panel.thicknessAxis,
    panel.cornerRadius,
    panel.cutouts,
    panel.cornerCutout,
  ])

  useEffect(() => {
    return () => {
      customGeometry?.dispose()
    }
  }, [customGeometry])

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

  const edgeColor = isSketch
    ? '#1e293b'
    : isEcommerceWhite
      ? '#e2e8f0'
      : isSelected
        ? '#fbbf24'
        : '#0f172a'
  const edgeWidth = isSketch ? 1.6 : isEcommerceWhite ? 1.3 : isSelected ? 2.6 : 0.8
  const edgeOpacity = isSketch ? 1 : isEcommerceWhite ? 1 : isSelected ? 1 : 0.22

  // إزاحة خفيفة متدرجة حسب نوع العنصر لمنع التداخل البصري (Z-Fighting) عند التقاء الأسطح المتطابقة
  const polyOffsetByRole: Record<FurniturePanel['role'], number> = {
    horizontal: 1,
    shelf: 2,
    vertical: 3,
    divider: 4,
    plinth_base: 5,
    plinth_recessed: 5,
    hinged_door: 6,
    sliding_door: 7,
    drawer: 8,
    back: 9,
    wood_legs: 10,
    wood_pillars: 10,
    wood_arch: 10,
    metal_legs: 11,
    tv_short_legs: 11,
    metal_frame: 11,
    metal_u_legs: 11,
    metal_x_legs: 11,
    custom: 2,
  }
  const polyOffset = polyOffsetByRole[panel.role] ?? 1
  const materialKey = isSketch
    ? 'sketch-mat'
    : isEcommerceWhite
      ? 'ecommerce-white-mat'
      : `${panel.materialId}-${texture ? 'tex' : 'solid'}`

  const mainMaterialProps = isSketch
    ? {
        color: '#f8fafc',
        map: null,
        roughness: 0.9,
        metalness: 0.0,
        emissive: '#000000',
        emissiveIntensity: 0,
        polygonOffset: true,
        polygonOffsetFactor: polyOffset,
        polygonOffsetUnits: polyOffset,
      }
    : isEcommerceWhite
      ? {
          color: '#f8f9fa',
          map: null,
          roughness: 0.85,
          metalness: 0.0,
          emissive: '#000000',
          emissiveIntensity: 0,
          polygonOffset: true,
          polygonOffsetFactor: polyOffset,
          polygonOffsetUnits: polyOffset,
        }
      : {
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

  const sketchSubEdges = isSketch ? (
    <Edges threshold={15} color="#1e293b" lineWidth={1.5} />
  ) : null

  const renderContent = () => {
    const { width, height, depth } = panel.dimensions
    const clearance = panel.clearanceCm ?? 0.2
    const handleConfig = getEffectivePanelHandle(panel)
    const mirrorTexture = panel.hasMirror ? getMirrorTexture() : null

    const renderMirrorLayer = (effW: number, effH: number, effD: number) => {
      if (!panel.hasMirror) return null
      const frameBorder = effW > 6 && effH > 6 ? 0.5 : 0
      const mirrorW = Math.max(1, effW - frameBorder * 2)
      const mirrorH = Math.max(1, effH - frameBorder * 2)
      const mirrorThick = 0.3
      const mirrorZ = effD / 2 + mirrorThick / 2 + 0.04

      return (
        <mesh position={[0, 0, mirrorZ]} castShadow receiveShadow onClick={handleClick}>
          <boxGeometry args={[mirrorW, mirrorH, mirrorThick]} />
          {isSketch ? (
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.9}
              metalness={0}
              polygonOffset
              polygonOffsetFactor={polyOffset + 1}
              polygonOffsetUnits={polyOffset + 1}
            />
          ) : (
            <meshPhysicalMaterial
              color="#e2e8f0"
              map={mirrorTexture ?? null}
              metalness={0.9}
              roughness={0.08}
              clearcoat={1}
              clearcoatRoughness={0.06}
              envMapIntensity={1.45}
              polygonOffset
              polygonOffsetFactor={polyOffset + 1}
              polygonOffsetUnits={polyOffset + 1}
            />
          )}
          <Edges
            threshold={15}
            color={isSketch ? '#1e293b' : isSelected ? '#fbbf24' : '#94a3b8'}
            lineWidth={isSketch ? 1.5 : isSelected ? 2 : 0.9}
          />
        </mesh>
      )
    }

    // 1. ضلفة مفصلية
    if (panel.role === 'hinged_door') {
      const effW = Math.max(2, width - clearance * 2)
      const effH = Math.max(2, height - clearance * 2)
      const effD = depth
      const hingeSide = panel.hingeSide ?? 'right'
      const hingeX = hingeSide === 'left' ? -effW / 2 : effW / 2
      const handleFrontZ = effD / 2 + (panel.hasMirror ? 0.34 : 0)

      return (
        <group position={[hingeX, 0, 0]} ref={animRef}>
          <group position={[-hingeX, 0, 0]}>
            <mesh
              geometry={customGeometry ?? undefined}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              {!customGeometry && <boxGeometry args={[effW, effH, effD]} />}
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
            {renderMirrorLayer(effW, effH, effD)}
            <PanelHandle
              config={handleConfig}
              faceWidth={effW}
              faceHeight={effH}
              frontZ={handleFrontZ}
              panelDepth={effD}
              isSketch={isSketch}
              onClick={handleClick}
            />
          </group>
        </group>
      )
    }

    // 2. ضلفة جرار
    if (panel.role === 'sliding_door') {
      const effW = Math.max(2, width - clearance * 2)
      const effH = Math.max(2, height - clearance * 2)
      const effD = depth
      const handleFrontZ = effD / 2 + (panel.hasMirror ? 0.34 : 0)

      return (
        <group ref={animRef}>
          <mesh
            geometry={customGeometry ?? undefined}
            castShadow
            receiveShadow
            onClick={handleClick}
          >
            {!customGeometry && <boxGeometry args={[effW, effH, effD]} />}
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
          {renderMirrorLayer(effW, effH, effD)}
          <PanelHandle
            config={handleConfig}
            faceWidth={effW}
            faceHeight={effH}
            frontZ={handleFrontZ}
            panelDepth={effD}
            isSketch={isSketch}
            onClick={handleClick}
          />
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
          <PanelHandle
            config={handleConfig}
            faceWidth={effW}
            faceHeight={effH}
            frontZ={depth / 2}
            panelDepth={frontThick}
            isSketch={isSketch}
            onClick={handleClick}
          />

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
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : isEcommerceWhite ? '#f8f9fa' : '#dfd6c7'}
                roughness={isSketch ? 0.9 : isEcommerceWhite ? 0.85 : 0.65}
              />
              {sketchSubEdges}
            </mesh>
            {/* جنب أيمن */}
            <mesh
              position={[boxW / 2 - boxWall / 2, 0, 0]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[boxWall, boxH, boxD]} />
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : isEcommerceWhite ? '#f8f9fa' : '#dfd6c7'}
                roughness={isSketch ? 0.9 : isEcommerceWhite ? 0.85 : 0.65}
              />
              {sketchSubEdges}
            </mesh>
            {/* ضهر الدرج */}
            <mesh
              position={[0, 0, -boxD / 2 + boxWall / 2]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[Math.max(1, boxW - boxWall * 2), boxH, boxWall]} />
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : isEcommerceWhite ? '#f8f9fa' : '#dfd6c7'}
                roughness={isSketch ? 0.9 : isEcommerceWhite ? 0.85 : 0.65}
              />
              {sketchSubEdges}
            </mesh>
            {/* قاع الدرج */}
            <mesh
              position={[0, -boxH / 2 + 0.4, 0]}
              castShadow
              receiveShadow
              onClick={handleClick}
            >
              <boxGeometry args={[Math.max(1, boxW - boxWall * 2), 0.8, boxD]} />
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : isEcommerceWhite ? '#f8f9fa' : '#cfc4b2'}
                roughness={isSketch ? 0.9 : isEcommerceWhite ? 0.85 : 0.7}
              />
              {sketchSubEdges}
            </mesh>
          </group>
        </group>
      )
    }

    // 4. جميع القواعد والرجول (سوكلة، رجول خشب/معدن، شاسيهات معدن، أعمدة، أرش)
    if (isLegOrBaseRole(panel.role)) {
      return (
        <FurnitureBaseMesh
          panel={panel}
          woodColor={texture ? '#ffffff' : matSpec.color}
          woodMap={texture ?? null}
          woodRoughness={matSpec.roughness}
          woodMetalness={matSpec.metalness}
          materialKey={materialKey}
          polyOffset={polyOffset}
          isSelected={isSelected}
          isSketch={isSketch}
          isWhiteStudio={isEcommerceWhite}
          edgeColor={edgeColor}
          edgeWidth={edgeWidth}
          edgeOpacity={edgeOpacity}
          onClick={handleClick}
        />
      )
    }

    // 5. لوح كونتر عادي (أو بأطراف مدورة / فتحات أسلاك عبر ExtrudeGeometry)
    return (
      <mesh
        geometry={customGeometry ?? undefined}
        castShadow
        receiveShadow
        onClick={handleClick}
      >
        {!customGeometry && <boxGeometry args={[width, height, depth]} />}
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
