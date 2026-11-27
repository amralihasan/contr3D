import * as THREE from 'three'
import type {
  Axis,
  CornerRadius,
  FurniturePanel,
  PanelCutout,
  PanelDimensions,
} from '../types/furniture'
import { roundTo } from './snapping'

export function getPanelFaceSize(
  dimensions: PanelDimensions,
  thicknessAxis: Axis
): { faceW: number; faceH: number; thickness: number } {
  if (thicknessAxis === 'y') {
    return {
      faceW: dimensions.width,
      faceH: dimensions.depth,
      thickness: dimensions.height,
    }
  }
  if (thicknessAxis === 'x') {
    return {
      faceW: dimensions.depth,
      faceH: dimensions.height,
      thickness: dimensions.width,
    }
  }
  return {
    faceW: dimensions.width,
    faceH: dimensions.height,
    thickness: dimensions.depth,
  }
}

export function getMaxCornerRadius(
  dimensions: PanelDimensions,
  thicknessAxis: Axis
): number {
  const { faceW, faceH } = getPanelFaceSize(dimensions, thicknessAxis)
  return roundTo(Math.max(0, Math.min(faceW, faceH) / 2 - 0.1), 2)
}

export function clampCornerRadius(
  radius: CornerRadius | undefined,
  dimensions: PanelDimensions,
  thicknessAxis: Axis
): CornerRadius {
  const maxR = getMaxCornerRadius(dimensions, thicknessAxis)
  const clampOne = (v: number | undefined) =>
    roundTo(Math.min(maxR, Math.max(0, Number.isFinite(v) ? (v as number) : 0)), 2)

  return {
    tl: clampOne(radius?.tl),
    tr: clampOne(radius?.tr),
    bl: clampOne(radius?.bl),
    br: clampOne(radius?.br),
  }
}

export function hasCustomPanelGeometry(panel: Pick<FurniturePanel, 'cornerRadius' | 'cutouts'>): boolean {
  const cr = panel.cornerRadius
  const hasRadius = Boolean(cr && (cr.tl > 0.01 || cr.tr > 0.01 || cr.bl > 0.01 || cr.br > 0.01))
  const hasCutouts = Boolean(panel.cutouts && panel.cutouts.length > 0)
  return hasRadius || hasCutouts
}

function clampVal(v: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2
  return Math.min(max, Math.max(min, v))
}

/**
 * يبني هندسة ثلاثية الأبعاد (ExtrudeGeometry) للوح بدوران زوايا مخصص وفتحات أسلاك
 * مع توسيط المركز عند (0,0,0) وتطبيع إحداثيات الـ UV لتناسق تعريق الخشب
 */
export function buildExtrudedPanelGeometry(
  dimensions: PanelDimensions,
  thicknessAxis: Axis,
  cornerRadius?: CornerRadius,
  cutouts?: PanelCutout[]
): THREE.ExtrudeGeometry {
  const { faceW, faceH, thickness } = getPanelFaceSize(dimensions, thicknessAxis)
  const hw = Math.max(0.5, faceW / 2)
  const hh = Math.max(0.5, faceH / 2)
  const cr = clampCornerRadius(cornerRadius, dimensions, thicknessAxis)

  const shape = new THREE.Shape()
  shape.moveTo(-hw + cr.bl, -hh)
  shape.lineTo(hw - cr.br, -hh)
  if (cr.br > 0) {
    shape.absarc(hw - cr.br, -hh + cr.br, cr.br, -Math.PI / 2, 0, false)
  }
  shape.lineTo(hw, hh - cr.tr)
  if (cr.tr > 0) {
    shape.absarc(hw - cr.tr, hh - cr.tr, cr.tr, 0, Math.PI / 2, false)
  }
  shape.lineTo(-hw + cr.tl, hh)
  if (cr.tl > 0) {
    shape.absarc(-hw + cr.tl, hh - cr.tl, cr.tl, Math.PI / 2, Math.PI, false)
  }
  shape.lineTo(-hw, -hh + cr.bl)
  if (cr.bl > 0) {
    shape.absarc(-hw + cr.bl, -hh + cr.bl, cr.bl, Math.PI, Math.PI * 1.5, false)
  }
  shape.closePath()

  if (cutouts && cutouts.length > 0) {
    for (const c of cutouts) {
      const hole = new THREE.Path()
      if (c.shape === 'circle') {
        const rawD = c.diameter ?? Math.max(2, c.width)
        const r = Math.max(0.5, Math.min(rawD / 2, hw - 0.3, hh - 0.3))
        const cx = clampVal(c.x, -hw + r + 0.2, hw - r - 0.2)
        const cy = clampVal(c.y, -hh + r + 0.2, hh - r - 0.2)
        hole.absarc(cx, cy, r, 0, Math.PI * 2, true)
      } else {
        const w = Math.max(1, Math.min(c.width, faceW - 0.6))
        const h = Math.max(1, Math.min(c.height, faceH - 0.6))
        const cx = clampVal(c.x, -hw + w / 2 + 0.2, hw - w / 2 - 0.2)
        const cy = clampVal(c.y, -hh + h / 2 + 0.2, hh - h / 2 - 0.2)
        hole.moveTo(cx - w / 2, cy - h / 2)
        hole.lineTo(cx - w / 2, cy + h / 2)
        hole.lineTo(cx + w / 2, cy + h / 2)
        hole.lineTo(cx + w / 2, cy - h / 2)
        hole.closePath()
      }
      shape.holes.push(hole)
    }
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.2, thickness),
    bevelEnabled: false,
    curveSegments: 24,
  })

  // تطبيع إحداثيات الـ UV من السنتيمتر إلى [0..1] لمنع تشوه أو تكرار تعريق الخشب
  const uv = geometry.attributes.uv
  if (uv) {
    const scaleU = Math.max(1, faceW)
    const scaleV = Math.max(1, faceH)
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i) / scaleU + 0.5
      const v = uv.getY(i) / scaleV + 0.5
      uv.setXY(i, u, v)
    }
    uv.needsUpdate = true
  }

  geometry.translate(0, 0, -thickness / 2)

  if (thicknessAxis === 'y') {
    geometry.rotateX(-Math.PI / 2)
  } else if (thicknessAxis === 'x') {
    geometry.rotateY(Math.PI / 2)
  }

  geometry.computeVertexNormals()
  return geometry
}
