import { MATERIALS } from '../constants/materials'
import {
  getDefaultEdgeBanding,
  type Axis,
  type CornerRadius,
  type CustomTemplate,
  type EdgeBanding,
  type FurniturePanel,
  type GuideLine,
  type MaterialId,
  type PanelCategory,
  type PanelCutout,
  type PanelRole,
  type PricingConfig,
  type SavedDesign,
  type Vec3,
} from '../types/furniture'
import { computeOverallDimensions } from './dimensions'
import { roundTo } from './snapping'

const DESIGNS_STORAGE_KEY = 'counter_furniture_3d_designs_v1'
const AUTOSAVE_STORAGE_KEY = 'counter_furniture_3d_autosave_v1'
const UI_PREFS_STORAGE_KEY = 'counter_furniture_3d_ui_prefs_v1'
const CUSTOM_TEMPLATES_STORAGE_KEY = 'contr3d_custom_templates'
const PRICING_CONFIG_STORAGE_KEY = 'contr3d_pricing_config_v1'

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  sheet18Price: 1450,
  sheet6Price: 650,
  edgeBandingPricePerMeter: 18,
  hingePrice: 45,
  drawerSlidePrice: 140,
  handlePrice: 55,
  legsSetPrice: 320,
  laborCost: 800,
  profitMarginPercent: 30,
}

export interface UiPreferences {
  partsSidebarOpen: boolean
  propsSidebarOpen: boolean
  autoSaveEnabled: boolean
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
    if (!raw) {
      return { partsSidebarOpen: true, propsSidebarOpen: false, autoSaveEnabled: true }
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { partsSidebarOpen: true, propsSidebarOpen: false, autoSaveEnabled: true }
    }
    const obj = parsed as Record<string, unknown>
    return {
      partsSidebarOpen:
        typeof obj.partsSidebarOpen === 'boolean' ? obj.partsSidebarOpen : true,
      propsSidebarOpen:
        typeof obj.propsSidebarOpen === 'boolean' ? obj.propsSidebarOpen : false,
      autoSaveEnabled:
        typeof obj.autoSaveEnabled === 'boolean' ? obj.autoSaveEnabled : true,
    }
  } catch {
    return { partsSidebarOpen: true, propsSidebarOpen: false, autoSaveEnabled: true }
  }
}

export function saveUiPreferences(prefs: Partial<UiPreferences>): void {
  const current = loadUiPreferences()
  safeSetLocalItem(UI_PREFS_STORAGE_KEY, JSON.stringify({ ...current, ...prefs }))
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
        thumbnail:
          typeof obj.thumbnail === 'string' && obj.thumbnail.startsWith('data:image/')
            ? obj.thumbnail
            : undefined,
      })
    }
    return valid.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function persistSavedDesigns(designs: SavedDesign[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(DESIGNS_STORAGE_KEY, JSON.stringify(designs))
  } catch {
    // في حال امتلاء المساحة بسبب الصور المصغرة، نُزيل الصور الأقدم أولاً للحفاظ على بيانات المشروع
    try {
      const stripped = designs.map((d, idx) => (idx === 0 ? d : { ...d, thumbnail: undefined }))
      window.localStorage.setItem(DESIGNS_STORAGE_KEY, JSON.stringify(stripped))
    } catch {
      try {
        const noThumbs = designs.map((d) => ({ ...d, thumbnail: undefined }))
        window.localStorage.setItem(DESIGNS_STORAGE_KEY, JSON.stringify(noThumbs))
      } catch {
        // تجاهل إذا كان التخزين محظوراً
      }
    }
  }
}

