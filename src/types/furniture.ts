export type PanelRole = 'horizontal' | 'vertical' | 'shelf' | 'back' | 'custom'

export type MaterialId =
  | 'white'
  | 'black'
  | 'grey'
  | 'light_oak'
  | 'dark_walnut'

export type CameraPreset = 'perspective' | 'front' | 'side' | 'top'

export type Axis = 'x' | 'y' | 'z'

export type Vec3 = [number, number, number]

export interface PanelDimensions {
  /** العرض على المحور X بالسنتيمتر */
  width: number
  /** الارتفاع على المحور Y بالسنتيمتر */
  height: number
  /** العمق على المحور Z بالسنتيمتر */
  depth: number
}

export interface FurniturePanel {
  id: string
  name: string
  role: PanelRole
  dimensions: PanelDimensions
  /** مركز اللوح في الفضاء ثلاثي الأبعاد بالسنتيمتر (الأرضية Y = 0) */
  position: Vec3
  /** زوايا الدوران بالراديان [rx, ry, rz] */
  rotation: Vec3
  /** المحور المحلي الذي يمثل سُمك اللوح (18 مم / 6 مم) */
  thicknessAxis: Axis
  materialId: MaterialId
}

export interface SavedDesign {
  id: string
  name: string
  updatedAt: number
  panels: FurniturePanel[]
}

export interface SnapFeedback {
  x: boolean
  y: boolean
  z: boolean
  floor: boolean
}
