import type { FurniturePanel, SavedDesign } from '../types/furniture'

const DESIGNS_STORAGE_KEY = 'counter_furniture_3d_designs_v1'
const AUTOSAVE_STORAGE_KEY = 'counter_furniture_3d_autosave_v1'

export function loadSavedDesigns(): SavedDesign[] {
  try {
    const raw = localStorage.getItem(DESIGNS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.sort((a: SavedDesign, b: SavedDesign) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export function persistSavedDesigns(designs: SavedDesign[]): void {
  try {
    localStorage.setItem(DESIGNS_STORAGE_KEY, JSON.stringify(designs))
  } catch {
    // تجاهل أخطاء امتلاء التخزين المحلي بصمت
  }
}

export function saveDesignByName(
  name: string,
  panels: FurniturePanel[],
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
      panels: structuredClone(panels),
    }
    nextList = existingList.map((d) => (d.id === matchById.id ? updatedDesign : d))
  } else {
    updatedDesign = {
      id: `design_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      updatedAt: now,
      panels: structuredClone(panels),
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

export function saveAutosave(panels: FurniturePanel[], designName: string, designId: string | null): void {
  try {
    localStorage.setItem(
      AUTOSAVE_STORAGE_KEY,
      JSON.stringify({ panels, designName, designId, updatedAt: Date.now() })
    )
  } catch {
    // ignore
  }
}

export function loadAutosave(): {
  panels: FurniturePanel[]
  designName: string
  designId: string | null
} | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.panels)) return null
    return {
      panels: parsed.panels,
      designName: typeof parsed.designName === 'string' ? parsed.designName : 'تصميم جديد',
      designId: typeof parsed.designId === 'string' ? parsed.designId : null,
    }
  } catch {
    return null
  }
}
