export type PanelCategory = 'panel' | 'front' | 'base'

export type PanelRole =
  | 'horizontal'
  | 'vertical'
  | 'shelf'
  | 'divider'
  | 'back'
  | 'hinged_door'
  | 'sliding_door'
  | 'drawer'
  | 'plinth_base'
  | 'wood_legs'
  | 'metal_legs'
  | 'custom'

export type MaterialId =
  | 'white'
  | 'black'
  | 'grey'
  | 'light_oak'
  | 'dark_walnut'

export type CameraPreset = 'perspective' | 'front' | 'side' | 'top'

export type Axis = 'x' | 'y' | 'z'

export type Vec3 = [number, number, number]

export type HingeSide = 'left' | 'right'

export type EdgeSide = 'top' | 'bottom' | 'right' | 'left'

export interface EdgeBanding {
  /** الحرف الأمامي / العلوي */
  top: boolean
  /** الحرف الخلفي / السفلي */
  bottom: boolean
  /** الحرف الأيمن */
  right: boolean
  /** الحرف الأيسر */
  left: boolean
}

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
  /** فئة العنصر (تُستنتج تلقائياً للتوافق مع التصاميم القديمة) */
  category?: PanelCategory
  dimensions: PanelDimensions
  /** مركز العنصر في الفضاء ثلاثي الأبعاد بالسنتيمتر (الأرضية Y = 0) */
  position: Vec3
  /** زوايا الدوران بالراديان [rx, ry, rz] */
  rotation: Vec3
  /** المحور المحلي الذي يمثل سُمك اللوح (18 مم / 6 مم) */
  thicknessAxis: Axis
  materialId: MaterialId
  /** شريط الحرف الظاهر لكل لوح */
  edgeBanding?: EdgeBanding
  /** الخلوص (Clearance) للضلف والأدراج بالسنتيمتر، الافتراضي 0.2 سم (2 مم) */
  clearanceCm?: number
  /** عرض مقبض بسيط للضلفة أو الدرج */
  hasHandle?: boolean
  /** جهة المفصلة للضلفة المفصلية أو اتجاه انزلاق الضلفة الجرار */
  hingeSide?: HingeSide
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

export function getPanelCategory(panel: Pick<FurniturePanel, 'role' | 'category'>): PanelCategory {
  if (panel.category) return panel.category
  if (
    panel.role === 'hinged_door' ||
    panel.role === 'sliding_door' ||
    panel.role === 'drawer'
  ) {
    return 'front'
  }
  if (
    panel.role === 'plinth_base' ||
    panel.role === 'wood_legs' ||
    panel.role === 'metal_legs'
  ) {
    return 'base'
  }
  return 'panel'
}

export function isInterfaceRole(role: PanelRole): boolean {
  return role === 'hinged_door' || role === 'sliding_door' || role === 'drawer'
}

export function isLegOrBaseRole(role: PanelRole): boolean {
  return role === 'plinth_base' || role === 'wood_legs' || role === 'metal_legs'
}

export function getDefaultEdgeBanding(role: PanelRole): EdgeBanding {
  switch (role) {
    case 'hinged_door':
    case 'sliding_door':
    case 'drawer':
      return { top: true, bottom: true, right: true, left: true }
    case 'back':
    case 'wood_legs':
    case 'metal_legs':
      return { top: false, bottom: false, right: false, left: false }
    case 'horizontal':
    case 'vertical':
    case 'shelf':
    case 'divider':
    case 'plinth_base':
    case 'custom':
      return { top: true, bottom: false, right: false, left: false }
  }
}

export function getEffectiveEdgeBanding(panel: Pick<FurniturePanel, 'role' | 'edgeBanding'>): EdgeBanding {
  return panel.edgeBanding ?? getDefaultEdgeBanding(panel.role)
}
