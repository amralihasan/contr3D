import { MATERIALS } from '../constants/materials'
import {
  getDefaultEdgeBanding,
  type Axis,
  type CornerRadius,
  type EdgeBanding,
  type FurniturePanel,
  type GuideLine,
  type MaterialId,
  type PanelCategory,
  type PanelCutout,
  type PanelRole,
  type SavedDesign,
  type Vec3,
} from '../types/furniture'

const DESIGNS_STORAGE_KEY = 'counter_furniture_3d_designs_v1'
const AUTOSAVE_STORAGE_KEY = 'counter_furniture_3d_autosave_v1'
const UI_PREFS_STORAGE_KEY = 'counter_furniture_3d_ui_prefs_v1'

export interface UiPreferences {
  partsSidebarOpen: boolean
  propsSidebarOpen: boolean
}

export function deepClone<T>(value: T): T {
  try {
    if (typeof globalThis.structuredClone === 'function') {
      return globalThis.structuredClone(value)
    }
  } catch {
    // fallback to JSON clone
  }
  return JSON.parse(JSON.stringify(value)) as T
}

function safeGetLocalItem(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetLocalItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(key, value)
  } catch {
    // تجاهل أخطاء امتلاء التخزين المحلي أو التصفح المقيد
  }
}

function isVec3(val: unknown): val is Vec3 {
  return (
    Array.isArray(val) &&
    val.length === 3 &&
    typeof val[0] === 'number' &&
    Number.isFinite(val[0]) &&
    typeof val[1] === 'number' &&
    Number.isFinite(val[1]) &&
    typeof val[2] === 'number' &&
    Number.isFinite(val[2])
  )
}

function sanitizeCornerRadius(raw: unknown): CornerRadius | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  return {
    tl: num(obj.tl),
    tr: num(obj.tr),
    bl: num(obj.bl),
    br: num(obj.br),
  }
}

function sanitizeCutouts(raw: unknown): PanelCutout[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const valid: PanelCutout[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    if (typeof obj.id !== 'string') continue
    const shape = obj.shape === 'rect' ? 'rect' : 'circle'
    const x = typeof obj.x === 'number' && Number.isFinite(obj.x) ? obj.x : 0
    const y = typeof obj.y === 'number' && Number.isFinite(obj.y) ? obj.y : 0
    const width =
      typeof obj.width === 'number' && Number.isFinite(obj.width) && obj.width > 0 ? obj.width : 5
    const height =
      typeof obj.height === 'number' && Number.isFinite(obj.height) && obj.height > 0
        ? obj.height
        : 5
    const diameter =
      typeof obj.diameter === 'number' && Number.isFinite(obj.diameter) && obj.diameter > 0
        ? obj.diameter
        : undefined
    valid.push({ id: obj.id, shape, x, y, width, height, diameter })
  }
  return valid
}

function sanitizeEdgeBanding(raw: unknown, role: PanelRole): EdgeBanding {
  const fallback = getDefaultEdgeBanding(role)
  if (!raw || typeof raw !== 'object') return fallback
  const obj = raw as Record<string, unknown>
  return {
    top: typeof obj.top === 'boolean' ? obj.top : fallback.top,
    bottom: typeof obj.bottom === 'boolean' ? obj.bottom : fallback.bottom,
    right: typeof obj.right === 'boolean' ? obj.right : fallback.right,
    left: typeof obj.left === 'boolean' ? obj.left : fallback.left,
  }
}

