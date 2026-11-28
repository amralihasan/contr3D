import type {
  Axis,
  CameraPreset,
  HingeSide,
  MaterialId,
  MetalBaseColor,
  PanelCategory,
  PanelDimensions,
  PanelRole,
} from '../types/furniture'

export const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  perspective: { position: [145, 115, 175], target: [0, 40, 0] },
  front: { position: [0, 45, 225], target: [0, 45, 0] },
  side: { position: [225, 45, 0], target: [0, 45, 0] },
  top: { position: [0, 245, 0.1], target: [0, 0, 0] },
}

export interface PanelPreset {
  id?: string
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
  hasMirror?: boolean
  metalColor?: MetalBaseColor
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
    id: 'mirror_door',
    role: 'hinged_door',
    category: 'front',
    label: 'ضلفة مرايا',
    shortLabel: 'ضلفة مرايا',
    subtitle: '45 × 180 سم · مرايا + كونتر 1.8 سم',
    dimensions: { width: 45, height: 180, depth: 1.8 },
    thicknessAxis: 'z',
    defaultMaterial: 'light_oak',
    defaultPosition: [25, 90, 21.1],
    clearanceCm: 0.2,
    hasHandle: true,
    hingeSide: 'right',
    hasMirror: true,
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
    metalColor: 'matte_black',
  },
  {
    role: 'tv_short_legs',
    category: 'base',
    label: 'رجول تليفزيون قصيرة',
    shortLabel: 'رجول تليفزيون',
    subtitle: '120 × 35 سم · ارتفاع 5 سم (قُطر 4.5 سم)',
    dimensions: { width: 120, height: 5, depth: 35 },
    thicknessAxis: 'y',
    defaultMaterial: 'grey',
    defaultPosition: [0, 2.5, 0],
    metalColor: 'silver',
  },
  {
    role: 'plinth_recessed',
    category: 'base',
    label: 'سوكلة خشب غاطسة للدواليب',
    shortLabel: 'سوكلة غاطسة',
    subtitle: '100 × 36 سم · ارتفاع 10 سم (كونتر 18 مم)',
    dimensions: { width: 100, height: 10, depth: 36 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
    defaultPosition: [0, 5, -1],
  },
  {
    role: 'metal_frame',
    category: 'base',
    label: 'شاسيه معدن مستطيل',
    shortLabel: 'شاسيه معدن',
    subtitle: '120 × 38 سم · ارتفاع 18 سم (2.5×2.5 سم)',
    dimensions: { width: 120, height: 18, depth: 38 },
    thicknessAxis: 'y',
    defaultMaterial: 'black',
    defaultPosition: [0, 9, 0],
    metalColor: 'matte_black',
  },
  {
    role: 'metal_u_legs',
    category: 'base',
    label: 'رجول معدن حرف U',
    shortLabel: 'رجول معدن U',
    subtitle: '110 × 55 سم · ارتفاع 40 سم (مربع مغلق)',
    dimensions: { width: 110, height: 40, depth: 55 },
    thicknessAxis: 'y',
    defaultMaterial: 'black',
    defaultPosition: [0, 20, 0],
    metalColor: 'matte_black',
  },
  {
    role: 'metal_x_legs',
    category: 'base',
    label: 'قاعدة معدن حرف X',
    shortLabel: 'قاعدة معدن X',
    subtitle: '120 × 60 سم · ارتفاع 73 سم (بعارضة ربط)',
    dimensions: { width: 120, height: 73, depth: 60 },
    thicknessAxis: 'y',
    defaultMaterial: 'black',
    defaultPosition: [0, 36.5, 0],
    metalColor: 'matte_black',
  },
  {
    role: 'wood_pillars',
    category: 'base',
    label: 'قاعدة أعمدة أسطوانية مودرن',
    shortLabel: 'أعمدة خشب',
    subtitle: '100 × 40 سم · ارتفاع 40 سم',
    dimensions: { width: 100, height: 40, depth: 40 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
    defaultPosition: [0, 20, 0],
  },
  {
    role: 'wood_arch',
    category: 'base',
    label: 'قاعدة خشب مقوّسة (أرش)',
    shortLabel: 'قاعدة أرش',
    subtitle: '100 × 45 سم · ارتفاع 40 سم (سُمك 3.6 سم)',
    dimensions: { width: 100, height: 40, depth: 45 },
    thicknessAxis: 'x',
    defaultMaterial: 'light_oak',
    defaultPosition: [0, 20, 0],
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
export const SNAP_THRESHOLD_CM = 1.2
export const MIN_PANEL_DIM_CM = 0.4
export const MAX_PANEL_DIM_CM = 400
export const MIN_CLEARANCE_CM = 0
export const MAX_CLEARANCE_CM = 2
