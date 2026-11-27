import { Environment, Grid, Lightformer } from '@react-three/drei'
import { useDesignStore } from '../../store/useDesignStore'

export function WorkspaceGrid() {
  const exportMode = useDesignStore((s) => s.exportMode)
  const renderMode = useDesignStore((s) => s.renderMode)
  const isSketch = renderMode === 'sketch'
  const isCleanExport = exportMode === 'clean' || exportMode === 'three_angles'
  const isTransparentExport = exportMode === 'transparent'

  return (
    <>
      {/* الخلفية والضباب حسب الوضع العادي أو وضع التصدير / الرسم الهندسي */}
      {!isTransparentExport && (
        <color
          attach="background"
          args={[isSketch ? '#ffffff' : isCleanExport ? '#f1f5f9' : '#0f172a']}
        />
      )}
      {!exportMode && !isSketch && <fog attach="fog" args={['#0f172a', 380, 760]} />}

      <ambientLight intensity={isSketch ? 0.72 : isCleanExport ? 0.55 : 0.45} />
      <hemisphereLight
        args={['#f8fafc', isSketch ? '#cbd5e1' : '#1e293b', isSketch ? 0.5 : isCleanExport ? 0.65 : 0.55]}
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

      <directionalLight position={[-140, 110, -120]} intensity={isSketch ? 0.35 : 0.4} color="#cbd5e1" />

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

      {/* أرضية استقبال الظلال (مخفية في وضع الرسم الهندسي لورقة بيضاء نقية) */}
      {!isSketch && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[1200, 1200]} />
          <shadowMaterial
            transparent
            opacity={isCleanExport ? 0.18 : isTransparentExport ? 0.24 : 0.34}
          />
        </mesh>
      )}

      {/* إخفاء الشبكة الأرضية مؤقتاً أثناء تصدير الصورة أو الرسم الهندسي */}
      {!exportMode && !isSketch && (
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
