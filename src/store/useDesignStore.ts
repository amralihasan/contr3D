import * as THREE from 'three'
import { create } from 'zustand'
import {
  ALL_PRESETS,
  MAX_CLEARANCE_CM,
  MAX_PANEL_DIM_CM,
  MIN_CLEARANCE_CM,
  MIN_PANEL_DIM_CM,
} from '../constants/presets'
import { FURNITURE_TEMPLATES } from '../constants/templates'
import {
  getDefaultEdgeBanding,
  getEffectiveEdgeBanding,
  getEffectivePanelHandle,
  isInterfaceRole,
  type Axis,
  type CameraPreset,
  type CornerRadius,
  type CustomTemplate,
  type EdgeBanding,
  type EdgeSide,
  type FurniturePanel,
  type GuideLine,
  type HingeSide,
  type HumanScalePreset,
  type MaterialId,
  type MetalBaseColor,
  type PanelCutout,
  type PanelDimensions,
  type PanelHandleConfig,
  type PanelRole,
  type SavedDesign,
  type SnapFeedback,
  type TapeMode,
  type ToolMode,
  type Vec3,
} from '../types/furniture'
import { computeAutoDistribution, type DistributeAxis } from '../utils/distribution'
import { computeOverallDimensions } from '../utils/dimensions'
import { clampCornerRadius } from '../utils/panelGeometry'
import { clampPanelAboveFloor, getWorldHalfExtents, roundTo } from '../utils/snapping'
import {
  deepClone,
  deleteCustomTemplate,
  deleteSavedDesign,
  loadCustomTemplates,
  loadSavedDesigns,
  loadUiPreferences,
  sanitizeGuides,
  sanitizePanels,
  saveAutosave,
  saveCustomTemplate,
  saveDesignByName,
  saveUiPreferences,
} from '../utils/storage'
import { buildGuideLineGeometry, type ReferenceEdge } from '../utils/tapeMeasure'
import { captureSceneThumbnail } from '../utils/thumbnail'

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
    panels: deepClone(panels),
    guides: deepClone(guides),
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

function computeDesignSignature(panels: FurniturePanel[], guides: GuideLine[]): string {
  return JSON.stringify({ panels, guides })
}

// يبدأ التطبيق دائماً بمشهد فارغ دون استعادة تلقائية لآخر مسودة، مع الحفاظ على التصاميم والقوالب المحفوظة
const EMPTY_DESIGN_SIGNATURE = computeDesignSignature([], [])
const initialUiPrefs = loadUiPreferences()
const initialSavedDesigns = loadSavedDesigns()

export type ImageExportMode = 'clean' | 'transparent' | 'three_angles' | 'sketch'
export type RenderMode = 'normal' | 'sketch'

interface DesignState {
  panels: FurniturePanel[]
  guides: GuideLine[]
  guidesVisible: boolean
  selectedGuideId: string | null

  selectedPanelId: string | null
  selectedPanelIds: string[]
  multiSelectMode: boolean
  clipboard: FurniturePanel[]

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
  isExporting: boolean
  exportMode: ImageExportMode | null
  renderMode: RenderMode
  exportRequestTick: number
  partsSidebarOpen: boolean
  propsSidebarOpen: boolean
  focusMode: boolean
  preFocusPartsOpen: boolean
  preFocusPropsOpen: boolean
  statusToast: string | null

  cameraPreset: CameraPreset
  cameraRequestTick: number
  cameraFocusTarget: { position: Vec3; target: Vec3 } | null
  cameraFocusTick: number

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
  triggerExportImage: (mode: ImageExportMode) => void
  finishExportImage: (success: boolean, customMessage?: string) => void
  setPartsSidebarOpen: (open: boolean) => void
  setPropsSidebarOpen: (open: boolean) => void
  togglePartsSidebar: () => void
  togglePropsSidebar: () => void
  toggleFocusMode: () => void
  clearStatusToast: () => void

  // Panel CRUD & Clipboard
  addPresetPanel: (
    role: Exclude<PanelRole, 'custom'>,
    options?: { dimensions?: PanelDimensions; quantity?: number }
  ) => void
  duplicatePanel: (id: string) => void
  deletePanel: (id: string) => void
  deleteSelectedPanels: () => void
  copySelected: () => void
  cutSelected: () => void
  pasteClipboard: () => void
  duplicateSelected: () => void
  deleteSelected: () => void

  // Panel properties
  updatePanelDimension: (id: string, key: keyof PanelDimensions, value: number) => void
  setPanelThickness: (id: string, thicknessCm: number) => void
  setPanelClearance: (id: string, clearanceCm: number) => void
  setPanelHasHandle: (id: string, hasHandle: boolean) => void
  setPanelHandle: (id: string, patch: Partial<PanelHandleConfig>) => void
  applyHandleToAllFronts: (sourceId: string) => void
  setPanelHingeSide: (id: string, side: HingeSide) => void
  togglePanelEdgeBanding: (id: string, side: EdgeSide) => void
  setPanelEdgeBanding: (id: string, edgeBanding: EdgeBanding) => void
  setPanelCornerRadius: (id: string, cornerRadius: CornerRadius) => void
  addPanelCutout: (id: string) => void
  updatePanelCutout: (id: string, cutoutId: string, patch: Partial<PanelCutout>) => void
  removePanelCutout: (id: string, cutoutId: string) => void
  rotatePanel90: (id: string, axis: Axis) => void
  setPanelMaterial: (id: string, materialId: MaterialId) => void
  setPanelMetalColor: (id: string, metalColor: MetalBaseColor) => void
  renamePanel: (id: string, name: string) => void

