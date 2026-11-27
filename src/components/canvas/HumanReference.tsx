import { Html } from '@react-three/drei'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'
import { HUMAN_SCALE_HEIGHTS_CM } from '../../types/furniture'
import { roundTo } from '../../utils/snapping'

const BASE_ADULT_HEIGHT_CM = 175

/**
 * مجسم بشري مرجعي للمقياس (Human Scale Reference) بأسلوب حديث شبه شفاف
 * يقف بدقة على الأرضية (Y = 0) بدون التداخل مع ألواح الخشب أو حسابات التقطيع والمقاسات
 */
export function HumanReference() {
  const showHumanReference = useDesignStore((s) => s.showHumanReference)
  const renderMode = useDesignStore((s) => s.renderMode)
  const isExporting = useDesignStore((s) => s.isExporting)
  const humanScalePreset = useDesignStore((s) => s.humanScalePreset)
  const humanPosition = useDesignStore((s) => s.humanPosition)
  const toolMode = useDesignStore((s) => s.toolMode)
  const setHumanPosition = useDesignStore((s) => s.setHumanPosition)
  const setIsDraggingHuman = useDesignStore((s) => s.setIsDraggingHuman)

  const { camera, gl } = useThree()
  const draggingRef = useRef(false)
  const dragOffsetRef = useRef(new THREE.Vector2(0, 0))
  const raycasterRef = useRef(new THREE.Raycaster())
  const ndcRef = useRef(new THREE.Vector2())
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), [])

  useEffect(() => {
    const dom = gl.domElement

    const projectToFloor = (clientX: number, clientY: number): THREE.Vector3 | null => {
      const rect = dom.getBoundingClientRect()
      ndcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1
      ndcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycasterRef.current.setFromCamera(ndcRef.current, camera)
      const hit = new THREE.Vector3()
      const ok = raycasterRef.current.ray.intersectPlane(floorPlane, hit)
      return ok ? hit : null
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const hit = projectToFloor(e.clientX, e.clientY)
      if (!hit) return
      const nextX = roundTo(hit.x + dragOffsetRef.current.x, 1)
      const nextZ = roundTo(hit.z + dragOffsetRef.current.y, 1)
      setHumanPosition(nextX, nextZ)
    }

    const onPointerUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      setIsDraggingHuman(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      draggingRef.current = false
      setIsDraggingHuman(false)
    }
  }, [camera, gl, floorPlane, setHumanPosition, setIsDraggingHuman])

  if (!showHumanReference || renderMode === 'sketch' || isExporting) return null

  const targetHeight = HUMAN_SCALE_HEIGHTS_CM[humanScalePreset]
  const scale = targetHeight / BASE_ADULT_HEIGHT_CM

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (toolMode !== 'select') return
    const currentPos = useDesignStore.getState().humanPosition
    dragOffsetRef.current.set(currentPos[0] - e.point.x, currentPos[1] - e.point.z)
    draggingRef.current = true
    setIsDraggingHuman(true)
  }

  const silhouetteMaterial = {
    color: '#94a3b8',
    transparent: true,
    opacity: 0.75,
    roughness: 0.65,
    metalness: 0.05,
  }

  return (
    <group
      name="workspace-human-group"
      position={[humanPosition[0], 0, humanPosition[1]]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* حلقة مرجعية خفيفة على الأرض لتسهيل الإمساك والتحريك باللمس */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
        <ringGeometry args={[20, 22.5, 32]} />
        <meshBasicMaterial color="#94a3b8" transparent opacity={0.35} />
      </mesh>

      {/* الساق اليسرى (أسفل الكبسولة عند Y = 0 تماماً) */}
      <mesh position={[-9.5, 42.2, 0]} castShadow>
        <capsuleGeometry args={[5.2, 74, 8, 16]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الساق اليمنى */}
      <mesh position={[9.5, 42.2, 0]} castShadow>
        <capsuleGeometry args={[5.2, 74, 8, 16]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الحوض */}
      <mesh position={[0, 86, 0]} castShadow>
        <cylinderGeometry args={[12.5, 11.8, 16, 18]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الجذع */}
      <mesh position={[0, 113, 0]} castShadow>
        <cylinderGeometry args={[15.5, 12.2, 42, 20]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الأكتاف */}
      <mesh position={[0, 134, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[5.5, 29, 8, 16]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الذراع الأيسر */}
      <mesh position={[-20.5, 108, 0]} rotation={[0, 0, -0.07]} castShadow>
        <capsuleGeometry args={[3.9, 50, 8, 14]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الذراع الأيمن */}
      <mesh position={[20.5, 108, 0]} rotation={[0, 0, 0.07]} castShadow>
        <capsuleGeometry args={[3.9, 50, 8, 14]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الرقبة */}
      <mesh position={[0, 145, 0]} castShadow>
        <cylinderGeometry args={[4.1, 4.7, 14, 14]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* الرأس (أعلى الرأس عند Y = 175 تماماً قبل التحجيم) */}
      <mesh position={[0, 163.25, 0]} castShadow>
        <capsuleGeometry args={[8.5, 6.5, 10, 18]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* مفاصل كتف خفيفة للتناسق البصري */}
      <mesh position={[-17.5, 134, 0]}>
        <sphereGeometry args={[4.8, 12, 12]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>
      <mesh position={[17.5, 134, 0]}>
        <sphereGeometry args={[4.8, 12, 12]} />
        <meshStandardMaterial {...silhouetteMaterial} />
      </mesh>

      {/* تسمية الطول الخفيفة أعلى الرأس */}
      <Html position={[0, 183, 0]} center distanceFactor={230} zIndexRange={[4, 0]}>
        <div className="tabular-nums pointer-events-none select-none whitespace-nowrap rounded-lg border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[11px] font-semibold text-slate-300 backdrop-blur-sm">
          {humanScalePreset === 'adult' ? 'شخص بالغ: ' : 'طفل: '}
          {targetHeight} سم
        </div>
      </Html>
    </group>
  )
}
