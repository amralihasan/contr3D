import type { Axis, MaterialId, PanelDimensions, PanelRole } from '../types/furniture'

export interface PanelPreset {
  role: Exclude<PanelRole, 'custom'>
  label: string
  shortLabel: string
  subtitle: string
  dimensions: PanelDimensions
  thicknessAxis: Axis
  defaultMaterial: MaterialId
}

export const PANEL_PRESETS: PanelPreset[] = [
  {
    role: 'horizontal',
    label: 'قرصة / لوح أفقي',
    shortLabel: 'قرصة أفقية',
    subtitle: '100 × 40 سم · سُمك 1.8 سم',
    dimensions: { width: 100, height: 1.8, depth: 40 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'vertical',
    label: 'جنب / لوح رأسي',
    shortLabel: 'جنب رأسي',
    subtitle: '40 × 80 سم · سُمك 1.8 سم',
    dimensions: { width: 1.8, height: 80, depth: 40 },
    thicknessAxis: 'x',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'shelf',
    label: 'رف داخلي',
    shortLabel: 'رف داخلي',
    subtitle: '96.4 × 38 سم · سُمك 1.8 سم',
    dimensions: { width: 96.4, height: 1.8, depth: 38 },
    thicknessAxis: 'y',
    defaultMaterial: 'light_oak',
  },
  {
    role: 'back',
    label: 'ضهر',
    shortLabel: 'ضهر',
    subtitle: '100 × 80 سم · سُمك 0.6 سم',
    dimensions: { width: 100, height: 80, depth: 0.6 },
    thicknessAxis: 'z',
    defaultMaterial: 'white',
  },
]

export const THICKNESS_PRESETS = [
  { label: '18 مم', cm: 1.8 },
  { label: '6 مم', cm: 0.6 },
] as const

export const GRID_STEP_CM = 0.5
export const SNAP_THRESHOLD_CM = 2.5
export const MIN_PANEL_DIM_CM = 0.4
export const MAX_PANEL_DIM_CM = 400