export function sanitizePanel(raw: unknown): FurniturePanel | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (typeof obj.id !== 'string' || !obj.id) return null

  const dimsRaw = obj.dimensions as Record<string, unknown> | undefined
  if (!dimsRaw || typeof dimsRaw !== 'object') return null
  const width = dimsRaw.width
  const height = dimsRaw.height
  const depth = dimsRaw.depth
  if (
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    typeof depth !== 'number' ||
    !Number.isFinite(depth)
  ) {
    return null
  }

  const role: PanelRole = typeof obj.role === 'string' ? (obj.role as PanelRole) : 'custom'
  const category: PanelCategory =
    obj.category === 'front' || obj.category === 'base' ? obj.category : 'panel'
  const thicknessAxis: Axis =
    obj.thicknessAxis === 'x' || obj.thicknessAxis === 'z' ? obj.thicknessAxis : 'y'
  const rawMat = typeof obj.materialId === 'string' ? (obj.materialId as MaterialId) : 'light_oak'
  const materialId: MaterialId = rawMat in MATERIALS ? rawMat : 'light_oak'

  const panel: FurniturePanel = {
    id: obj.id,
    name: typeof obj.name === 'string' && obj.name ? obj.name : 'لوح خشب',
    role,
    category,
    dimensions: {
      width: Math.max(0.4, width),
      height: Math.max(0.4, height),
      depth: Math.max(0.4, depth),
    },
    position: isVec3(obj.position) ? obj.position : [0, height / 2, 0],
    rotation: isVec3(obj.rotation) ? obj.rotation : [0, 0, 0],
    thicknessAxis,
    materialId,
    edgeBanding: sanitizeEdgeBanding(obj.edgeBanding, role),
  }

  if (typeof obj.clearanceCm === 'number' && Number.isFinite(obj.clearanceCm)) {
    panel.clearanceCm = obj.clearanceCm
  }
  if (typeof obj.hasHandle === 'boolean') {
    panel.hasHandle = obj.hasHandle
  }
  if (obj.hingeSide === 'left' || obj.hingeSide === 'right') {
    panel.hingeSide = obj.hingeSide
  }
  const cornerRadius = sanitizeCornerRadius(obj.cornerRadius)
  if (cornerRadius) panel.cornerRadius = cornerRadius
  const cutouts = sanitizeCutouts(obj.cutouts)
  if (cutouts) panel.cutouts = cutouts

  return panel
}

export function sanitizePanels(raw: unknown): FurniturePanel[] {
  if (!Array.isArray(raw)) return []
  const result: FurniturePanel[] = []
  for (const item of raw) {
    const clean = sanitizePanel(item)
    if (clean) result.push(clean)
  }
  return result
}

function isAxis(val: unknown): val is Axis {
  return val === 'x' || val === 'y' || val === 'z'
}

export function sanitizeGuides(raw: unknown): GuideLine[] {
  if (!Array.isArray(raw)) return []
  const result: GuideLine[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    if (
      typeof obj.id !== 'string' ||
      !isVec3(obj.spanStart) ||
      !isVec3(obj.spanEnd) ||
      !isVec3(obj.labelPosition)
    ) {
      continue
    }
    const numOr = (val: unknown, fallback: number) =>
      typeof val === 'number' && Number.isFinite(val) ? val : fallback

    result.push({
      id: obj.id,
      panelId: typeof obj.panelId === 'string' ? obj.panelId : '',
      panelName: typeof obj.panelName === 'string' ? obj.panelName : '',
      edgeLabel: typeof obj.edgeLabel === 'string' ? obj.edgeLabel : '',
      lineAxis: isAxis(obj.lineAxis) ? obj.lineAxis : 'x',
      offsetAxis: isAxis(obj.offsetAxis) ? obj.offsetAxis : 'y',
      normalAxis: isAxis(obj.normalAxis) ? obj.normalAxis : 'z',
      surfaceCoord: numOr(obj.surfaceCoord, 0),
      surfaceSign: obj.surfaceSign === -1 ? -1 : 1,
      referenceEdgeCoord: numOr(obj.referenceEdgeCoord, 0),
      direction: obj.direction === -1 ? -1 : 1,
      distanceCm: numOr(obj.distanceCm, 0),
      worldCoord: numOr(obj.worldCoord, 0),
      spanMin: numOr(obj.spanMin, 0),
      spanMax: numOr(obj.spanMax, 0),
      spanStart: obj.spanStart,
      spanEnd: obj.spanEnd,
      labelPosition: obj.labelPosition,
    })
  }
  return result
}

