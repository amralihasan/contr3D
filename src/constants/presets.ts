import type {
  Axis,
  HingeSide,
  MaterialId,
  PanelCategory,
  PanelDimensions,
  PanelRole,
} from '../types/furniture'

export interface PanelPreset {
  role: Exclude<PanelRole, 'custom'>
  category: PanelCategory
  label: string
  shortLabel: string
  subtitle: string
  dimensions: PanelDimensions
  thicknessAxis: Axis
  defaultMaterial: MaterialId
  defaultPosition?: [number, number, number]
  clearanceCm?: number
  hasHandle?: boolean
  hingeSide?: HingeSide
}

export const PANEL_PRESETS: PanelPreset[] = [
  {
    role: 'horizontal',
    category: 'panel',
    label: 'قرصة / لوح أفقي',
    shortLabel: 'قرصة أفقية',
    subtitle: '100 × 40 سم · سُمك 1.8 سم',
    dimensions: { width: 100, height: 1.8, depth: 40 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'vertical',
    category: 'panel',
    label: 'جنب / لوح رأسي',
    shortLabel: 'جنب رأسي',
    subtitle: '40 × 80 سم · سُمك 1.8 سم',
    dimensions: { width: 1.8, height: 80, depth: 40 },
    thicknessAxis: 'x',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'shelf',
    category: 'panel',
    label: 'رف داخلي',
    shortLabel: 'رف داخلي',
    subtitle: '96.4 × 38 سم · سُمك 1.8 سم',
    dimensions: { width: 96.4, height: 1.8, depth: 38 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'divider',
    category: 'panel',
    label: 'قاطع رأسي',
    shortLabel: 'قاطع رأسي',
    subtitle: '38 × 76.4 سم · سُمك 1.8 سم',
    dimensions: { width: 1.8, height: 76.4, depth: 38 },
    thicknessAxis: 'x',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'back',
    category: 'panel',
    label: 'ضهر',
    shortLabel: 'ضهر',
    subtitle: '100 × 80 سم · سُمك 0.6 سم',
    dimensions: { width: 100, height: 80, depth: 0.6 },
    thicknessAxis: 'z',
    defaultMaterial: 'white',
  },
]

export const INTERFACE_PRESETS: PanelPreset[] = [
  {
    role: 'hinged_door',
    category: 'front',
    label: 'ضلفة مفصلية',
    shortLabel: 'ضلفة مفصلية',
    subtitle: '50 × 80 سم · خلوص 2 مم',
    dimensions: { width: 50, height: 80, depth: 1.8 },
    thicknessAxis: 'z',
    defaultMaterial: 'white',
    defaultPosition: [25, 40, 21.1],
    clearanceCm: 0.2,
    hasHandle: true,
    hingeSide: 'right',
  },
  {
    role: 'sliding_door',
    category: 'front',
    label: 'ضلفة جرار',
    shortLabel: 'ضلفة جرار',
    subtitle: '50 × 78 سم · خلوص 2 مم',
    dimensions: { width: 50, height: 78, depth: 1.8 },
    thicknessAxis: 'z',
    defaultMaterial: 'light_oak',
    defaultPosition: [-24, 40, 21.1],
    clearanceCm: 0.2,
    hasHandle: true,
    hingeSide: 'left',
  },
  {
    role: 'drawer',
    category: 'front',
    label: 'درج كامل',
    shortLabel: 'درج',
    subtitle: '96 × 20 × 36 سم · خلوص 2 مم',
    dimensions: { width: 96, height: 20, depth: 36 },
    thicknessAxis: 'z',
    defaultMaterial: 'white',
    defaultPosition: [0, 12, 2],
    clearanceCm: 0.2,
    hasHandle: true,
  },
]

export const BASE_PRESETS: PanelPreset[] = [
  {
    role: 'plinth_base',
    category: 'base',
    label: 'سوكلة / وزرة كونتر',
    shortLabel: 'سوكلة كونتر',
    subtitle: '100 × 36 سم · ارتفاع 10 سم',
    dimensions: { width: 100, height: 10, depth: 36 },
    thicknessAxis: 'y',
    defaultMaterial: 'dark_walnut',
    defaultPosition: [0, 5, -1],
  },
  {
    role: 'wood_legs',
    category: 'base',
    label: '4 رجول خشب مايلة',
    shortLabel: 'رجول خشب مايلة',
    subtitle: '96 × 36 سم · ارتفاع 15 سم',
    dimensions: { width: 96, height: 15, depth: 36 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
    defaultPosition: [0, 7.5, 0],
  },
  {
    role: 'metal_legs',
    category: 'base',
    label: '4 رجول معدن مستقيمة',
    shortLabel: 'رجول معدن',
    subtitle: '96 × 36 سم · ارتفاع 15 سم',
    dimensions: { width: 96, height: 15, depth: 36 },
    thicknessAxis: 'y',
    defaultMaterial: 'black',
    defaultPosition: [0, 7.5, 0],
  },
]

export const ALL_PRESETS: PanelPreset[] = [
  ...PANEL_PRESETS,
  ...INTERFACE_PRESETS,
  ...BASE_PRESETS,
]

export const THICKNESS_PRESETS = [
  { label: '18 مم', cm: 1.8 },
  { label: '6 مم', cm: 0.6 },
] as const

export const CLEARANCE_PRESETS = [
  { label: '2 مم', cm: 0.2 },
  { label: '3 مم', cm: 0.3 },
] as const

export const GRID_STEP_CM = 0.5
export const SNAP_THRESHOLD_CM = 2.5
export const MIN_PANEL_DIM_CM = 0.4
export const MAX_PANEL_DIM_CM = 400
export const MIN_CLEARANCE_CM = 0
export const MAX_CLEARANCE_CM = 2
