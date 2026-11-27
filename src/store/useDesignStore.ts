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
  type GuideLine,
  type HingeSide,
  type HumanScalePreset,
  type MaterialId,
  type PanelDimensions,
  type PanelRole,
  type SavedDesign,
  type SnapFeedback,
  type TapeMode,
  type ToolMode,
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
import { buildGuideLineGeometry, type ReferenceEdge } from '../utils/tapeMeasure'

const MAX_HISTORY = 50

interface HistorySnapshot {
  panels: FurniturePanel[]
  guides: GuideLine[]
}

function createId(prefix = 'panel'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function cloneSnapshot(panels: FurniturePanel[], guides: GuideLine[]): HistorySnapshot {
  return {
    panels: structuredClone(panels),
    guides: structuredClone(guides),
  }
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
  if (autosave && (autosave.panels.length > 0 || autosave.guides.length > 0)) {
    return autosave
  }
  return {
    panels: createStarterPanels(),
    guides: [] as GuideLine[],
    designName: 'وحدة كونتر أساسية',
    designId: null,
  }
}

const initial = getInitialData()

interface DesignState {
  panels: FurniturePanel[]
  guides: GuideLine[]
  guidesVisible: boolean
  selectedGuideId: string | null

  selectedPanelId: string | null
  selectedPanelIds: string[]
  multiSelectMode: boolean

  toolMode: ToolMode
  tapeMode: TapeMode
  isDraggingTape: boolean
  activeReferenceEdge: ReferenceEdge | null
  draftGuideDistanceCm: number
  draftGuideDirection: 1 | -1

  snappingEnabled: boolean
  isDraggingGizmo: boolean
  snapFeedback: SnapFeedback

  interfacesOpen: boolean
  interfacesHidden: boolean
  showDimensions: boolean
  showHumanReference: boolean
  humanScalePreset: HumanScalePreset
  humanPosition: [number, number]
  isDraggingHuman: boolean
  statusToast: string | null

  cameraPreset: CameraPreset
  cameraRequestTick: number

  past: HistorySnapshot[]
  future: HistorySnapshot[]
  dragSnapshot: HistorySnapshot | null

  // Selection actions
  selectPanel: (id: string | null, additive?: boolean) => void
  togglePanelSelection: (id: string) => void
  setMultiSelectMode: (enabled: boolean) => void
  selectAllByRole: (roles: PanelRole[]) => void
  clearSelection: () => void

  // Tape measure & Guide actions
  setToolMode: (mode: ToolMode) => void
  setTapeMode: (mode: TapeMode) => void
  setIsDraggingTape: (dragging: boolean) => void
  toggleGuidesVisible: () => void
  selectGuide: (id: string | null) => void
  setActiveReferenceEdge: (edge: ReferenceEdge | null) => void
  setDraftGuideParams: (distanceCm: number, direction: 1 | -1) => void
  commitDraftGuide: () => void
  addGuideFromEdge: (edge: ReferenceEdge, distanceCm: number, direction: 1 | -1) => void
  updateGuideDistance: (id: string, distanceCm: number) => void
  flipGuideDirection: (id: string) => void
  deleteGuide: (id: string) => void
  clearAllGuides: () => void

  // Workspace view & toggles
  setSnappingEnabled: (enabled: boolean) => void
  setCameraPreset: (preset: CameraPreset) => void
  toggleInterfacesOpen: () => void
  toggleInterfacesHidden: () => void
  toggleShowDimensions: () => void
  toggleHumanReference: () => void
  setHumanScalePreset: (preset: HumanScalePreset) => void
  setHumanPosition: (x: number, z: number) => void
  setIsDraggingHuman: (dragging: boolean) => void
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
  currentDesignId: string | null
  currentDesignName: string
  savedDesigns: SavedDesign[]
  lastSavedAt: number | null
  newEmptyDesign: () => void
  resetToStarterTemplate: () => void
  saveCurrentDesign: (name: string, asNew?: boolean) => SavedDesign
  loadDesign: (id: string) => void
  removeSavedDesign: (id: string) => void
}

function pushPast(
  past: HistorySnapshot[],
  panels: FurniturePanel[],
  guides: GuideLine[]
): HistorySnapshot[] {
  const next = [...past, cloneSnapshot(panels, guides)]
  if (next.length > MAX_HISTORY) {
    return next.slice(next.length - MAX_HISTORY)
  }
  return next
}

export const useDesignStore = create<DesignState>((set, get) => ({
  panels: initial.panels,
  guides: initial.guides,
  guidesVisible: true,
  selectedGuideId: null,

  selectedPanelId: null,
  selectedPanelIds: [],
  multiSelectMode: false,

  toolMode: 'select',
  tapeMode: 'guide',
  isDraggingTape: false,
  activeReferenceEdge: null,
  draftGuideDistanceCm: 30,
  draftGuideDirection: 1,

  snappingEnabled: true,
  isDraggingGizmo: false,
  snapFeedback: { x: false, y: false, z: false, floor: false, guide: false },

  interfacesOpen: false,
  interfacesHidden: false,
  showDimensions: true,
  showHumanReference: false,
  humanScalePreset: 'adult',
  humanPosition: [-95, 0],
  isDraggingHuman: false,
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
      set({ selectedPanelId: null, selectedPanelIds: [], selectedGuideId: null })
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
        selectedGuideId: null,
      })
      return
    }
    set({ selectedPanelId: id, selectedPanelIds: [id], selectedGuideId: null })
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
      selectedGuideId: null,
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
      selectedGuideId: null,
      multiSelectMode: matching.length > 1,
    })
  },

  clearSelection: () => set({ selectedPanelId: null, selectedPanelIds: [], selectedGuideId: null }),

  setToolMode: (mode) =>
    set({
      toolMode: mode,
      isDraggingTape: false,
      activeReferenceEdge: null,
      selectedGuideId: null,
      selectedPanelId: mode === 'tape' ? null : get().selectedPanelId,
      selectedPanelIds: mode === 'tape' ? [] : get().selectedPanelIds,
    }),

  setTapeMode: (mode) =>
    set({
      tapeMode: mode,
      activeReferenceEdge: null,
      isDraggingTape: false,
    }),

  setIsDraggingTape: (dragging) => set({ isDraggingTape: dragging }),

  toggleGuidesVisible: () =>
    set((state) => ({
      guidesVisible: !state.guidesVisible,
      selectedGuideId: state.guidesVisible ? null : state.selectedGuideId,
    })),

  selectGuide: (id) =>
    set({
      selectedGuideId: id,
      selectedPanelId: id ? null : get().selectedPanelId,
      selectedPanelIds: id ? [] : get().selectedPanelIds,
      activeReferenceEdge: null,
    }),

  setActiveReferenceEdge: (edge) =>
    set({
      activeReferenceEdge: edge,
      draftGuideDirection: edge ? edge.defaultDirection : 1,
      selectedGuideId: null,
    }),

  setDraftGuideParams: (distanceCm, direction) =>
    set({
      draftGuideDistanceCm: Math.max(0, roundTo(distanceCm, 2)),
      draftGuideDirection: direction,
    }),

  commitDraftGuide: () => {
    const { activeReferenceEdge, draftGuideDistanceCm, draftGuideDirection } = get()
    if (!activeReferenceEdge) return
    get().addGuideFromEdge(activeReferenceEdge, draftGuideDistanceCm, draftGuideDirection)
    set({ activeReferenceEdge: null })
  },

  addGuideFromEdge: (edge, distanceCm, direction) => {
    const { panels, guides, past, currentDesignName, currentDesignId } = get()
    const newGuide = buildGuideLineGeometry({
      id: createId('guide'),
      panelId: edge.panelId,
      panelName: edge.panelName,
      edgeLabel: edge.edgeLabel,
      lineAxis: edge.lineAxis,
      offsetAxis: edge.offsetAxis,
      normalAxis: edge.normalAxis,
      surfaceCoord: edge.surfaceCoord,
      surfaceSign: edge.surfaceSign,
      referenceEdgeCoord: edge.referenceEdgeCoord,
      direction,
      distanceCm,
      spanMin: edge.spanMin,
      spanMax: edge.spanMax,
    })

    const nextGuides = [...guides, newGuide]
    saveAutosave(panels, nextGuides, currentDesignName, currentDesignId)

    set({
      guides: nextGuides,
      guidesVisible: true,
      selectedGuideId: newGuide.id,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: `تم تثبيت علام على بُعد ${newGuide.distanceCm} سم`,
    })
  },

  updateGuideDistance: (id, distanceCm) => {
    const { panels, guides, past, currentDesignName, currentDesignId } = get()
    const target = guides.find((g) => g.id === id)
    if (!target) return

    const safe = Math.max(0, roundTo(distanceCm, 2))
    if (target.distanceCm === safe) return

    const nextGuides = guides.map((g) =>
      g.id === id ? buildGuideLineGeometry({ ...g, distanceCm: safe }) : g
    )
    saveAutosave(panels, nextGuides, currentDesignName, currentDesignId)

    set({
      guides: nextGuides,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  flipGuideDirection: (id) => {
    const { panels, guides, past, currentDesignName, currentDesignId } = get()
    const target = guides.find((g) => g.id === id)
    if (!target) return

    const nextDir: 1 | -1 = target.direction === 1 ? -1 : 1
    const nextGuides = guides.map((g) =>
      g.id === id ? buildGuideLineGeometry({ ...g, direction: nextDir }) : g
    )
    saveAutosave(panels, nextGuides, currentDesignName, currentDesignId)

    set({
      guides: nextGuides,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  deleteGuide: (id) => {
    const { panels, guides, past, selectedGuideId, currentDesignName, currentDesignId } = get()
    if (!guides.some((g) => g.id === id)) return

    const nextGuides = guides.filter((g) => g.id !== id)
    saveAutosave(panels, nextGuides, currentDesignName, currentDesignId)

    set({
      guides: nextGuides,
      selectedGuideId: selectedGuideId === id ? null : selectedGuideId,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  clearAllGuides: () => {
    const { panels, guides, past, currentDesignName, currentDesignId } = get()
    if (guides.length === 0) return

    saveAutosave(panels, [], currentDesignName, currentDesignId)
    set({
      guides: [],
      selectedGuideId: null,
      activeReferenceEdge: null,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: 'تم مسح جميع العلامات',
    })
  },

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

  toggleHumanReference: () =>
    set((state) => ({ showHumanReference: !state.showHumanReference })),

  setHumanScalePreset: (preset) => set({ humanScalePreset: preset }),

  setHumanPosition: (x, z) => set({ humanPosition: [x, z] }),

  setIsDraggingHuman: (dragging) => set({ isDraggingHuman: dragging }),

  clearStatusToast: () => set({ statusToast: null }),

  addPresetPanel: (role) => {
    const preset = ALL_PRESETS.find((p) => p.role === role)
    if (!preset) return

    const { panels, guides, past } = get()
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
      id: createId('panel'),
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
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      toolMode: 'select',
      selectedPanelId: newPanel.id,
      selectedPanelIds: [newPanel.id],
      selectedGuideId: null,
      interfacesHidden: preset.category === 'front' ? false : get().interfacesHidden,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  duplicatePanel: (id) => {
    const { panels, guides, past } = get()
    const source = panels.find((p) => p.id === id)
    if (!source) return

    const [hx] = getWorldHalfExtents(source.dimensions, source.rotation)
    const offset = Math.max(hx * 2 + 2, 10)

    const copy: FurniturePanel = {
      ...structuredClone(source),
      id: createId('panel'),
      name: `${source.name} (نسخة)`,
      position: [roundTo(source.position[0] + offset, 2), source.position[1], source.position[2]],
    }

    const nextPanels = [...panels, copy]
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelId: copy.id,
      selectedPanelIds: [copy.id],
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  deletePanel: (id) => {
    const { panels, guides, past, selectedPanelIds } = get()
    if (!panels.some((p) => p.id === id)) return

    const nextPanels = panels.filter((p) => p.id !== id)
    const nextSelectedIds = selectedPanelIds.filter((x) => x !== id)
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  deleteSelectedPanels: () => {
    const { panels, guides, past, selectedPanelIds } = get()
    if (selectedPanelIds.length === 0) return

    const nextPanels = panels.filter((p) => !selectedPanelIds.includes(p.id))
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: [],
      selectedPanelId: null,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  updatePanelDimension: (id, key, value) => {
    const { panels, guides, past } = get()
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

    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelThickness: (id, thicknessCm) => {
    const { panels, guides, past } = get()
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

    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelClearance: (id, clearanceCm) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const clamped = clampClearance(clearanceCm)
    if ((target.clearanceCm ?? 0.2) === clamped) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, clearanceCm: clamped } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelHasHandle: (id, hasHandle) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, hasHandle } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelHingeSide: (id, side) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, hingeSide: side } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  togglePanelEdgeBanding: (id, side) => {
    const { panels, guides, past } = get()
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
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelEdgeBanding: (id, edgeBanding) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, edgeBanding } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  rotatePanel90: (id, axis) => {
    const { panels, guides, past } = get()
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

    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelMaterial: (id, materialId) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target || target.materialId === materialId) return

    const nextPanels = panels.map((p) => (p.id === id ? { ...p, materialId } : p))
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  renamePanel: (id, name) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target || target.name === name) return

    const nextPanels = panels.map((p) => (p.id === id ? { ...p, name } : p))
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  autoDistributeSelected: (axisOverride) => {
    const { panels, guides, selectedPanelIds, past } = get()
    const result = computeAutoDistribution(panels, selectedPanelIds, axisOverride)

    if (!result.applied) {
      set({ statusToast: result.message })
      return
    }

    saveAutosave(result.panels, guides, get().currentDesignName, get().currentDesignId)
    set({
      panels: result.panels,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: result.message,
    })
  },

  beginTransformDrag: () => {
    const { panels, guides } = get()
    set({
      isDraggingGizmo: true,
      dragSnapshot: cloneSnapshot(panels, guides),
      snapFeedback: { x: false, y: false, z: false, floor: false, guide: false },
    })
  },

  movePanelLive: (id, position, feedback) => {
    set((state) => ({
      panels: state.panels.map((p) => (p.id === id ? { ...p, position } : p)),
      snapFeedback: feedback,
    }))
  },

  endTransformDrag: () => {
    const { dragSnapshot, panels, guides, past, currentDesignName, currentDesignId } = get()
    const changed =
      dragSnapshot !== null && JSON.stringify(dragSnapshot.panels) !== JSON.stringify(panels)

    if (changed) {
      saveAutosave(panels, guides, currentDesignName, currentDesignId)
    }

    set({
      isDraggingGizmo: false,
      dragSnapshot: null,
      snapFeedback: { x: false, y: false, z: false, floor: false, guide: false },
      past: changed && dragSnapshot ? pushPast(past, dragSnapshot.panels, dragSnapshot.guides) : past,
      future: changed ? [] : get().future,
    })
  },

  undo: () => {
    const { past, panels, guides, future, selectedPanelIds, selectedGuideId } = get()
    if (past.length === 0) return

    const previous = past[past.length - 1]
    const nextPast = past.slice(0, past.length - 1)
    const nextFuture = [cloneSnapshot(panels, guides), ...future].slice(0, MAX_HISTORY)
    const nextSelectedIds = selectedPanelIds.filter((id) =>
      previous.panels.some((p) => p.id === id)
    )
    const guideStillExists = previous.guides.some((g) => g.id === selectedGuideId)

    saveAutosave(previous.panels, previous.guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: structuredClone(previous.panels),
      guides: structuredClone(previous.guides),
      past: nextPast,
      future: nextFuture,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      selectedGuideId: guideStillExists ? selectedGuideId : null,
    })
  },

  redo: () => {
    const { past, panels, guides, future, selectedPanelIds, selectedGuideId } = get()
    if (future.length === 0) return

    const next = future[0]
    const nextFuture = future.slice(1)
    const nextPast = pushPast(past, panels, guides)
    const nextSelectedIds = selectedPanelIds.filter((id) =>
      next.panels.some((p) => p.id === id)
    )
    const guideStillExists = next.guides.some((g) => g.id === selectedGuideId)

    saveAutosave(next.panels, next.guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: structuredClone(next.panels),
      guides: structuredClone(next.guides),
      past: nextPast,
      future: nextFuture,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      selectedGuideId: guideStillExists ? selectedGuideId : null,
    })
  },

  newEmptyDesign: () => {
    const { panels, guides, past } = get()
    saveAutosave([], [], 'تصميم جديد', null)
    set({
      panels: [],
      guides: [],
      selectedPanelId: null,
      selectedPanelIds: [],
      selectedGuideId: null,
      activeReferenceEdge: null,
      currentDesignId: null,
      currentDesignName: 'تصميم جديد',
      past: panels.length > 0 || guides.length > 0 ? pushPast(past, panels, guides) : past,
      future: [],
    })
  },

  resetToStarterTemplate: () => {
    const { panels, guides, past } = get()
    const starter = createStarterPanels()
    saveAutosave(starter, [], 'وحدة كونتر أساسية', null)
    set({
      panels: starter,
      guides: [],
      selectedPanelId: null,
      selectedPanelIds: [],
      selectedGuideId: null,
      activeReferenceEdge: null,
      currentDesignId: null,
      currentDesignName: 'وحدة كونتر أساسية',
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  saveCurrentDesign: (name, asNew = false) => {
    const { panels, guides, currentDesignId } = get()
    const { design, allDesigns } = saveDesignByName(
      name,
      panels,
      guides,
      asNew ? null : currentDesignId
    )
    saveAutosave(panels, guides, design.name, design.id)
    set({
      savedDesigns: allDesigns,
      currentDesignId: design.id,
      currentDesignName: design.name,
      lastSavedAt: design.updatedAt,
    })
    return design
  },

  loadDesign: (id) => {
    const { savedDesigns, panels, guides, past } = get()
    const found = savedDesigns.find((d) => d.id === id)
    if (!found) return

    const loadedPanels = structuredClone(found.panels)
    const loadedGuides = structuredClone(found.guides ?? [])
    saveAutosave(loadedPanels, loadedGuides, found.name, found.id)

    set({
      panels: loadedPanels,
      guides: loadedGuides,
      selectedPanelId: null,
      selectedPanelIds: [],
      selectedGuideId: null,
      activeReferenceEdge: null,
      currentDesignId: found.id,
      currentDesignName: found.name,
      past: pushPast(past, panels, guides),
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
