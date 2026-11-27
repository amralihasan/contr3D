import { Environment, Grid, Lightformer } from '@react-three/drei'
import { useDesignStore } from '../../store/useDesignStore'

export function WorkspaceGrid() {
  const exportMode = useDesignStore((s) => s.exportMode)
  const isCleanExport = exportMode === 'clean'
  const isTransparentExport = exportMode === 'transparent'

  return (
    <>
      {/* الخلفية والضباب حسب الوضع العادي أو وضع تصدير الصورة */}
      {!isTransparentExport && (
        <color attach="background" args={[isCleanExport ? '#f1f5f9' : '#0f172a']} />
      )}
      {!exportMode && <fog attach="fog" args={['#0f172a', 380, 760]} />}

      <ambientLight intensity={isCleanExport ? 0.55 : 0.45} />
      <hemisphereLight args={['#f8fafc', '#1e293b', isCleanExport ? 0.65 : 0.55]} />

      <directionalLight
        position={[140, 220, 160]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-near={10}
        shadow-camera-far={650}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
      />

      <directionalLight position={[-140, 110, -120]} intensity={0.4} color="#cbd5e1" />

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

      {/* أرضية استقبال الظلال عند Y = 0 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[1200, 1200]} />
        <shadowMaterial
          transparent
          opacity={isCleanExport ? 0.18 : isTransparentExport ? 0.24 : 0.34}
        />
      </mesh>

      {/* إخفاء الشبكة الأرضية مؤقتاً أثناء تصدير الصورة */}
      {!exportMode && (
        <Grid
          position={[0, 0.01, 0]}
          args={[600, 600]}
          cellSize={10}
          cellThickness={0.75}
          cellColor="#334155"
          sectionSize={50}
          sectionThickness={1.35}
          sectionColor="#64748b"
          fadeDistance={480}
          fadeStrength={1.25}
          infiniteGrid
        />
      )}
    </>
  )
}