  // Auto-distribute shelves/dividers
  autoDistributeSelected: (axisOverride?: DistributeAxis) => void

  // Gizmo transform lifecycle
  beginTransformDrag: () => void
  setSnapFeedback: (feedback: SnapFeedback) => void
  endTransformDrag: (finalMove?: { id: string; position: Vec3 }) => void

  // History
  undo: () => void
  redo: () => void

  // Persistence
  currentDesignId: string | null
  currentDesignName: string
  savedDesigns: SavedDesign[]
  customTemplates: CustomTemplate[]
  lastSavedAt: number | null
  lastSaveKind: 'manual' | 'auto' | null
  autoSaveEnabled: boolean
  savedSignature: string
  hasUnsavedChanges: boolean
  toggleAutoSave: () => void
  performAutoSave: () => boolean
  newEmptyDesign: () => void
  resetToStarterTemplate: () => void
  applyFurnitureTemplate: (templateId: string, mode: 'replace' | 'append') => void
  saveAsCustomTemplate: (name: string, scope: 'all' | 'selected') => CustomTemplate | null
  applyCustomTemplate: (templateId: string, mode: 'replace' | 'append') => void
  removeCustomTemplate: (templateId: string) => void
  saveCurrentDesign: (name: string, asNew?: boolean) => SavedDesign
  importDesignProject: (data: {
    name: string
    panels: FurniturePanel[]
    guides: GuideLine[]
  }) => SavedDesign
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

export const useDesignStore = create<DesignState>((rawSet, get) => {
  const set: typeof rawSet = (partial, replace) => {
    const resolved =
      typeof partial === 'function'
        ? (partial as (state: DesignState) => Partial<DesignState> | DesignState)(get())
        : partial

    if (
      resolved &&
      typeof resolved === 'object' &&
      ('panels' in resolved || 'guides' in resolved) &&
      !('hasUnsavedChanges' in resolved)
    ) {
      const curr = get()
      const nextPanels =
        'panels' in resolved && resolved.panels !== undefined ? resolved.panels : curr.panels
      const nextGuides =
        'guides' in resolved && resolved.guides !== undefined ? resolved.guides : curr.guides
      const sig =
        'savedSignature' in resolved && typeof resolved.savedSignature === 'string'
          ? resolved.savedSignature
          : curr.savedSignature
      const dirty = computeDesignSignature(nextPanels, nextGuides) !== sig
      const enriched = { ...resolved, hasUnsavedChanges: dirty }
      if (replace) {
        rawSet(enriched as DesignState, true)
      } else {
        rawSet(enriched)
      }
      return
    }

    if (replace) {
      rawSet(resolved as DesignState, true)
    } else {
      rawSet(resolved)
    }
  }

  return {
  panels: [],
  guides: [],
  guidesVisible: true,
  selectedGuideId: null,

  selectedPanelId: null,
  selectedPanelIds: [],
  multiSelectMode: false,
  clipboard: [],

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
  isExporting: false,
  exportMode: null,
  renderMode: 'normal',
  exportRequestTick: 0,
  partsSidebarOpen: initialUiPrefs.partsSidebarOpen,
  propsSidebarOpen: initialUiPrefs.propsSidebarOpen,
  focusMode: false,
  preFocusPartsOpen: initialUiPrefs.partsSidebarOpen,
  preFocusPropsOpen: initialUiPrefs.propsSidebarOpen,
  statusToast: null,

  cameraPreset: 'perspective',
  cameraRequestTick: 0,
  cameraFocusTarget: null,
  cameraFocusTick: 0,

  past: [],
  future: [],
  dragSnapshot: null,

  currentDesignId: null,
  currentDesignName: 'تصميم جديد',
  savedDesigns: initialSavedDesigns,
  customTemplates: loadCustomTemplates(),
  lastSavedAt: null,
  lastSaveKind: null,
  autoSaveEnabled: initialUiPrefs.autoSaveEnabled,
  savedSignature: EMPTY_DESIGN_SIGNATURE,
  hasUnsavedChanges: false,

  selectPanel: (id, additive = false) => {
    const { focusMode, partsSidebarOpen } = get()
    if (!id) {
      if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: false })
      set({
        selectedPanelId: null,
        selectedPanelIds: [],
        selectedGuideId: null,
        propsSidebarOpen: false,
      })
      return
    }
    const { multiSelectMode, selectedPanelIds } = get()
    if (additive || multiSelectMode) {
      const exists = selectedPanelIds.includes(id)
      const nextIds = exists
        ? selectedPanelIds.filter((x) => x !== id)
        : [...selectedPanelIds, id]
      const nextPropsOpen = focusMode ? false : nextIds.length > 0
      if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: nextPropsOpen })
      set({
        selectedPanelIds: nextIds,
        selectedPanelId: nextIds[nextIds.length - 1] ?? null,
        selectedGuideId: null,
        propsSidebarOpen: nextPropsOpen,
      })
      return
    }
    const nextPropsOpen = !focusMode
    if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: nextPropsOpen })
    set({
      selectedPanelId: id,
      selectedPanelIds: [id],
      selectedGuideId: null,
      propsSidebarOpen: nextPropsOpen,
    })
  },

  togglePanelSelection: (id) => {
    const { selectedPanelIds, focusMode, partsSidebarOpen } = get()
    const exists = selectedPanelIds.includes(id)
    const nextIds = exists
      ? selectedPanelIds.filter((x) => x !== id)
      : [...selectedPanelIds, id]
    const nextPropsOpen = focusMode ? false : nextIds.length > 0
    if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: nextPropsOpen })
    set({
      selectedPanelIds: nextIds,
      selectedPanelId: nextIds[nextIds.length - 1] ?? null,
      selectedGuideId: null,
      propsSidebarOpen: nextPropsOpen,
    })
  },

  setMultiSelectMode: (enabled) => set({ multiSelectMode: enabled }),

  selectAllByRole: (roles) => {
    const { panels, focusMode, partsSidebarOpen } = get()
    const matching = panels.filter((p) => roles.includes(p.role)).map((p) => p.id)
    const nextPropsOpen = focusMode ? false : matching.length > 0
    if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: nextPropsOpen })
    set({
      selectedPanelIds: matching,
      selectedPanelId: matching[matching.length - 1] ?? null,
      selectedGuideId: null,
      multiSelectMode: matching.length > 1,
      propsSidebarOpen: nextPropsOpen,
    })
  },

  clearSelection: () => {
    const { focusMode, partsSidebarOpen } = get()
    if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: false })
    set({
      selectedPanelId: null,
      selectedPanelIds: [],
      selectedGuideId: null,
      propsSidebarOpen: false,
    })
  },

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
      draftGuideDistanceCm: edge ? 30 : get().draftGuideDistanceCm,
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

  triggerExportImage: (mode) =>
    set((state) => ({
      isExporting: true,
      exportMode: mode,
      renderMode: mode === 'sketch' ? 'sketch' : 'normal',
      exportRequestTick: state.exportRequestTick + 1,
    })),

  finishExportImage: (success, customMessage) =>
    set({
      isExporting: false,
      exportMode: null,
      renderMode: 'normal',
      statusToast: success
        ? (customMessage ?? 'تم حفظ الصورة بنجاح')
        : 'تعذر تصدير الصورة',
    }),

  setPartsSidebarOpen: (open) => {
    const { propsSidebarOpen } = get()
    saveUiPreferences({ partsSidebarOpen: open, propsSidebarOpen })
    set({ partsSidebarOpen: open, focusMode: open || propsSidebarOpen ? false : get().focusMode })
  },

  setPropsSidebarOpen: (open) => {
    const { partsSidebarOpen } = get()
    saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: open })
    set({ propsSidebarOpen: open, focusMode: partsSidebarOpen || open ? false : get().focusMode })
  },

  togglePartsSidebar: () => {
    const next = !get().partsSidebarOpen
    const { propsSidebarOpen } = get()
    saveUiPreferences({ partsSidebarOpen: next, propsSidebarOpen })
    set({ partsSidebarOpen: next, focusMode: false })
  },

  togglePropsSidebar: () => {
    const next = !get().propsSidebarOpen
    const { partsSidebarOpen } = get()
    saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: next })
    set({ propsSidebarOpen: next, focusMode: false })
  },

  toggleFocusMode: () => {
    const {
      focusMode,
      partsSidebarOpen,
      propsSidebarOpen,
      preFocusPartsOpen,
      preFocusPropsOpen,
      selectedPanelIds,
    } = get()
    if (!focusMode) {
      set({
        focusMode: true,
        preFocusPartsOpen: partsSidebarOpen,
        preFocusPropsOpen: propsSidebarOpen,
        partsSidebarOpen: false,
        propsSidebarOpen: false,
      })
    } else {
      const nextProps = preFocusPropsOpen || selectedPanelIds.length > 0
      saveUiPreferences({
        partsSidebarOpen: preFocusPartsOpen,
        propsSidebarOpen: nextProps,
      })
      set({
        focusMode: false,
        partsSidebarOpen: preFocusPartsOpen,
        propsSidebarOpen: nextProps,
      })
    }
  },

  clearStatusToast: () => set({ statusToast: null }),

  addPresetPanel: (role, options) => {
    const preset = ALL_PRESETS.find((p) => p.role === role)
    if (!preset) return

    const { panels, guides, past } = get()
    const countOfRole = panels.filter((p) => p.role === role).length

    const dims: PanelDimensions = {
      width: clampDim(options?.dimensions?.width ?? preset.dimensions.width),
      height: clampDim(options?.dimensions?.height ?? preset.dimensions.height),
      depth: clampDim(options?.dimensions?.depth ?? preset.dimensions.depth),
    }
    const quantity = Math.min(20, Math.max(1, Math.round(options?.quantity ?? 1)))

    const [, hy] = getWorldHalfExtents(dims, [0, 0, 0])

    let basePosition: Vec3
    if (preset.defaultPosition) {
      const shiftX = role === 'hinged_door' && countOfRole % 2 === 1 ? -25 : 0
      const shiftY = role === 'drawer' ? countOfRole * (dims.height + 1) : 0
      const shiftXSliding = role === 'sliding_door' && countOfRole % 2 === 1 ? 24 : 0
      basePosition = [
        roundTo(preset.defaultPosition[0] + shiftX + shiftXSliding, 2),
        roundTo(Math.max(hy, preset.defaultPosition[1] + shiftY), 2),
        preset.defaultPosition[2],
      ]
    } else {
      const offsetStep = (panels.length % 4) * 8
      const baseZ = role === 'back' ? -25 : offsetStep
      const baseY = role === 'horizontal' && panels.length === 0 ? Math.max(hy, 40) : hy
      basePosition = [offsetStep, roundTo(baseY, 2), baseZ]
    }

    const createdPanels: FurniturePanel[] = []
    for (let i = 0; i < quantity; i += 1) {
      let pos: Vec3 = [...basePosition]
      if (i > 0) {
        if (role === 'shelf') {
          pos = [basePosition[0], roundTo(basePosition[1] + i * (dims.height + 18), 2), basePosition[2]]
        } else if (role === 'drawer') {
          pos = [basePosition[0], roundTo(basePosition[1] + i * (dims.height + 1), 2), basePosition[2]]
        } else if (preset.thicknessAxis === 'x') {
          pos = [
            roundTo(basePosition[0] + i * Math.max(dims.width + 12, 16), 2),
            basePosition[1],
            basePosition[2],
          ]
        } else if (preset.thicknessAxis === 'y') {
          pos = [
            basePosition[0],
            basePosition[1],
            roundTo(basePosition[2] + i * Math.min(Math.max(dims.depth + 8, 14), 45), 2),
          ]
        } else {
          pos = [
            roundTo(basePosition[0] + i * Math.max(dims.width + 4, 24), 2),
            basePosition[1],
            basePosition[2],
          ]
        }
      }

      createdPanels.push({
        id: createId('panel'),
        name: `${preset.shortLabel} ${countOfRole + i + 1}`,
        role: preset.role,
        category: preset.category,
        dimensions: { ...dims },
        position: pos,
        rotation: [0, 0, 0],
        thicknessAxis: preset.thicknessAxis,
        materialId: preset.defaultMaterial,
        edgeBanding: getDefaultEdgeBanding(preset.role),
        ...(preset.clearanceCm !== undefined ? { clearanceCm: preset.clearanceCm } : {}),
        ...(preset.hasHandle !== undefined ? { hasHandle: preset.hasHandle } : {}),
        ...(preset.hingeSide !== undefined ? { hingeSide: preset.hingeSide } : {}),
        ...(preset.metalColor !== undefined ? { metalColor: preset.metalColor } : {}),
      })
    }

    const createdIds = createdPanels.map((p) => p.id)
    const nextPanels = [...panels, ...createdPanels]
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      toolMode: 'select',
      selectedPanelId: createdIds[createdIds.length - 1] ?? null,
      selectedPanelIds: createdIds,
      selectedGuideId: null,
      propsSidebarOpen: !get().focusMode,
      interfacesHidden: preset.category === 'front' ? false : get().interfacesHidden,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast:
        quantity === 1
          ? `تم إضافة ${createdPanels[0].name}`
          : `تم إضافة ${quantity} × ${preset.shortLabel}`,
    })
  },

  duplicatePanel: (id) => {
    const { panels, guides, past } = get()
    const source = panels.find((p) => p.id === id)
    if (!source) return

    const [hx] = getWorldHalfExtents(source.dimensions, source.rotation)
    const offset = Math.max(hx * 2 + 2, 10)

    const copy: FurniturePanel = {
      ...deepClone(source),
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
      propsSidebarOpen: nextSelectedIds.length > 0 && !get().focusMode,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  deleteSelectedPanels: () => {
    const { panels, guides, past, selectedPanelIds, focusMode, partsSidebarOpen } = get()
    if (selectedPanelIds.length === 0) return

    const nextPanels = panels.filter((p) => !selectedPanelIds.includes(p.id))
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)
    if (!focusMode) saveUiPreferences({ partsSidebarOpen, propsSidebarOpen: false })

    set({
      panels: nextPanels,
      selectedPanelIds: [],
      selectedPanelId: null,
      propsSidebarOpen: false,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  copySelected: () => {
    const { panels, selectedPanelIds } = get()
    if (selectedPanelIds.length === 0) return
    const selected = panels.filter((p) => selectedPanelIds.includes(p.id))
    if (selected.length === 0) return

    set({
      clipboard: deepClone(selected),
      statusToast:
        selected.length === 1
          ? `تم نسخ: ${selected[0].name}`
          : `تم نسخ ${selected.length} عناصر إلى الحافظة`,
    })
  },

  cutSelected: () => {
    const { panels, guides, past, selectedPanelIds } = get()
    if (selectedPanelIds.length === 0) return
    const selected = panels.filter((p) => selectedPanelIds.includes(p.id))
    if (selected.length === 0) return

    const nextPanels = panels.filter((p) => !selectedPanelIds.includes(p.id))
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      clipboard: deepClone(selected),
      panels: nextPanels,
      selectedPanelIds: [],
      selectedPanelId: null,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast:
        selected.length === 1
          ? `تم قص: ${selected[0].name}`
          : `تم قص ${selected.length} عناصر إلى الحافظة`,
    })
  },

  pasteClipboard: () => {
    const { clipboard, panels, guides, past } = get()
    if (clipboard.length === 0) return

    const pasted: FurniturePanel[] = clipboard.map((item) => ({
      ...deepClone(item),
      id: createId('panel'),
      name: item.name.endsWith('(نسخة)') ? item.name : `${item.name} (نسخة)`,
      position: [roundTo(item.position[0] + 5, 2), item.position[1], item.position[2]],
    }))

    const pastedIds = pasted.map((p) => p.id)
    const nextPanels = [...panels, ...pasted]
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      clipboard: deepClone(pasted),
      toolMode: 'select',
      selectedPanelIds: pastedIds,
      selectedPanelId: pastedIds[pastedIds.length - 1] ?? null,
      selectedGuideId: null,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast:
        pasted.length === 1
          ? `تم لصق: ${pasted[0].name}`
          : `تم لصق ${pasted.length} عناصر`,
    })
  },

  duplicateSelected: () => {
    const { panels, guides, past, selectedPanelIds } = get()
    if (selectedPanelIds.length === 0) return
    const selected = panels.filter((p) => selectedPanelIds.includes(p.id))
    if (selected.length === 0) return

    const copies: FurniturePanel[] = selected.map((item) => ({
      ...deepClone(item),
      id: createId('panel'),
      name: item.name.endsWith('(نسخة)') ? item.name : `${item.name} (نسخة)`,
      position: [roundTo(item.position[0] + 5, 2), item.position[1], item.position[2]],
    }))

    const copyIds = copies.map((c) => c.id)
    const nextPanels = [...panels, ...copies]
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: copyIds,
      selectedPanelId: copyIds[copyIds.length - 1] ?? null,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  deleteSelected: () => {
    get().deleteSelectedPanels()
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

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const current = getEffectivePanelHandle(p)
      const fallbackType = p.role === 'sliding_door' ? 'recessed' : 'bar'
      const nextHandle: PanelHandleConfig = {
        ...current,
        type: hasHandle ? (current.type === 'none' ? fallbackType : current.type) : 'none',
      }
      return { ...p, hasHandle, handle: nextHandle }
    })
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  setPanelHandle: (id, patch) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const current = getEffectivePanelHandle(p)
      const nextHandle: PanelHandleConfig = {
        ...current,
        ...patch,
      }
      return {
        ...p,
        handle: nextHandle,
        hasHandle: nextHandle.type !== 'none',
      }
    })
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  applyHandleToAllFronts: (sourceId) => {
    const { panels, guides, past } = get()
    const source = panels.find((p) => p.id === sourceId)
    if (!source) return

    const sourceHandle = getEffectivePanelHandle(source)
    let updatedCount = 0

    const nextPanels = panels.map((p) => {
      if (!isInterfaceRole(p.role)) return p
      updatedCount += 1

      if (sourceHandle.type === 'none') {
        return {
          ...p,
          hasHandle: false,
          handle: { ...sourceHandle, type: 'none' as const },
        }
      }

      if (p.role === 'drawer') {
        return {
          ...p,
          hasHandle: true,
          handle: {
            ...sourceHandle,
            position: sourceHandle.position === 'top' ? ('top' as const) : ('center' as const),
            orientation: 'horizontal' as const,
          },
        }
      }

      const doorPosition =
        sourceHandle.position === 'top' ||
        sourceHandle.position === 'bottom' ||
        sourceHandle.position === 'center'
          ? sourceHandle.position
          : p.hingeSide === 'left'
            ? ('right' as const)
            : ('left' as const)

      return {
        ...p,
        hasHandle: true,
        handle: {
          ...sourceHandle,
          position: doorPosition,
        },
      }
    })

    if (updatedCount === 0) return

    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)
    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: 'تم تطبيق المقبض على كل الضلف والأدراج',
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

  setPanelCornerRadius: (id, cornerRadius) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const clamped = clampCornerRadius(cornerRadius, target.dimensions, target.thicknessAxis)
    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, cornerRadius: clamped } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  addPanelCutout: (id) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const newCutout: PanelCutout = {
      id: createId('cutout'),
      shape: 'circle',
      x: 0,
      y: 0,
      width: 6,
      height: 6,
      diameter: 6,
    }

    const nextPanels = panels.map((p) =>
      p.id === id ? { ...p, cutouts: [...(p.cutouts ?? []), newCutout] } : p
    )
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  updatePanelCutout: (id, cutoutId, patch) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) => {
      if (p.id !== id) return p
      const nextCutouts = (p.cutouts ?? []).map((c) =>
        c.id === cutoutId ? { ...c, ...patch } : c
      )
      return { ...p, cutouts: nextCutouts }
    })
    saveAutosave(nextPanels, guides, get().currentDesignName, get().currentDesignId)

    set({
      panels: nextPanels,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  removePanelCutout: (id, cutoutId) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target) return

    const nextPanels = panels.map((p) =>
      p.id === id
        ? { ...p, cutouts: (p.cutouts ?? []).filter((c) => c.id !== cutoutId) }
        : p
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

  setPanelMetalColor: (id, metalColor) => {
    const { panels, guides, past } = get()
    const target = panels.find((p) => p.id === id)
    if (!target || target.metalColor === metalColor) return

    const nextPanels = panels.map((p) => (p.id === id ? { ...p, metalColor } : p))
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

  setSnapFeedback: (feedback) => {
    const prev = get().snapFeedback
    if (
      prev.x === feedback.x &&
      prev.y === feedback.y &&
      prev.z === feedback.z &&
      prev.floor === feedback.floor &&
      Boolean(prev.guide) === Boolean(feedback.guide)
    ) {
      return
    }
    set({ snapFeedback: feedback })
  },

  endTransformDrag: (finalMove) => {
    const { dragSnapshot, panels, guides, past, currentDesignName, currentDesignId } = get()
    const nextPanels = finalMove
      ? panels.map((p) => (p.id === finalMove.id ? { ...p, position: finalMove.position } : p))
      : panels

    const changed =
      dragSnapshot !== null &&
      JSON.stringify(dragSnapshot.panels) !== JSON.stringify(nextPanels)

    if (changed) {
      saveAutosave(nextPanels, guides, currentDesignName, currentDesignId)
    }

    set({
      panels: nextPanels,
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
      panels: deepClone(previous.panels),
      guides: deepClone(previous.guides),
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
      panels: deepClone(next.panels),
      guides: deepClone(next.guides),
      past: nextPast,
      future: nextFuture,
      selectedPanelIds: nextSelectedIds,
      selectedPanelId: nextSelectedIds[nextSelectedIds.length - 1] ?? null,
      selectedGuideId: guideStillExists ? selectedGuideId : null,
    })
  },

  toggleAutoSave: () => {
    const next = !get().autoSaveEnabled
    saveUiPreferences({ autoSaveEnabled: next })
    set({
      autoSaveEnabled: next,
      statusToast: next ? 'تم تفعيل الحفظ التلقائي كل 5 دقائق' : 'تم إيقاف الحفظ التلقائي',
    })
  },

  performAutoSave: () => {
    const {
      autoSaveEnabled,
      panels,
      guides,
      hasUnsavedChanges,
      currentDesignId,
      currentDesignName,
    } = get()

    if (!autoSaveEnabled || panels.length === 0 || !hasUnsavedChanges) {
      return false
    }

    const thumbnail = captureSceneThumbnail()
    const isExisting = currentDesignId !== null

    let targetName = currentDesignName
    if (!isExisting) {
      let stamp = ''
      try {
        stamp = new Intl.DateTimeFormat('ar-EG', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date())
      } catch {
        stamp = new Date().toLocaleTimeString()
      }
      targetName = `مسودة تلقائية - ${stamp}`
    }

    const { design, allDesigns } = saveDesignByName(
      targetName,
      panels,
      guides,
      isExisting ? currentDesignId : null,
      thumbnail,
      !isExisting
    )
    const nextSignature = computeDesignSignature(panels, guides)
    saveAutosave(panels, guides, design.name, design.id)

    set({
      savedDesigns: allDesigns,
      currentDesignId: design.id,
      currentDesignName: design.name,
      lastSavedAt: design.updatedAt,
      lastSaveKind: 'auto',
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
    })
    return true
  },

  newEmptyDesign: () => {
    const { panels, guides, past } = get()
    const nextSignature = computeDesignSignature([], [])
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
      lastSavedAt: null,
      lastSaveKind: null,
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
      past: panels.length > 0 || guides.length > 0 ? pushPast(past, panels, guides) : past,
      future: [],
    })
  },

  resetToStarterTemplate: () => {
    const { panels, guides, past } = get()
    const starter = createStarterPanels()
    const nextSignature = computeDesignSignature(starter, [])
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
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
      past: pushPast(past, panels, guides),
      future: [],
    })
  },

  applyFurnitureTemplate: (templateId, mode) => {
    const template = FURNITURE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    const { panels, guides, past, currentDesignName, currentDesignId, focusMode, cameraFocusTick } =
      get()
    const rawBlueprints = template.buildPanels()
    const span = Math.max(
      template.dimensions.width,
      template.dimensions.height,
      template.dimensions.depth,
      50
    )
    const camDist = Math.min(460, Math.max(135, span * 1.65))
    const targetY = roundTo(Math.max(20, template.dimensions.height * 0.45), 1)
    const camY = roundTo(Math.max(targetY + 35, template.dimensions.height + 38, camDist * 0.46), 1)

    if (mode === 'replace' || panels.length === 0) {
      const nextPanels: FurniturePanel[] = rawBlueprints.map((bp) => ({
        ...deepClone(bp),
        id: createId('panel'),
      }))
      const nextSignature = computeDesignSignature(nextPanels, [])
      saveAutosave(nextPanels, [], template.name, null)

      set({
        panels: nextPanels,
        guides: [],
        selectedPanelId: null,
        selectedPanelIds: [],
        selectedGuideId: null,
        activeReferenceEdge: null,
        propsSidebarOpen: false,
        currentDesignId: null,
        currentDesignName: template.name,
        savedSignature: nextSignature,
        hasUnsavedChanges: false,
        past: panels.length > 0 || guides.length > 0 ? pushPast(past, panels, guides) : past,
        future: [],
        cameraFocusTarget: {
          position: [roundTo(camDist * 0.58, 1), camY, roundTo(camDist * 0.78, 1)],
          target: [0, targetY, 0],
        },
        cameraFocusTick: cameraFocusTick + 1,
        statusToast: `تم إضافة ${template.name}`,
      })
      return
    }

    // الإضافة بجانب القطع الموجودة لتصميم وحدات مجمعة
    const existingOverall = computeOverallDimensions(panels)
    const offsetX = existingOverall
      ? roundTo(existingOverall.maxX + 15 + template.dimensions.width / 2, 1)
      : 0

    const appendedPanels: FurniturePanel[] = rawBlueprints.map((bp) => ({
      ...deepClone(bp),
      id: createId('panel'),
      position: [
        roundTo(bp.position[0] + offsetX, 2),
        bp.position[1],
        bp.position[2],
      ],
    }))

    const appendedIds = appendedPanels.map((p) => p.id)
    const nextPanels = [...panels, ...appendedPanels]
    saveAutosave(nextPanels, guides, currentDesignName, currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: appendedIds,
      selectedPanelId: appendedIds[appendedIds.length - 1] ?? null,
      selectedGuideId: null,
      propsSidebarOpen: focusMode ? false : appendedIds.length > 0,
      past: pushPast(past, panels, guides),
      future: [],
      cameraFocusTarget: {
        position: [roundTo(offsetX + camDist * 0.58, 1), camY, roundTo(camDist * 0.78, 1)],
        target: [roundTo(offsetX, 1), targetY, 0],
      },
      cameraFocusTick: cameraFocusTick + 1,
      statusToast: `تم إضافة "${template.name}" بجانب التصميم`,
    })
  },

  saveAsCustomTemplate: (name, scope) => {
    const { panels, selectedPanelIds } = get()
    const targetPanels =
      scope === 'selected'
        ? panels.filter((p) => selectedPanelIds.includes(p.id))
        : panels

    if (targetPanels.length === 0) return null

    const thumbnail = captureSceneThumbnail()
    const saved = saveCustomTemplate(name, targetPanels, thumbnail)
    if (!saved) return null

    set({
      customTemplates: saved.allTemplates,
      statusToast: `تم حفظ القالب المخصص: ${saved.template.name}`,
    })
    return saved.template
  },

  applyCustomTemplate: (templateId, mode) => {
    const {
      customTemplates,
      panels,
      guides,
      past,
      currentDesignName,
      currentDesignId,
      focusMode,
      cameraFocusTick,
    } = get()
    const template = customTemplates.find((t) => t.id === templateId)
    if (!template) return

    const span = Math.max(
      template.dimensions.width,
      template.dimensions.height,
      template.dimensions.depth,
      50
    )
    const camDist = Math.min(460, Math.max(135, span * 1.65))
    const targetY = roundTo(Math.max(20, template.dimensions.height * 0.45), 1)
    const camY = roundTo(Math.max(targetY + 35, template.dimensions.height + 38, camDist * 0.46), 1)

    if (mode === 'replace' || panels.length === 0) {
      const nextPanels: FurniturePanel[] = template.panels.map((bp) => ({
        ...deepClone(bp),
        id: createId('panel'),
      }))
      const nextSignature = computeDesignSignature(nextPanels, [])
      saveAutosave(nextPanels, [], template.name, null)

      set({
        panels: nextPanels,
        guides: [],
        selectedPanelId: null,
        selectedPanelIds: [],
        selectedGuideId: null,
        activeReferenceEdge: null,
        propsSidebarOpen: false,
        currentDesignId: null,
        currentDesignName: template.name,
        savedSignature: nextSignature,
        hasUnsavedChanges: false,
        past: panels.length > 0 || guides.length > 0 ? pushPast(past, panels, guides) : past,
        future: [],
        cameraFocusTarget: {
          position: [roundTo(camDist * 0.58, 1), camY, roundTo(camDist * 0.78, 1)],
          target: [0, targetY, 0],
        },
        cameraFocusTick: cameraFocusTick + 1,
        statusToast: `تم إضافة ${template.name}`,
      })
      return
    }

    const existingOverall = computeOverallDimensions(panels)
    const offsetX = existingOverall
      ? roundTo(existingOverall.maxX + 15 + template.dimensions.width / 2, 1)
      : 0

    const appendedPanels: FurniturePanel[] = template.panels.map((bp) => ({
      ...deepClone(bp),
      id: createId('panel'),
      position: [
        roundTo(bp.position[0] + offsetX, 2),
        bp.position[1],
        bp.position[2],
      ],
    }))

    const appendedIds = appendedPanels.map((p) => p.id)
    const nextPanels = [...panels, ...appendedPanels]
    saveAutosave(nextPanels, guides, currentDesignName, currentDesignId)

    set({
      panels: nextPanels,
      selectedPanelIds: appendedIds,
      selectedPanelId: appendedIds[appendedIds.length - 1] ?? null,
      selectedGuideId: null,
      propsSidebarOpen: focusMode ? false : appendedIds.length > 0,
      past: pushPast(past, panels, guides),
      future: [],
      cameraFocusTarget: {
        position: [roundTo(offsetX + camDist * 0.58, 1), camY, roundTo(camDist * 0.78, 1)],
        target: [roundTo(offsetX, 1), targetY, 0],
      },
      cameraFocusTick: cameraFocusTick + 1,
      statusToast: `تم إضافة "${template.name}" بجانب التصميم`,
    })
  },

  removeCustomTemplate: (templateId) => {
    const nextList = deleteCustomTemplate(templateId)
    set({
      customTemplates: nextList,
      statusToast: 'تم حذف القالب المخصص',
    })
  },

  saveCurrentDesign: (name, asNew = false) => {
    const { panels, guides, currentDesignId } = get()
    const thumbnail = captureSceneThumbnail()
    const { design, allDesigns } = saveDesignByName(
      name,
      panels,
      guides,
      asNew ? null : currentDesignId,
      thumbnail,
      asNew
    )
    const nextSignature = computeDesignSignature(panels, guides)
    saveAutosave(panels, guides, design.name, design.id)
    set({
      savedDesigns: allDesigns,
      currentDesignId: design.id,
      currentDesignName: design.name,
      lastSavedAt: design.updatedAt,
      lastSaveKind: 'manual',
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
      statusToast: asNew ? `تم حفظ نسخة جديدة: ${design.name}` : `تم حفظ التعديلات: ${design.name}`,
    })
    return design
  },

  importDesignProject: (data) => {
    const { panels, guides, past } = get()
    const cleanPanels = sanitizePanels(deepClone(data.panels))
    const cleanGuides = sanitizeGuides(deepClone(data.guides))
    const thumbnail = captureSceneThumbnail()
    const { design, allDesigns } = saveDesignByName(
      data.name,
      cleanPanels,
      cleanGuides,
      null,
      thumbnail,
      true
    )
    const nextSignature = computeDesignSignature(cleanPanels, cleanGuides)
    saveAutosave(cleanPanels, cleanGuides, design.name, design.id)

    set({
      panels: cleanPanels,
      guides: cleanGuides,
      savedDesigns: allDesigns,
      selectedPanelId: null,
      selectedPanelIds: [],
      selectedGuideId: null,
      activeReferenceEdge: null,
      currentDesignId: design.id,
      currentDesignName: design.name,
      lastSavedAt: design.updatedAt,
      lastSaveKind: 'manual',
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: `تم استيراد وفتح المشروع: ${design.name}`,
    })

    return design
  },

  loadDesign: (id) => {
    const { savedDesigns, panels, guides, past } = get()
    const found = savedDesigns.find((d) => d.id === id)
    if (!found) return

    const loadedPanels = sanitizePanels(deepClone(found.panels))
    const loadedGuides = sanitizeGuides(deepClone(found.guides ?? []))
    const nextSignature = computeDesignSignature(loadedPanels, loadedGuides)
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
      lastSavedAt: found.updatedAt || null,
      lastSaveKind: 'manual',
      savedSignature: nextSignature,
      hasUnsavedChanges: false,
      past: pushPast(past, panels, guides),
      future: [],
      statusToast: `تم فتح المشروع: ${found.name}`,
    })
  },

  removeSavedDesign: (id) => {
    const nextList = deleteSavedDesign(id)
    set((state) => ({
      savedDesigns: nextList,
      currentDesignId: state.currentDesignId === id ? null : state.currentDesignId,
      hasUnsavedChanges: state.currentDesignId === id ? true : state.hasUnsavedChanges,
    }))
  },
  }
})
