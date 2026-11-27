import * as THREE from 'three'
import { create } from 'zustand'
import {
  ALL_PRESETS,
  MAX_CLEARANCE_CM,
  MAX_PANEL_DIM_CM,
  MIN_CLEARANCE_CM,
  MIN_PANEL_DIM_CM,
} from '../constants/presets'
import {
  getDefaultEdgeBanding,
  getEffectiveEdgeBanding,
  type Axis,
  type CameraPreset,
  type EdgeBanding,
  type EdgeSide,
  type FurniturePanel,
  type HingeSide,
  type MaterialId,
  type PanelDimensions,
  type PanelRole,
  type SavedDesign,
  type SnapFeedback,
  type Vec3,
} from '../types/furniture'
import { computeAutoDistribution, type DistributeAxis } from '../utils/distribution'
import { clampPanelAboveFloor, getWorldHalfExtents, roundTo } from '../utils/snapping'
import {
  deleteSavedDesign,
  loadAutosave,
  loadSavedDesigns,
  saveAutosave,
  saveDesignByName,
} from '../utils/storage'

const MAX_HISTORY = 50

function createId(): string {
  return `panel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function clonePanels(panels: FurniturePanel[]): FurniturePanel[] {
  return structuredClone(panels)
}

function clampDim(val: number): number {
  if (!Number.isFinite(val)) return MIN_PANEL_DIM_CM
  return roundTo(Math.min(MAX_PANEL_DIM_CM, Math.max(MIN_PANEL_DIM_CM, val)), 2)
}

function clampClearance(val: number): number {
  if (!Number.isFinite(val)) return 0.2
  return roundTo(Math.min(MAX_CLEARANCE_CM, Math.max(MIN_CLEARANCE_CM, val)), 2)
}

function createStarterPanels(): FurniturePanel[] {
  // وحدة كونتر نموذجية جاهزة (عرض 100 × ارتفاع 81.8 × عمق 40 سم)
  return [
    {
      id: 'starter_left',
      name: 'جنب أيسر',
      role: 'vertical',
      category: 'panel',
      dimensions: { width: 1.8, height: 80, depth: 40 },
      position: [-49.1, 40, 0],
      rotation: [0, 0, 0],
      thicknessAxis: 'x',
      materialId: 'light_oak',
      edgeBanding: getDefaultEdgeBanding('vertical'),
    },
    {
      id: 'starter_right',
      name: 'جنب أيمن',
      role: 'vertical',
      category: 'panel',
      dimensions: { width: 1.8, height: 80, depth: 40 },
      position: [49.1, 40, 0],
      rotation: [0, 0, 0],
      thicknessAxis: 'x',
      materialId: 'light_oak',
      edgeBanding: getDefaultEdgeBanding('vertical'),
    },
    {
      id: 'starter_top',
      name: 'قرصة علوية',
      role: 'horizontal',
      category: 'panel',
      dimensions: { width: 100, height: 1.8, depth: 40 },
      position: [0, 80.9, 0],
      rotation: [0, 0, 0],
      thicknessAxis: 'y',
      materialId: 'light_oak',
      edgeBanding: { top: true, bottom: false, right: true, left: true },
    },
    {
      id: 'starter_shelf',
      name: 'رف داخلي 1',
      role: 'shelf',
      category: 'panel',
      dimensions: { width: 96.4, height: 1.8, depth: 38 },
      position: [0, 40, 0.7],
      rotation: [0, 0, 0],
      thicknessAxis: 'y',
      materialId: 'light_oak',
      edgeBanding: getDefaultEdgeBanding('shelf'),
    },
    {
      id: 'starter_back',
      name: 'ضهر',
      role: 'back',
      category: 'panel',
      dimensions: { width: 100, height: 80, depth: 0.6 },
      position: [0, 40, -20.3],
      rotation: [0, 0, 0],
      thicknessAxis: 'z',
      materialId: 'white',
      edgeBanding: getDefaultEdgeBanding('back'),
    },
  ]
}

function rotateEulerWorld90(rotation: Vec3, axis: Axis): Vec3 {
  const qCurrent = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ')
  )
  const axisVec =
    axis === 'x'
      ? new THREE.Vector3(1, 0, 0)
      : axis === 'y'
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(0, 0, 1)
  const qDelta = new THREE.Quaternion().setFromAxisAngle(axisVec, Math.PI / 2)
  const qNext = qDelta.multiply(qCurrent)
  const nextEuler = new THREE.Euler().setFromQuaternion(qNext, 'XYZ')

  const snapAngle = (rad: number) => {
    const quarterTurns = Math.round(rad / (Math.PI / 2))
    return quarterTurns * (Math.PI / 2)
  }

  return [snapAngle(nextEuler.x), snapAngle(nextEuler.y), snapAngle(nextEuler.z)]
}

function getInitialData() {
  const autosave = loadAutosave()
  if (autosave && autosave.panels.length > 0) {
    return autosave
  }
  return {
    panels: createStarterPanels(),
    designName: 'وحدة كونتر أساسية',
    designId: null,
  }
}

const initial = getInitialData()

interface DesignState {
  panels: FurniturePanel[]
  selectedPanelId: string | null
  selectedPanelIds: string[]
  multiSelectMode: boolean

  snappingEnabled: boolean
  isDraggingGizmo: boolean
  snapFeedback: SnapFeedback

  interfacesOpen: boolean
  interfacesHidden: boolean
  showDimensions: boolean
  statusToast: string | null

  cameraPreset: CameraPreset
  cameraRequestTick: number

  past: FurniturePanel[][]
  future: FurniturePanel[][]
  dragSnapshot: FurniturePanel[] | null

  currentDesignId: string | null
  currentDesignName: string
  savedDesigns: SavedDesign[]
  lastSavedAt: number | null

  // Selection actions
  selectPanel: (id: string | null, additive?: boolean) => void
  togglePanelSelection: (id: string) => void
  setMultiSelectMode: (enabled: boolean) => void
  selectAllByRole: (roles: PanelRole[]) => void
  clearSelection: () => void

  // Workspace view & toggles
  setSnappingEnabled: (enabled: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  toggleInterfacesOpen: () => void
  toggleInterfacesHidden: () => void
  toggleShowDimensions: () => void
  clearStatusToast: () => void

  // Panel CRUD
  addPresetPanel: (role: Exclude<PanelRole, 'custom'>) => void
  duplicatePanel: (id: string) => void
  deletePanel: (id: string) => void
  deleteSelectedPanels: () => void

  // Panel properties
  updatePanelDimension: (id: string, key: keyof PanelDimensions, value: number) => void
  setPanelThickness: (id: string, thicknessCm: number) => void
  setPanelClearance: (id: string, clearanceCm: number) => void
  setPanelHasHandle: (id: string, hasHandle: boolean) => void
  setPanelHingeSide: (id: string, side: HingeSide) => void
  togglePanelEdgeBanding: (id: string, side: EdgeSide) => void
  setPanelEdgeBanding: (id: string, edgeBanding: EdgeBanding) => void
  rotatePanel90: (id: string, axis: Axis) => void
  setPanelMaterial: (id: string, materialId: MaterialId) => void
  renamePanel: (id: string, name: string) => void

  // Auto-distribute shelves/dividers
  autoDistributeSelected: (axisOverride?: DistributeAxis) => void

  // Gizmo transform lifecycle
  beginTransformDrag: () => void
  movePanelLive: (id: string, position: Vec3, feedback: SnapFeedback) => void
  endTransformDrag: () => void

  // History
  undo: () => void
  redo: () => void

  // Persistence
  newEmptyDesign: () => void
  resetToStarterTemplate: () => void
  saveCurrentDesign: (name: string, asNew?: boolean) => SavedDesign
  loadDesign: (id: string) => void
  removeSavedDesign: (id: string) => void
}

function pushPast(past: FurniturePanel[][], snapshot: FurniturePanel[]): FurniturePanel[][] {
  const next = [...past, clonePanels(snapshot)]
  if (next.length > MAX_HISTORY) {
    return next.slice(next.length - MAX_HISTORY)
  }
  return next
}

export const useDesignStore = create<DesignState>((set, get) => ({
  panels: initial.panels,
  selectedPanelId: null,
  selectedPanelIds: [],
  multiSelectMode: false,

  snappingEnabled: true,
  isDraggingGizmo: false,
  snapFeedback: { x: false, y: false, z: false, floor: false },

  interfacesOpen: false,
  interfacesHidden: false,
  showDimensions: true,
  statusToast: null,

  cameraPreset: 'perspective',
  cameraRequestTick: 0,

  past: [],
  future: [],
  dragSnapshot: null,

  currentDesignId: initial.designId,
  currentDesignName: initial.designName,
  savedDesigns: loadSavedDesigns(),
  lastSavedAt: null,

  selectPanel: (id, additive = false) => {
    if (!id) {
      set({ selectedPanelId: null, selectedPanelIds: [] })
      return
    }
    const { multiSelectMode, selectedPanelIds } = get()
    if (additive || multiSelectMode) {
      const exists = selectedPanelIds.includes(id)
      const nextIds = exists
        ? selectedPanelIds.filter((x) => x !== id)
        : [...selectedPanelIds, id]
      set({
        selectedPanelIds: nextIds,
        selectedPanelId: nextIds[nextIds.length - 1] ?? null,
      })
      return
    }
    set({ selectedPanelId: id, selectedPanelIds: [id] })
  },

  togglePanelSelection: (id) => {
    const { selectedPanelIds } = get()
    const exists = selectedPanelIds.includes(id)
    const nextIds = exists
      ? selectedPanelIds.filter((x) => x !== id)
      : [...selectedPanelIds, id]
    set({
      selectedPanelIds: nextIds,
      selectedPanelId: nextIds[nextIds.length - 1] ?? null,
    })
  },

  setMultiSelectMode: (enabled) => set({ multiSelectMode: enabled }),

  selectAllByRole: (roles) => {
    const matching = get()
      .panels.filter((p) => roles.includes(p.role))
      .map((p) => p.id)
    set({
      selectedPanelIds: matching,
      selectedPanelId: matching[matching.length - 1] ?? null,
      multiSelectMode: matching.length > 1,
    })
  },

  clearSelection: () => set({ selectedPanelId: null, selectedPanelIds: [] }),

  setSnappingEnabled: (enabled) => set({ snappingEnabled: enabled }),

  setCameraPreset: (preset) =>
    set((state) => ({
      cameraPreset: preset,
      cameraRequestTick: state.cameraRequestTick + 1,
    })),

  toggleInterfacesOpen: () =>
    set((state) => ({ interfacesOpen: !state.interfacesOpen })),

  toggleInterfacesHidden: () =>
    set((state) => ({ interfacesHidden: !state.interfacesHidden })),

  toggleShowDimensions: () =>
    set((state) => ({ showDimensions: !state.showDimensions })),

  clearStatusToast: () => set({ statusToast: null }),

  addPresetPanel: (role) => {
    const preset = ALL_PRESETS.find((p) => p.role === role)
    if (!preset) return

    const { panels, past } = get()
    const countOfRole = panels.filter((p) => p.role === role).length + 1
    const [, hy] = getWorldHalfExtents(preset.dimensions, [0, 0, 0])

    let position: Vec3
    if (preset.defaultPosition) {
      const sameRoleCount = panels.filter((p) => p.role === role).length
      const shiftX = role === 'hinged_door' && sameRoleCount % 2 === 1 ? -25 : 0
      const shiftY = role === 'drawer' ? sameRoleCount * 21 : 0
      const shiftXSliding = role === 'sliding_door' && sameRoleCount % 2 === 1 ? 24 : 0
      position = [
        roundTo(preset.defaultPosition[0] + shiftX + shiftXSliding, 2),
        roundTo(Math.max(hy, preset.defaultPosition[1] + shiftY), 2),
        preset.defaultPosition[2],
      ]
    } else {
      const offsetStep = (panels.length % 4) * 8
      const baseZ = role === 'back' ? -25 : offsetStep
      const baseY = role === 'horizontal' && panels.length === 0 ? 40 : hy
      position = [offsetStep, roundTo(baseY, 2), baseZ]
    }

    const newPanel: FurniturePanel = {
      id: createId(),
      name: `${preset.shortLabel} ${countOfRole}`,
      role: preset.role,
      category: preset.category,
      dimensions: { ...preset.dimensions },
      position,
      rotation: [0, 0, 0],
      thicknessAxis: preset.thicknessAxis,
      materialId: preset.defaultMaterial,
      edgeBanding: getDefaultEdgeBanding(preset.role),
      ...(preset.clearanceCm !== undefined ? { clearanceCm: preset.clearanceCm } : {}),
      ...(preset.hasHandle !== undefined ? { hasHandle: preset.hasHandle } : {}),
      ...(preset.hingeSide !== undefined ? { hingeSide: preset.hingeSide } : {}),
    }

    const nextPanels = [...panels, newPanel]
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelId: newPanel.id,
      selectedPanelIds: [newPanel.id],
      interfacesHidden: preset.category === 'front' ? false : get().interfacesHidden,
      past: pushPast(past, panels),
      future: [],
    })
  },

  duplicatePanel: (id) => {
    const { panels, past } = get()
    const source = panels.find((p) => p.id === id)
    if (!source) return

    const [hx] = getWorldHalfExtents(source.dimensions, source.rotation)
    const offset = Math.max(hx * 2 + 2, 10)

    const copy: FurniturePanel = {
      ...structuredClone(source),
      id: createId(),
      name: `${source.name} (نسخة)`,
      position: [roundTo(source.position[0] + offset, 2), source.position[1], source.position[2]],
    }

    const nextPanels = [...panels, copy]
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelId: copy.id,
      selectedPanelIds: [copy.id],
      past: pushPast(past, panels),
      future: [],
    })
  },

  deletePanel: (id) => {
    const { panels, past, selectedPanelIds } = get()
    if (!panels.some((p) => p.id === id)) return

    const nextPanels = panels.filter((p) => p.id !== id)
    const nextSelectedIds = selectedPanelIds.filter((x) => x !== id)
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      past: pushPast(past, panels),
      future: [],
    })
  },

  deleteSelectedPanels: () => {
    const { panels, past, selectedPanelIds } = get()
    if (selectedPanelIds.length === 0) return

    const nextPanels = panels.filter((p) => !selectedPanelIds.includes(p.id))
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: [],
      selectedPanelId: null,
      past: pushPast(past, panels),
      future: [],
    })
  },

  updatePanelDimension: (id, key, value) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const clamped = clampDim(value)
    if (target.dimensions[key] === clamped) return

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const updated: FurniturePanel = {
        ...p,
        dimensions: {
          ...p.dimensions,
          [key]: clamped,
        },
      }
      updated.position = clampPanelAboveFloor(updated)
      return updated
    })

    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelThickness: (id, thicknessCm) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const axisToDimKey: Record<Axis, keyof PanelDimensions> = {
      x: 'width',
      y: 'height',
      z: 'depth',
    }
    const dimKey = axisToDimKey[target.thicknessAxis]
    const nextThickness = clampDim(thicknessCm)
    if (target.dimensions[dimKey] === nextThickness) return

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const updated: FurniturePanel = {
        ...p,
        dimensions: {
          ...p.dimensions,
          [dimKey]: nextThickness,
        },
      }
      updated.position = clampPanelAboveFloor(updated)
      return updated
    })

    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelClearance: (id, clearanceCm) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const clamped = clampClearance(clearanceCm)
    if ((target.clearanceCm ?? 0.2) === clamped) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, clearanceCm: clamped } : p
    )
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelHasHandle: (id, hasHandle) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, hasHandle } : p
    )
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelHingeSide: (id, side) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, hingeSide: side } : p
    )
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  togglePanelEdgeBanding: (id, side) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const current = getEffectiveEdgeBanding(target)
    const nextEdgeBanding: EdgeBanding = {
      ...current,
      [side]: !current[side],
    }

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, edgeBanding: nextEdgeBanding } : p
    )
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelEdgeBanding: (id, edgeBanding) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, edgeBanding } : p
    )
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  rotatePanel90: (id, axis) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const nextRotation = rotateEulerWorld90(p.rotation, axis)
      const updated: FurniturePanel = {
        ...p,
        rotation: nextRotation,
      }
      updated.position = clampPanelAboveFloor(updated)
      return updated
    })

    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  setPanelMaterial: (id, materialId) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target || target.materialId === materialId) return

    const nextPanels = panels.map((p) => (p.id === id ? { ...p, materialId } : p))
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  renamePanel: (id, name) => {
    const { panels, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target || target.name === name) return

    const nextPanels = panels.map((p) => (p.id === id ? { ...p, name } : p))
    saveAutosave(nextPanels, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels),
      future: [],
    })
  },

  autoDistributeSelected: (axisOverride) => {
    const { panels, selectedPanelIds, past } = get()
    const result = computeAutoDistribution(panels, selectedPanelIds, axisOverride)

    if (!result.applied) {
      set({ statusToast: result.message })
      return
    }

    saveAutosave(result.panels, get().currentDesignName, get().currentDesignId)
    set({
      panels: result.panels,
      past: pushPast(past, panels),
      future: [],
      statusToast: result.message,
    })
  },

  beginTransformDrag: () => {
    const { panels } = get()
    set({
      isDraggingGizmo: true,
      dragSnapshot: clonePanels(panels),
      snapFeedback: { x: false, y: false, z: false, floor: false },
    })
  },

  movePanelLive: (id, position, feedback) => {
    set((state) => ({
      panels: state.panels.map((p) => (p.id === id ? { ...p, position } : p)),
      snapFeedback: feedback,
    }))
  },

  endTransformDrag: () => {
    const { dragSnapshot, panels, past, currentDesignName, currentDesignId } = get()
    const changed =
      dragSnapshot !== null && JSON.stringify(dragSnapshot) !== JSON.stringify(panels)

    if (changed) {
      saveAutosave(panels, currentDesignName, currentDesignId)
    }

    set({
      isDraggingGizmo: false,
      dragSnapshot: null,
      snapFeedback: { x: false, y: false, z: false, floor: false },
      past: changed && dragSnapshot ? pushPast(past, dragSnapshot) : past,
      future: changed ? [] : get().future,
    })
  },

  undo: () => {
    const { past, panels, future, selectedPanelIds } = get()
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const nextPast = past.slice(0, past.length - 1)
    const nextFuture = [clonePanels(panels), ...future].slice(0, MAX_HISTORY)
    const nextSelectedIds = selectedPanelIds.filter((id) =>
      previous.some((p) => p.id === id)
    )

    saveAutosave(previous, get().currentDesignName, get().currentDesignId)

    set({
      panels: clonePanels(previous),
      past: nextPast,
      future: nextFuture,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
    })
  },

  redo: () => {
    const { past, panels, future, selectedPanelIds } = get()
    if (future.length === 0) return

    const next = future[0]
    const nextFuture = future.slice(1)
    const nextPast = pushPast(past, panels)
    const nextSelectedIds = selectedPanelIds.filter((id) =>
      next.some((p) => p.id === id)
    )

    saveAutosave(next, get().currentDesignName, get().currentDesignId)

    set({
      panels: clonePanels(next),
      past: nextPast,
      future: nextFuture,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
    })
  },

  newEmptyDesign: () => {
    const { panels, past } = get()
    saveAutosave([], 'تصميم جديد', null)
    set({
      panels: [],
      selectedPanelId: null,
      selectedPanelIds: [],
      currentDesignId: null,
      currentDesignName: 'تصميم جديد',
      past: panels.length > 0 ? pushPast(past, panels) : past,
      future: [],
    })
  },

  resetToStarterTemplate: () => {
    const { panels, past } = get()
    const starter = createStarterPanels()
    saveAutosave(starter, 'وحدة كونتر أساسية', null)
    set({
      panels: starter,
      selectedPanelId: null,
      selectedPanelIds: [],
      currentDesignId: null,
      currentDesignName: 'وحدة كونتر أساسية',
      past: pushPast(past, panels),
      future: [],
    })
  },

  saveCurrentDesign: (name, asNew = false) => {
    const { panels, currentDesignId } = get()
    const { design, allDesigns } = saveDesignByName(
      name,
      panels,
      asNew ? null : currentDesignId
    )
    saveAutosave(panels, design.name, design.id)
    set({
      savedDesigns: allDesigns,
      currentDesignId: design.id,
      currentDesignName: design.name,
      lastSavedAt: design.updatedAt,
    })
    return design
  },

  loadDesign: (id) => {
    const { savedDesigns, panels, past } = get()
    const found = savedDesigns.find((d) => d.id === id)
    if (!found) return

    const loadedPanels = clonePanels(found.panels)
    saveAutosave(loadedPanels, found.name, found.id)

    set({
      panels: loadedPanels,
      selectedPanelId: null,
      selectedPanelIds: [],
      currentDesignId: found.id,
      currentDesignName: found.name,
      past: pushPast(past, panels),
      future: [],
    })
  },

  removeSavedDesign: (id) => {
    const nextList = deleteSavedDesign(id)
    set((state) => ({
      savedDesigns: nextList,
      currentDesignId: state.currentDesignId === id ? null : state.currentDesignId,
    }))
  },
}))
