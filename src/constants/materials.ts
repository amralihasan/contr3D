import type { MaterialId } from '../types/furniture'

export interface MaterialSpec {
  id: MaterialId
  label: string
  swatch: string
  color: string
  grainColor?: string
  roughness: number
  metalness: number
  hasWoodGrain: boolean
}

export const MATERIALS: Record<MaterialId, MaterialSpec> = {
  white: {
    id: 'white',
    label: 'أبيض',
    swatch: '#f5f5f4',
    color: '#f2f1ed',
    roughness: 0.42,
    metalness: 0.02,
    hasWoodGrain: false,
  },
  black: {
    id: 'black',
    label: 'أسود',
    swatch: '#1c1f24',
    color: '#1e2228',
    roughness: 0.54,
    metalness: 0.04,
    hasWoodGrain: false,
  },
  grey: {
    id: 'grey',
    label: 'رمادي',
    swatch: '#94a3b8',
    color: '#9199a4',
    roughness: 0.46,
    metalness: 0.03,
    hasWoodGrain: false,
  },
  light_oak: {
    id: 'light_oak',
    label: 'خشب أرو فاتح',
    swatch: '#d4a973',
    color: '#d8b482',
    grainColor: '#b5844c',
    roughness: 0.64,
    metalness: 0.0,
    hasWoodGrain: true,
  },
  dark_walnut: {
    id: 'dark_walnut',
    label: 'خشب جوز غامق',
    swatch: '#5e3c26',
    color: '#613f28',
    grainColor: '#3a2214',
    roughness: 0.6,
    metalness: 0.0,
    hasWoodGrain: true,
  },
}

export const MATERIAL_LIST: MaterialSpec[] = Object.values(MATERIALS)
