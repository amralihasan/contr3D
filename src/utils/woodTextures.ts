import * as THREE from 'three'
import { MATERIALS } from '../constants/materials'
import type { MaterialId } from '../types/furniture'

const textureCache = new Map<MaterialId, THREE.CanvasTexture>()

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * ينشئ نسيج خشب واقعي عبر HTML5 Canvas مع تخزين مؤقت (Cache) للأداء العالي
 */
export function getWoodTexture(materialId: MaterialId): THREE.CanvasTexture | null {
  const spec = MATERIALS[materialId]
  if (!spec.hasWoodGrain) return null

  const cached = textureCache.get(materialId)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // خلفية الخشب الأساسية
  ctx.fillStyle = spec.color
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const rand = mulberry32(materialId === 'light_oak' ? 104729 : 224737)
  const grainColor = spec.grainColor ?? '#7c5533'

  // ألياف طولية ناعمة
  for (let i = 0; i < 240; i++) {
    const y = rand() * canvas.height
    const thickness = 0.6 + rand() * 2.2
    const alpha = 0.05 + rand() * 0.14
    ctx.strokeStyle = grainColor
    ctx.globalAlpha = alpha
    ctx.lineWidth = thickness
    ctx.beginPath()
    ctx.moveTo(0, y)

    const waveAmp = 2 + rand() * 5
    const waveFreq = 0.008 + rand() * 0.015
    const phase = rand() * Math.PI * 2

    for (let x = 0; x <= canvas.width; x += 16) {
      const offset = Math.sin(x * waveFreq + phase) * waveAmp
      ctx.lineTo(x, y + offset)
    }
    ctx.stroke()
  }

  // مسام خفيفة لإحساس الكونتر/القشرة الطبيعية
  for (let i = 0; i < 650; i++) {
    const x = rand() * canvas.width
    const y = rand() * canvas.height
    const len = 4 + rand() * 18
    ctx.strokeStyle = grainColor
    ctx.globalAlpha = 0.04 + rand() * 0.08
    ctx.lineWidth = 0.7
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (rand() - 0.5) * 1.2)
    ctx.stroke()
  }

  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true

  textureCache.set(materialId, texture)
  return texture
}
