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

let cachedMirrorTexture: THREE.CanvasTexture | null = null

/**
 * ينشئ تدرج لمعان مائل خفيف لطبقة المرايا حتى تبدو واقعية وواضحة على الخلفية الداكنة والبيضاء
 */
export function getMirrorTexture(): THREE.CanvasTexture | null {
  if (cachedMirrorTexture) return cachedMirrorTexture
  if (typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grad = ctx.createLinearGradient(0, 0, 512, 512)
  grad.addColorStop(0, '#cbd5e1')
  grad.addColorStop(0.28, '#e2e8f0')
  grad.addColorStop(0.48, '#f8fafc')
  grad.addColorStop(0.56, '#dbeafe')
  grad.addColorStop(0.75, '#e2e8f0')
  grad.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  // خطا انعكاس مائلان ناعمان لإيحاء الزجاج العاكس
  ctx.save()
  ctx.translate(256, 256)
  ctx.rotate(-Math.PI / 5)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.fillRect(-380, -36, 760, 42)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  ctx.fillRect(-380, 22, 760, 16)
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  cachedMirrorTexture = texture
  return texture
}
