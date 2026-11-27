import { Edges } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { HandleColor, PanelHandleConfig } from '../../types/furniture'

interface PanelHandleProps {
  config: PanelHandleConfig
  faceWidth: number
  faceHeight: number
  frontZ: number
  panelDepth: number
  isSketch: boolean
  onClick: (e: ThreeEvent<MouseEvent>) => void
}

const HANDLE_MATERIAL_SPEC: Record<
  HandleColor,
  { color: string; metalness: number; roughness: number }
> = {
  black: { color: '#1f2937', metalness: 0.7, roughness: 0.35 },
  gold: { color: '#d4af37', metalness: 0.78, roughness: 0.28 },
  silver: { color: '#cbd5e1', metalness: 0.75, roughness: 0.3 },
  wood: { color: '#b48252', metalness: 0.08, roughness: 0.72 },
}

export function PanelHandle({
  config,
  faceWidth,
  faceHeight,
  frontZ,
  panelDepth,
  isSketch,
  onClick,
}: PanelHandleProps) {
  if (config.type === 'none') return null

  const spec = HANDLE_MATERIAL_SPEC[config.color] ?? HANDLE_MATERIAL_SPEC.silver
  const matProps = isSketch
    ? { color: '#f8fafc', metalness: 0, roughness: 0.9 }
    : spec

  const sketchEdges = isSketch ? (
    <Edges threshold={15} color="#1e293b" lineWidth={1.5} />
  ) : null

  const margin = Math.min(3.2, Math.max(1.6, Math.min(faceWidth, faceHeight) * 0.14))
  const isVert = config.orientation === 'vertical'

  let hx = 0
  let hy = 0
  if (config.position === 'left') hx = -faceWidth / 2 + margin
  else if (config.position === 'right') hx = faceWidth / 2 - margin
  else if (config.position === 'top') hy = faceHeight / 2 - margin
  else if (config.position === 'bottom') hy = -faceHeight / 2 + margin

  // 1. مقبض بار مودرن (Bar): شريط بارز بقاعدتين تثبيت
  if (config.type === 'bar') {
    const maxLen = Math.max(4, (isVert ? faceHeight : faceWidth) - 2.4)
    const barLen = Math.min(Math.max(4, config.length ?? 16), maxLen)
    const postOffset = Math.max(1.5, barLen / 2 - 1.5)

    return (
      <group
        position={[hx, hy, frontZ]}
        rotation={[0, 0, isVert ? Math.PI / 2 : 0]}
      >
        {/* جسم البار الرئيسي */}
        <mesh position={[0, 0, 2.05]} castShadow onClick={onClick}>
          <boxGeometry args={[barLen, 0.85, 0.75]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>

        {/* قاعدتا التثبيت */}
        <mesh
          position={[-postOffset, 0, 0.85]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onClick={onClick}
        >
          <cylinderGeometry args={[0.35, 0.42, 1.7, 14]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
        <mesh
          position={[postOffset, 0, 0.85]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onClick={onClick}
        >
          <cylinderGeometry args={[0.35, 0.42, 1.7, 14]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
      </group>
    )
  }

  // 2. مقبض زرار دائري (Knob)
  if (config.type === 'knob') {
    return (
      <group position={[hx, hy, frontZ]}>
        {/* قاعدة دائرية رفيعة */}
        <mesh
          position={[0, 0, 0.5]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onClick={onClick}
        >
          <cylinderGeometry args={[0.45, 0.55, 1.0, 18]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
        {/* رأس الزرار */}
        <mesh
          position={[0, 0, 1.35]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          onClick={onClick}
        >
          <cylinderGeometry args={[1.15, 0.9, 0.8, 22]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
      </group>
    )
  }

  // 3. مقبض بروفايل حافة (Edge L-Profile) يلتف على الحافة
  if (config.type === 'edge') {
    const edgeSide =
      config.position === 'center' ? 'top' : config.position
    const isHorizontalEdge = edgeSide === 'top' || edgeSide === 'bottom'
    const maxEdgeLen = Math.max(6, (isHorizontalEdge ? faceWidth : faceHeight) - 1.5)
    const profLen = Math.min(Math.max(6, config.length ?? 16), maxEdgeLen)
    const flangeDepth = Math.min(panelDepth, 1.8) + 0.2

    const ex =
      edgeSide === 'left'
        ? -faceWidth / 2
        : edgeSide === 'right'
          ? faceWidth / 2
          : 0
    const ey =
      edgeSide === 'top'
        ? faceHeight / 2
        : edgeSide === 'bottom'
          ? -faceHeight / 2
          : 0

    const edgeSign =
      edgeSide === 'top' || edgeSide === 'right' ? 1 : -1

    return (
      <group
        position={[ex, ey, frontZ]}
        rotation={[0, 0, isHorizontalEdge ? (edgeSign > 0 ? 0 : Math.PI) : edgeSign > 0 ? -Math.PI / 2 : Math.PI / 2]}
      >
        {/* الشفة العلوية الملتفة حول حافة الخشب */}
        <mesh
          position={[0, 0.14, -flangeDepth / 2 + 0.12]}
          castShadow
          onClick={onClick}
        >
          <boxGeometry args={[profLen, 0.28, flangeDepth]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
        {/* الشفة الأمامية البارزة للسحب */}
        <mesh
          position={[0, 0.25, 0.85]}
          castShadow
          onClick={onClick}
        >
          <boxGeometry args={[profLen, 0.45, 1.5]} />
          <meshStandardMaterial {...matProps} />
          {sketchEdges}
        </mesh>
      </group>
    )
  }

  // 4. مقبض غاطس (Recessed) مع إزاحة 0.05 سم لمنع الـ Z-Fighting
  const frameMaxLen = Math.max(5, (isVert ? faceHeight : faceWidth) - 2)
  const frameLen = Math.min(Math.max(6, config.length ?? 14), frameMaxLen)

  return (
    <group
      position={[hx, hy, frontZ + 0.05]}
      rotation={[0, 0, isVert ? Math.PI / 2 : 0]}
    >
      {/* الإطار الخارجي */}
      <mesh position={[0, 0, 0.14]} castShadow onClick={onClick}>
        <boxGeometry args={[frameLen, 3.2, 0.28]} />
        <meshStandardMaterial {...matProps} />
        {sketchEdges}
      </mesh>
      {/* التجويف الداخلي الداكن */}
      <mesh position={[0, 0, 0.24]} onClick={onClick}>
        <boxGeometry args={[Math.max(3, frameLen - 1.2), 2.0, 0.14]} />
        <meshStandardMaterial
          color={isSketch ? '#e2e8f0' : '#0f172a'}
          roughness={0.85}
          metalness={isSketch ? 0 : 0.1}
        />
        {sketchEdges}
      </mesh>
    </group>
  )
}
