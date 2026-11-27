import { Environment, Lightformer } from '@react-three/drei'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useDesignStore } from '../../store/useDesignStore'

// منع التفاعل مع الماوس/اللمس حتى يمر النقر على الفراغ إلى Canvas onPointerMissed لإلغاء التحديد
const noopRaycast: THREE.Object3D['raycast'] = () => {}

function StaticFloorGrid() {
  const minorGridRef = useRef<THREE.GridHelper | null>(null)
  const majorGridRef = useRef<THREE.GridHelper | null>(null)

  useEffect(() => {
    const configureGridMaterial = (grid: THREE.GridHelper | null, opacity: number) => {
      if (!grid) return
      const materials = Array.isArray(grid.material) ? grid.material : [grid.material]
      for (const mat of materials) {
        mat.depthWrite = false
        mat.transparent = true
        mat.opacity = opacity
        mat.needsUpdate = true
      }
    }

    configureGridMaterial(minorGridRef.current, 0.42)
    configureGridMaterial(majorGridRef.current, 0.72)
  }, [])

  return (
    <group>
      {/* شبكة القياس الدقيقة: كل 10 سم مربع */}
      <gridHelper
        ref={minorGridRef}
        position={[0, 0.01, 0]}
        args={[1000, 100, '#334155', '#293548']}
        raycast={noopRaycast}
        renderOrder={1}
      />
      {/* خطوط القياس الرئيسية: كل 50 سم */}
      <gridHelper
        ref={majorGridRef}
        position={[0, 0.015, 0]}
        args={[1000, 20, '#64748b', '#475569']}
        raycast={noopRaycast}
        renderOrder={2}
      />
    </group>
  )
}

export function WorkspaceGrid() {
  const exportMode = useDesignStore((s) => s.exportMode)
  const renderMode = useDesignStore((s) => s.renderMode)
  const isSketch = renderMode === 'sketch'
  const isCleanExport = exportMode === 'clean' || exportMode === 'three_angles'
  const isTransparentExport = exportMode === 'transparent'
  const showSolidFloor = !isTransparentExport && !isSketch
  const showGrid = !exportMode && !isSketch

  return (
    <>
      {/* الخلفية والضباب حسب الوضع العادي أو وضع التصدير / الرسم الهندسي */}
      {!isTransparentExport && (
        <color
          attach="background"
          args={[isSketch ? '#ffffff' : isCleanExport ? '#f1f5f9' : '#0f172a']}
        />
      )}
      {!exportMode && !isSketch && <fog attach="fog" args={['#0f172a', 420, 880]} />}

      <ambientLight intensity={isSketch ? 0.72 : isCleanExport ? 0.55 : 0.45} />
      <hemisphereLight
        args={[
          '#f8fafc',
          isSketch ? '#cbd5e1' : '#1e293b',
          isSketch ? 0.5 : isCleanExport ? 0.65 : 0.55,
        ]}
      />

      <directionalLight
        position={[140, 220, 160]}
        intensity={isSketch ? 0.75 : 1.35}
        castShadow={!isSketch}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={10}
        shadow-camera-far={650}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
      />

      <directionalLight
        position={[-140, 110, -120]}
        intensity={isSketch ? 0.35 : 0.4}
        color="#cbd5e1"
      />

      {/* بيئة إضاءة محلية بدون تحميل ملفات خارجية */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer
            form="rect"
            intensity={1.8}
            color="#ffffff"
            position={[0, 5, -9]}
            scale={[14, 14, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#fef3c7"
            position={[-6, 3, 4]}
            scale={[10, 6, 1]}
          />
          <Lightformer
            form="rect"
            intensity={0.7}
            color="#e2e8f0"
            position={[8, 4, 2]}
            scale={[10, 6, 1]}
          />
        </group>
      </Environment>

      {/* أرضية مصمتة وواسعة غير لامعة تستقبل الظلال بثبات بدون وميض */}
      {showSolidFloor && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.04, 0]}
          receiveShadow
          raycast={noopRaycast}
        >
          <planeGeometry args={[2400, 2400]} />
          <meshStandardMaterial
            color={isCleanExport ? '#f1f5f9' : '#131b2e'}
            roughness={0.95}
            metalness={0}
          />
        </mesh>
      )}

      {/* ظل خفيف فقط عند التصدير الشفاف بدون خلفية مصمتة */}
      {isTransparentExport && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          receiveShadow
          raycast={noopRaycast}
        >
          <planeGeometry args={[1200, 1200]} />
          <shadowMaterial transparent opacity={0.24} />
        </mesh>
      )}

      {/* شبكة قياس ثابتة فوق الأرضية بدون تلاشي مفاجئ أو Z-Fighting */}
      {showGrid && <StaticFloorGrid />}
    </>
  )
}