export function saveDesignByName(
  name: string,
  panels: FurniturePanel[],
  guides: GuideLine[],
  existingId?: string | null,
  thumbnail?: string,
  asNew = false
): { design: SavedDesign; allDesigns: SavedDesign[] } {
  const trimmed = name.trim() || 'تصميم بدون اسم'
  const existingList = loadSavedDesigns()
  const now = Date.now()

  const matchById = asNew
    ? undefined
    : existingId
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
      thumbnail: thumbnail ?? matchById.thumbnail,
    }
    nextList = existingList.map((d) => (d.id === matchById.id ? updatedDesign : d))
  } else {
    updatedDesign = {
      id: `design_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      updatedAt: now,
      panels: deepClone(panels),
      guides: deepClone(guides),
      thumbnail,
    }
    nextList = [updatedDesign, ...existingList]
  }

  nextList.sort((a, b) => b.updatedAt - a.updatedAt)
  persistSavedDesigns(nextList)
  return { design: updatedDesign, allDesigns: nextList }
}

export interface ProjectFilePayload {
  format: 'contr3d-project'
  version: 1
  name: string
  exportedAt: number
  panels: FurniturePanel[]
  guides: GuideLine[]
}

export function exportProjectToJsonFile(
  name: string,
  panels: FurniturePanel[],
  guides: GuideLine[]
): void {
  const cleanName = name.trim() || 'تصميم-كونتر'
  const payload: ProjectFilePayload = {
    format: 'contr3d-project',
    version: 1,
    name: cleanName,
    exportedAt: Date.now(),
    panels: deepClone(panels),
    guides: deepClone(guides),
  }

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const safeFilename =
    cleanName.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '-') || 'contr3d-project'

  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFilename}.json`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 200)
}

export function parseAndValidateProjectJson(rawText: string): {
  name: string
  panels: FurniturePanel[]
  guides: GuideLine[]
} {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('الملف غير صالح: تعذر قراءة تنسيق JSON.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('بنية الملف غير صالحة: يجب أن يحتوي على بيانات مشروع صحيحة.')
  }

  const obj = parsed as Record<string, unknown>
  if ('format' in obj && obj.format !== undefined && obj.format !== 'contr3d-project') {
    throw new Error('هذا الملف ليس ملف مشروع متوافقاً مع مصمم الكونتر 3D.')
  }

  if (!Array.isArray(obj.panels)) {
    throw new Error('الملف غير مكتمل: لا يحتوي على قائمة ألواح التصميم.')
  }

  const cleanPanels = sanitizePanels(obj.panels)
  if (obj.panels.length > 0 && cleanPanels.length === 0) {
    throw new Error('بيانات الألواح داخل الملف غير صالحة أو تالفة.')
  }

  const cleanGuides = sanitizeGuides(obj.guides)
  const cleanName =
    typeof obj.name === 'string' && obj.name.trim().length > 0
      ? obj.name.trim()
      : 'مشروع مستورد'

  return {
    name: cleanName,
    panels: cleanPanels,
    guides: cleanGuides,
  }
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

export function loadCustomTemplates(): CustomTemplate[] {
  try {
    const raw = safeGetLocalItem(CUSTOM_TEMPLATES_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const valid: CustomTemplate[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const obj = item as Record<string, unknown>
      if (typeof obj.id !== 'string' || typeof obj.name !== 'string') continue
      if (!Array.isArray(obj.panels)) continue

      // إضافة معرّفات مؤقتة للتنقية ثم إزالتها للحفاظ على القالب بدون ID ثابت
      const withTempIds = obj.panels.map((p, idx) =>
        p && typeof p === 'object' ? { ...(p as Record<string, unknown>), id: `tpl_${idx}` } : p
      )
      const cleaned = sanitizePanels(withTempIds)
      if (cleaned.length === 0) continue

      const blueprints = cleaned.map(({ id: _ignored, ...rest }) => rest)
      const computed = computeOverallDimensions(cleaned)
      const dimsRaw = obj.dimensions as Record<string, unknown> | undefined
      const dimensions = {
        width:
          dimsRaw && typeof dimsRaw.width === 'number' && Number.isFinite(dimsRaw.width)
            ? dimsRaw.width
            : computed?.width ?? 0,
        height:
          dimsRaw && typeof dimsRaw.height === 'number' && Number.isFinite(dimsRaw.height)
            ? dimsRaw.height
            : computed?.height ?? 0,
        depth:
          dimsRaw && typeof dimsRaw.depth === 'number' && Number.isFinite(dimsRaw.depth)
            ? dimsRaw.depth
            : computed?.depth ?? 0,
      }

      valid.push({
        id: obj.id,
        name: obj.name,
        createdAt:
          typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt)
            ? obj.createdAt
            : 0,
        dimensions,
        panels: blueprints,
        thumbnail:
          typeof obj.thumbnail === 'string' && obj.thumbnail.startsWith('data:image/')
            ? obj.thumbnail
            : undefined,
      })
    }

    return valid.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export function persistCustomTemplates(templates: CustomTemplate[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates))
  } catch {
    try {
      const stripped = templates.map((t, idx) => (idx === 0 ? t : { ...t, thumbnail: undefined }))
      window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(stripped))
    } catch {
      try {
        const noThumbs = templates.map((t) => ({ ...t, thumbnail: undefined }))
        window.localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(noThumbs))
      } catch {
        // تجاهل إذا كان التخزين محظوراً
      }
    }
  }
}

