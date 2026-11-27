import { Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { FurniturePanel, MetalBaseColor } from '../../types/furniture'

interface FurnitureBaseMeshProps {
  panel: FurniturePanel
  woodColor: string
  woodMap: THREE.Texture | null
  woodRoughness: number
  woodMetalness: number
  materialKey: string
  polyOffset: number
  isSelected: boolean
  isSketch: boolean
  edgeColor: string
  edgeWidth: number
  edgeOpacity: number
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const METAL_COLOR_HEX: Record<MetalBaseColor, string> = {
  matte_black: '#18181b',
  gold: '#d4af37',
  matte_white: '#f8fafc',
  anthracite: '#334155',
}

function buildArchLegGeometry(depth: number, height: number, thickness: number): THREE.ExtrudeGeometry {
  const safeD = Math.max(14, depth)
  const safeH = Math.max(12, height)
  const halfD = safeD / 2
  const halfH = safeH / 2
  const footW = Math.min(safeD * 0.26, Math.max(4.5, safeD * 0.2))
  const archHalfSpan = Math.max(3, halfD - footW)
  const archHeight = Math.min(safeH * 0.72, Math.max(4, safeH - 6))

  const shape = new THREE.Shape()
  // البدء من الركن السفلي الأيسر (-halfD, -halfH) باتجاه عقارب الساعة حول المحيط الخارجي
  shape.moveTo(-halfD, -halfH)
  shape.lineTo(-halfD, halfH)
  shape.lineTo(halfD, halfH)
  shape.lineTo(halfD, -halfH)
  shape.lineTo(archHalfSpan, -halfH)

  // رسم القوس الداخلي الناعم أسفل القائمة
  const archTopY = -halfH + archHeight
  const cpOffset = archHalfSpan * 0.55
  shape.bezierCurveTo(
    archHalfSpan,
    -halfH + archHeight * 0.65,
    cpOffset,
    archTopY,
    0,
    archTopY
  )
  shape.bezierCurveTo(
    -cpOffset,
    archTopY,
    -archHalfSpan,
    -halfH + archHeight * 0.65,
    -archHalfSpan,
    -halfH
  )
  shape.closePath()

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 28,
  })
  // توسيط السُمك على محور Z المحلي ثم تدويره ليكون السُمك على X والقوس في مستوى Z-Y
  geo.translate(0, 0, -thickness / 2)
  geo.rotateY(Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export function FurnitureBaseMesh({
  panel,
  woodColor,
  woodMap,
  woodRoughness,
  woodMetalness,
  materialKey,
  polyOffset,
  isSelected,
  isSketch,
  edgeColor,
  edgeWidth,
  edgeOpacity,
  onClick,
}: FurnitureBaseMeshProps) {
  const { width, height, depth } = panel.dimensions

  const woodMatProps = isSketch
    ? {
        color: '#f8fafc',
        map: null,
        roughness: 0.9,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: polyOffset,
        polygonOffsetUnits: polyOffset,
      }
    : {
        color: woodColor,
        map: woodMap,
        roughness: woodRoughness,
        metalness: woodMetalness,
        polygonOffset: true,
        polygonOffsetFactor: polyOffset,
        polygonOffsetUnits: polyOffset,
      }

  const metalHex = panel.metalColor
    ? METAL_COLOR_HEX[panel.metalColor]
    : panel.role === 'metal_legs'
      ? woodColor
      : METAL_COLOR_HEX.matte_black

  const metalMatProps = isSketch
    ? {
        color: '#f8fafc',
        metalness: 0,
        roughness: 0.9,
        polygonOffset: true,
        polygonOffsetFactor: polyOffset,
        polygonOffsetUnits: polyOffset,
      }
    : {
        color: metalHex,
        metalness: panel.metalColor === 'matte_white' ? 0.25 : 0.72,
        roughness: panel.metalColor === 'gold' ? 0.28 : 0.42,
        polygonOffset: true,
        polygonOffsetFactor: polyOffset,
        polygonOffsetUnits: polyOffset,
      }

  const sketchSubEdges = isSketch ? (
    <Edges threshold={15} color="#1e293b" lineWidth={1.5} />
  ) : null

  const archGeometry = useMemo(() => {
    if (panel.role !== 'wood_arch') return null
    return buildArchLegGeometry(depth, height, 3.6)
  }, [panel.role, depth, height])

  useEffect(() => {
    return () => {
      archGeometry?.dispose()
    }
  }, [archGeometry])

  const selectionOutline = isSelected ? (
    <mesh onClick={onClick}>
      <boxGeometry args={[width, height, depth]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges color="#fbbf24" lineWidth={2.2} />
    </mesh>
  ) : null

  // 1. سوكلة خشب (ظاهرة أو غاطسة للدواليب)
  if (panel.role === 'plinth_base' || panel.role === 'plinth_recessed') {
    const wall = Math.min(1.8, width / 4, depth / 4)
    const isRecessed = panel.role === 'plinth_recessed'
    const innerDepth = Math.max(1, depth - wall * 2)
    return (
      <group>
        <mesh position={[0, 0, depth / 2 - wall / 2]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[width, height, wall]} />
          <meshStandardMaterial key={materialKey} {...woodMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        <mesh position={[0, 0, -depth / 2 + wall / 2]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[width, height, wall]} />
          <meshStandardMaterial key={materialKey} {...woodMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        <mesh position={[-width / 2 + wall / 2, 0, 0]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[wall, height, innerDepth]} />
          <meshStandardMaterial key={materialKey} {...woodMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        <mesh position={[width / 2 - wall / 2, 0, 0]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[wall, height, innerDepth]} />
          <meshStandardMaterial key={materialKey} {...woodMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        {/* عارضة ربط علوية للوزرة الغاطسة لزيادة الثبات */}
        {isRecessed && width > wall * 4 && innerDepth > 4 && (
          <mesh
            position={[0, height / 2 - wall / 2, 0]}
            castShadow
            receiveShadow
            onClick={onClick}
          >
            <boxGeometry args={[Math.max(2, width - wall * 2), wall, Math.min(8, innerDepth * 0.4)]} />
            <meshStandardMaterial key={materialKey} {...woodMatProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
        )}
        {selectionOutline}
      </group>
    )
  }

  // 2. طقم 4 رجول خشب مايلة
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
            <mesh
              position={[0, height / 2 - plateH / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[5, plateH, 5]} />
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : '#334155'}
                metalness={isSketch ? 0 : 0.5}
                roughness={isSketch ? 0.9 : 0.45}
              />
              {sketchSubEdges}
            </mesh>
            <mesh
              position={[sx * 0.8, -plateH / 2, sz * 0.8]}
              rotation={[-sz * 0.11, 0, sx * 0.11]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <cylinderGeometry args={[legRadiusTop, legRadiusBot, legH, 16]} />
              <meshStandardMaterial key={materialKey} {...woodMatProps} />
              {sketchSubEdges}
            </mesh>
          </group>
        ))}
        {selectionOutline}
      </group>
    )
  }

  // 3. طقم 4 رجول معدن مستقيمة
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
            <mesh
              position={[0, height / 2 - plateH / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[postSize + 2, plateH, postSize + 2]} />
              <meshStandardMaterial {...metalMatProps} />
              {sketchSubEdges}
            </mesh>
            <mesh
              position={[0, (glideH - plateH) / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[postSize, postH, postSize]} />
              <meshStandardMaterial key={isSketch ? 'sketch-metal' : metalHex} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            <mesh
              position={[0, -height / 2 + glideH / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <cylinderGeometry args={[postSize * 0.55, postSize * 0.6, glideH, 12]} />
              <meshStandardMaterial
                color={isSketch ? '#f8fafc' : '#0f172a'}
                roughness={isSketch ? 0.9 : 0.8}
              />
              {sketchSubEdges}
            </mesh>
          </group>
        ))}
        {selectionOutline}
      </group>
    )
  }

  // 4. شاسيه معدن مستطيل (علب حديد ثابتة السُمك 2.5 × 2.5 سم)
  if (panel.role === 'metal_frame') {
    const tube = Math.min(2.5, width / 6, height / 2.5, depth / 6)
    const legH = Math.max(1, height - tube)
    const topY = height / 2 - tube / 2
    const legY = -tube / 2
    const rx = Math.max(0, width / 2 - tube / 2)
    const rz = Math.max(0, depth / 2 - tube / 2)
    const innerSideLen = Math.max(0.5, depth - tube * 2)
    const frameKey = isSketch ? 'sketch-frame' : `metal-frame-${metalHex}`

    return (
      <group>
        {/* عارضة أمامية وخلفية علوية */}
        <mesh position={[0, topY, rz]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[width, tube, tube]} />
          <meshStandardMaterial key={frameKey} {...metalMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        <mesh position={[0, topY, -rz]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[width, tube, tube]} />
          <meshStandardMaterial key={frameKey} {...metalMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        {/* عارضة يمين ويسار علوية */}
        <mesh position={[-rx, topY, 0]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[tube, tube, innerSideLen]} />
          <meshStandardMaterial key={frameKey} {...metalMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        <mesh position={[rx, topY, 0]} castShadow receiveShadow onClick={onClick}>
          <boxGeometry args={[tube, tube, innerSideLen]} />
          <meshStandardMaterial key={frameKey} {...metalMatProps} />
          <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
        </mesh>
        {/* 4 أرجل مربعة تحت الإطار */}
        {[
          [-rx, -rz],
          [rx, -rz],
          [-rx, rz],
          [rx, rz],
        ].map(([lx, lz], idx) => (
          <mesh key={idx} position={[lx, legY, lz]} castShadow receiveShadow onClick={onClick}>
            <boxGeometry args={[tube, legH, tube]} />
            <meshStandardMaterial key={frameKey} {...metalMatProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
        ))}
        {selectionOutline}
      </group>
    )
  }

  // 5. رجول معدن حرف U / مربع مغلق (علب حديد ثابتة 2.5 × 4 سم)
  if (panel.role === 'metal_u_legs') {
    const tubeW = Math.min(2.5, width / 6)
    const tubeH = Math.min(3.5, height / 4)
    const tubeD = Math.min(4.0, depth / 4)
    const innerH = Math.max(1, height - tubeH * 2)
    const sideOffsetX = Math.max(0, width / 2 - tubeW / 2 - Math.min(2, width * 0.05))
    const uprightZ = Math.max(0, depth / 2 - tubeD / 2)
    const uKey = isSketch ? 'sketch-u' : `metal-u-${metalHex}`

    return (
      <group>
        {[-sideOffsetX, sideOffsetX].map((sx, idx) => (
          <group key={idx} position={[sx, 0, 0]}>
            {/* الضلع العلوي */}
            <mesh position={[0, height / 2 - tubeH / 2, 0]} castShadow receiveShadow onClick={onClick}>
              <boxGeometry args={[tubeW, tubeH, depth]} />
              <meshStandardMaterial key={uKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            {/* الضلع السفلي الملامس للأرض */}
            <mesh position={[0, -height / 2 + tubeH / 2, 0]} castShadow receiveShadow onClick={onClick}>
              <boxGeometry args={[tubeW, tubeH, depth]} />
              <meshStandardMaterial key={uKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            {/* قائمتان رأسيتان */}
            <mesh position={[0, 0, -uprightZ]} castShadow receiveShadow onClick={onClick}>
              <boxGeometry args={[tubeW, innerH, tubeD]} />
              <meshStandardMaterial key={uKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            <mesh position={[0, 0, uprightZ]} castShadow receiveShadow onClick={onClick}>
              <boxGeometry args={[tubeW, innerH, tubeD]} />
              <meshStandardMaterial key={uKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
          </group>
        ))}
        {selectionOutline}
      </group>
    )
  }

  // 6. قاعدة معدن حرف X مع عارضة ربط سفلية
  if (panel.role === 'metal_x_legs') {
    const tubeX = Math.min(2.5, width / 6)
    const barThick = Math.min(4.0, depth / 5, height / 4)
    const plateThick = Math.min(1.2, height / 8)
    const sideOffsetX = Math.max(0, width / 2 - tubeX / 2 - Math.min(2, width * 0.05))
    const effH = Math.max(4, height - plateThick * 2)
    const effD = Math.max(4, depth - barThick * 0.65)
    const theta = Math.atan2(effH, effD)
    const diagLen = Math.max(3, Math.hypot(effH, effD) - barThick * 0.35)
    const stretcherSpan = Math.max(2, sideOffsetX * 2 - tubeX)
    const xKey = isSketch ? 'sketch-x' : `metal-x-${metalHex}`

    return (
      <group>
        {[-sideOffsetX, sideOffsetX].map((sx, idx) => (
          <group key={idx} position={[sx, 0, 0]}>
            {/* قاعدة تثبيت علوية */}
            <mesh
              position={[0, height / 2 - plateThick / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[tubeX + 1.4, plateThick, depth]} />
              <meshStandardMaterial key={xKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            {/* عارضة سفلية ملامسة للأرض */}
            <mesh
              position={[0, -height / 2 + plateThick / 2, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[tubeX + 0.8, plateThick, depth]} />
              <meshStandardMaterial key={xKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            {/* الذراع المائلة الأولى */}
            <mesh
              position={[0, 0, 0]}
              rotation={[theta, 0, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[tubeX, barThick, diagLen]} />
              <meshStandardMaterial key={xKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
            {/* الذراع المائلة الثانية المتقاطعة */}
            <mesh
              position={[0.04, 0, 0]}
              rotation={[-theta, 0, 0]}
              castShadow
              receiveShadow
              onClick={onClick}
            >
              <boxGeometry args={[tubeX, barThick, diagLen]} />
              <meshStandardMaterial key={xKey} {...metalMatProps} />
              <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
            </mesh>
          </group>
        ))}
        {/* عارضة ربط سفلية بين الرجلين */}
        {stretcherSpan > 4 && (
          <mesh
            position={[0, -height / 2 + Math.min(9, height * 0.2), 0]}
            castShadow
            receiveShadow
            onClick={onClick}
          >
            <boxGeometry args={[stretcherSpan, 2.5, 2.5]} />
            <meshStandardMaterial key={xKey} {...metalMatProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
        )}
        {selectionOutline}
      </group>
    )
  }

  // 7. قاعدة أعمدة أسطوانية خشب مودرن (2 أو 3 أعمدة حسب العرض)
  if (panel.role === 'wood_pillars') {
    const pillarCount = width >= 150 ? 3 : 2
    const radius = Math.min(depth * 0.42, width / (pillarCount * 2.4), 16)
    const capH = Math.min(1.2, height * 0.08)
    const shaftH = Math.max(2, height - capH * 2)
    const spanX = Math.max(0, width / 2 - radius - Math.min(4, width * 0.05))
    const xPositions =
      pillarCount === 3 ? [-spanX, 0, spanX] : [-spanX, spanX]

    return (
      <group>
        {xPositions.map((px, idx) => (
          <group key={idx} position={[px, 0, 0]}>
            {/* تاج علوي */}
            <mesh position={[0, height / 2 - capH / 2, 0]} castShadow receiveShadow onClick={onClick}>
              <cylinderGeometry args={[radius + 0.8, radius + 0.8, capH, 28]} />
              <meshStandardMaterial key={materialKey} {...woodMatProps} />
              {sketchSubEdges}
            </mesh>
            {/* العمود الرئيسي */}
            <mesh position={[0, 0, 0]} castShadow receiveShadow onClick={onClick}>
              <cylinderGeometry args={[radius, radius, shaftH, 28]} />
              <meshStandardMaterial key={materialKey} {...woodMatProps} />
              {sketchSubEdges}
            </mesh>
            {/* قاعدة سفلية */}
            <mesh position={[0, -height / 2 + capH / 2, 0]} castShadow receiveShadow onClick={onClick}>
              <cylinderGeometry args={[radius + 0.8, radius + 0.8, capH, 28]} />
              <meshStandardMaterial key={materialKey} {...woodMatProps} />
              {sketchSubEdges}
            </mesh>
          </group>
        ))}
        {selectionOutline}
      </group>
    )
  }

  // 8. قاعدة خشب مقوّسة (أرش بسُمك 3.6 سم باستخدام ExtrudeGeometry)
  const archX = Math.max(0, width / 2 - 1.8 - Math.min(4, width * 0.06))
  return (
    <group>
      {archGeometry &&
        [-archX, archX].map((ax, idx) => (
          <mesh
            key={idx}
            geometry={archGeometry}
            position={[ax, 0, 0]}
            castShadow
            receiveShadow
            onClick={onClick}
          >
            <meshStandardMaterial key={materialKey} {...woodMatProps} />
            <Edges threshold={15} color={edgeColor} lineWidth={edgeWidth} transparent opacity={edgeOpacity} />
          </mesh>
        ))}
      {selectionOutline}
    </group>
  )
}