export function loadUiPreferences(): UiPreferences {
  try {
    const raw = safeGetLocalItem(UI_PREFS_STORAGE_KEY)
    if (!raw) return { partsSidebarOpen: true, propsSidebarOpen: false }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { partsSidebarOpen: true, propsSidebarOpen: false }
    }
    const obj = parsed as Record<string, unknown>
    return {
      partsSidebarOpen:
        typeof obj.partsSidebarOpen === 'boolean' ? obj.partsSidebarOpen : true,
      propsSidebarOpen:
        typeof obj.propsSidebarOpen === 'boolean' ? obj.propsSidebarOpen : false,
    }
  } catch {
    return { partsSidebarOpen: true, propsSidebarOpen: false }
  }
}

export function saveUiPreferences(prefs: UiPreferences): void {
  safeSetLocalItem(UI_PREFS_STORAGE_KEY, JSON.stringify(prefs))
}

export function loadSavedDesigns(): SavedDesign[] {
  try {
    const raw = safeGetLocalItem(DESIGNS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const valid: SavedDesign[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>
      if (typeof obj.id !== 'string' || typeof obj.name !== 'string') continue
      valid.push({
        id: obj.id,
        name: obj.name,
        updatedAt:
          typeof obj.updatedAt === 'number' && Number.isFinite(obj.updatedAt)
            ? obj.updatedAt
            : 0,
        panels: sanitizePanels(obj.panels),
        guides: sanitizeGuides(obj.guides),
      })
    }
    return valid.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function persistSavedDesigns(designs: SavedDesign[]): void {
  safeSetLocalItem(DESIGNS_STORAGE_KEY, JSON.stringify(designs))
}

export function saveDesignByName(
  name: string,
  panels: FurniturePanel[],
  guides: GuideLine[],
  existingId?: string | null
): { design: SavedDesign; allDesigns: SavedDesign[] } {
  const trimmed = name.trim() || 'تصميم بدون اسم'
  const existingList = loadSavedDesigns()
  const now = Date.now()

  const matchById = existingId
    ? existingList.find((d) => d.id === existingId)
    : existingList.find((d) => d.name === trimmed)

  let updatedDesign: SavedDesign
  let nextList: SavedDesign[]

  if (matchById) {
    updatedDesign = {
      ...matchById,
      name: trimmed,
      updatedAt: now,
      panels: deepClone(panels),
      guides: deepClone(guides),
    }
    nextList = existingList.map((d) => (d.id === matchById.id ? updatedDesign : d))
  } else {
    updatedDesign = {
      id: `design_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      updatedAt: now,
      panels: deepClone(panels),
      guides: deepClone(guides),
    }
    nextList = [updatedDesign, ...existingList]
  }

  nextList.sort((a, b) => b.updatedAt - a.updatedAt)
  persistSavedDesigns(nextList)
  return { design: updatedDesign, allDesigns: nextList }
}

export function deleteSavedDesign(id: string): SavedDesign[] {
  const next = loadSavedDesigns().filter((d) => d.id !== id)
  persistSavedDesigns(next)
  return next
}

export function saveAutosave(
  panels: FurniturePanel[],
  guides: GuideLine[],
  designName: string,
  designId: string | null
): void {
  safeSetLocalItem(
    AUTOSAVE_STORAGE_KEY,
    JSON.stringify({ panels, guides, designName, designId, updatedAt: Date.now() })
  )
}

export function loadAutosave(): {
  panels: FurniturePanel[]
  guides: GuideLine[]
  designName: string
  designId: string | null
} | null {
  try {
    const raw = safeGetLocalItem(AUTOSAVE_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Record<string, unknown>
    if (!Array.isArray(obj.panels)) return null
    return {
      panels: sanitizePanels(obj.panels),
      guides: sanitizeGuides(obj.guides),
      designName: typeof obj.designName === 'string' ? obj.designName : 'تصميم جديد',
      designId: typeof obj.designId === 'string' ? obj.designId : null,
    }
  } catch {
    return null
  }
}