export function saveCustomTemplate(
  name: string,
  sourcePanels: FurniturePanel[],
  thumbnail?: string
): { template: CustomTemplate; allTemplates: CustomTemplate[] } | null {
  if (sourcePanels.length === 0) return null

  const overall = computeOverallDimensions(sourcePanels)
  if (!overall) return null

  // تصفير الإحداثيات النسبية بحيث يكون المركز الأفقي (0, 0) وأقل نقطة ملامسة للأرض (Y = 0)
  const centerX = (overall.minX + overall.maxX) / 2
  const minY = overall.minY
  const centerZ = (overall.minZ + overall.maxZ) / 2

  const normalizedBlueprints: Omit<FurniturePanel, 'id'>[] = sourcePanels.map((panel) => {
    const cloned = deepClone(panel)
    const { id: _ignored, ...rest } = cloned
    return {
      ...rest,
      position: [
        roundTo(rest.position[0] - centerX, 2),
        roundTo(rest.position[1] - minY, 2),
        roundTo(rest.position[2] - centerZ, 2),
      ],
    }
  })

  const trimmed = name.trim() || 'قالب مخصص'
  const template: CustomTemplate = {
    id: `ctpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    createdAt: Date.now(),
    dimensions: {
      width: overall.width,
      height: overall.height,
      depth: overall.depth,
    },
    panels: normalizedBlueprints,
    thumbnail,
  }

  const nextList = [template, ...loadCustomTemplates()]
  persistCustomTemplates(nextList)
  return { template, allTemplates: nextList }
}

export function deleteCustomTemplate(id: string): CustomTemplate[] {
  const next = loadCustomTemplates().filter((t) => t.id !== id)
  persistCustomTemplates(next)
  return next
}

export function loadPricingConfig(): PricingConfig {
  try {
    const raw = safeGetLocalItem(PRICING_CONFIG_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PRICING_CONFIG }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PRICING_CONFIG }
    const obj = parsed as Record<string, unknown>

    const num = (val: unknown, fallback: number) =>
      typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : fallback

    return {
      sheet18Price: num(obj.sheet18Price, DEFAULT_PRICING_CONFIG.sheet18Price),
      sheet6Price: num(obj.sheet6Price, DEFAULT_PRICING_CONFIG.sheet6Price),
      edgeBandingPricePerMeter: num(
        obj.edgeBandingPricePerMeter,
        DEFAULT_PRICING_CONFIG.edgeBandingPricePerMeter
      ),
      hingePrice: num(obj.hingePrice, DEFAULT_PRICING_CONFIG.hingePrice),
      drawerSlidePrice: num(obj.drawerSlidePrice, DEFAULT_PRICING_CONFIG.drawerSlidePrice),
      handlePrice: num(obj.handlePrice, DEFAULT_PRICING_CONFIG.handlePrice),
      legsSetPrice: num(obj.legsSetPrice, DEFAULT_PRICING_CONFIG.legsSetPrice),
      laborCost: num(obj.laborCost, DEFAULT_PRICING_CONFIG.laborCost),
      profitMarginPercent: num(
        obj.profitMarginPercent,
        DEFAULT_PRICING_CONFIG.profitMarginPercent
      ),
    }
  } catch {
    return { ...DEFAULT_PRICING_CONFIG }
  }
}

export function savePricingConfig(config: PricingConfig): void {
  safeSetLocalItem(PRICING_CONFIG_STORAGE_KEY, JSON.stringify(config))
}
