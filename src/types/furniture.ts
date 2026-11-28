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
  | 'plinth_recessed'
  | 'wood_legs'
  | 'metal_legs'
  | 'tv_short_legs'
  | 'metal_frame'
  | 'metal_u_legs'
  | 'metal_x_legs'
  | 'wood_pillars'
  | 'wood_arch'
  | 'custom'

export type MetalBaseColor = 'silver' | 'matte_black' | 'gold' | 'matte_white' | 'anthracite'

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

export type HandleType = 'bar' | 'knob' | 'edge' | 'recessed' | 'none'

export type HandleColor = 'black' | 'gold' | 'silver' | 'wood'

export type HandlePosition = 'left' | 'right' | 'top' | 'bottom' | 'center'

export type HandleOrientation = 'horizontal' | 'vertical'

export interface PanelHandleConfig {
  type: HandleType
  color: HandleColor
  position: HandlePosition
  orientation?: HandleOrientation
  length?: number
}

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

export interface CornerRadius {
  tl: number
  tr: number
  bl: number
  br: number
}

export interface PanelCutout {
  id: string
  shape: 'circle' | 'rect'
  x: number
  y: number
  width: number
  height: number
  diameter?: number
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
  /** دوران زوايا اللوح بالسنتيمتر */
  cornerRadius?: CornerRadius
  /** فتحات الأسلاك / الفحر داخل اللوح */
  cutouts?: PanelCutout[]
  /** الخلوص (Clearance) للضلف والأدراج بالسنتيمتر، الافتراضي 0.2 سم (2 مم) */
  clearanceCm?: number
  /** عرض مقبض بسيط للضلفة أو الدرج */
  hasHandle?: boolean
  /** إعدادات المقبض التفصيلية (النوع، اللون، الموضع، الاتجاه، الطول) */
  handle?: PanelHandleConfig
  /** جهة المفصلة للضلفة المفصلية أو اتجاه انزلاق الضلفة الجرار */
  hingeSide?: HingeSide
  /** تغطية الوجه الأمامي للضلفة بطبقة مرايا */
  hasMirror?: boolean
  /** لون القاعدة المعدنية (أسود مط، ذهبي، أبيض مط، أنثراسيت) */
  metalColor?: MetalBaseColor
}

export type ToolMode = 'select' | 'tape'
export type TransformMode = 'move' | 'resize'
export type TapeMode = 'guide' | 'measure'

export type HumanScalePreset = 'adult' | 'child'

export const HUMAN_SCALE_HEIGHTS_CM: Record<HumanScalePreset, number> = {
  adult: 175,
  child: 110,
}

export type HeightDimensionSide = 'left' | 'right'
export type WidthDimensionSide = 'front' | 'back' | 'top'
export type DepthDimensionSide = 'right' | 'left'

export interface DimensionPlacement {
  heightSide: HeightDimensionSide
  widthSide: WidthDimensionSide
  depthSide: DepthDimensionSide
}

export interface TapeMeasureDraft {
  start: Vec3
  end: Vec3
  unitDir: Vec3
  lockedAxis: Axis | null
  distanceCm: number
}

export interface GuideLine {
  id: string
  /** نوع العلام: من حافة لوح ('edge') أو قياس حر بين نقطتين ('point') */
  kind?: 'edge' | 'point'
  /** نقطة البداية للقياس بين نقطتين */
  measureStart?: Vec3
  /** نقطة النهاية للقياس بين نقطتين */
  measureEnd?: Vec3
  /** متجه الاتجاه للقياس بين نقطتين */
  unitDir?: Vec3
  /** المحور المقفل أثناء القياس بين نقطتين */
  lockedAxis?: Axis | null
  /** اللوح المرجعي الذي أُنشئ العلام بالنسبة له */
  panelId: string
  /** اسم اللوح المرجعي للعرض */
  panelName: string
  /** وصف الحافة المرجعية (مثلاً: الحافة السفلية) */
  edgeLabel: string
  /** المحور الذي يمتد عليه الخط الإرشادي */
  lineAxis: Axis
  /** محور الإزاحة العمودي على الحافة المرجعية */
  offsetAxis: Axis
  /** محور الوجه المضغوط */
  normalAxis: Axis
  /** إحداثي السطح المضغوط على محور normalAxis */
  surfaceCoord: number
  /** إشارة السطح (+1 أو -1) لإظهار العلام بوضوح فوق السطح */
  surfaceSign: 1 | -1
  /** إحداثي الحافة المرجعية على محور offsetAxis */
  referenceEdgeCoord: number
  /** اتجاه الإزاحة (+1 أو -1) */
  direction: 1 | -1
  /** المسافة بالسنتيمتر من الحافة المرجعية */
  distanceCm: number
  /** الإحداثي العالمي النهائي على محور offsetAxis */
  worldCoord: number
  /** نطاق الامتداد على محور lineAxis */
  spanMin: number
  spanMax: number
  /** نقطتا بداية ونهاية الخط الإرشادي للعرض */
  spanStart: Vec3
  spanEnd: Vec3
  /** موقع التسمية الرقمية */
  labelPosition: Vec3
}

export interface SavedDesign {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  panels: FurniturePanel[]
  guides?: GuideLine[]
  thumbnail?: string
}

export interface SavedDesignSummary {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  panelsCount: number
  thumbnail?: string
}

export interface CustomTemplate {
  id: string
  name: string
  createdAt: number
  dimensions: PanelDimensions
  panels: Omit<FurniturePanel, 'id'>[]
  thumbnail?: string
}

export interface PricingConfig {
  sheet18Price: number
  sheet6Price: number
  edgeBandingPricePerMeter: number
  hingePrice: number
  drawerSlidePrice: number
  handlePrice: number
  legsSetPrice: number
  mirrorPricePerSqm: number
  laborCost: number
  profitMarginPercent: number
}

export interface SnapFeedback {
  x: boolean
  y: boolean
  z: boolean
  floor: boolean
  guide?: boolean
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
  if (isLegOrBaseRole(panel.role)) {
    return 'base'
  }
  return 'panel'
}

export function isInterfaceRole(role: PanelRole): boolean {
  return role === 'hinged_door' || role === 'sliding_door' || role === 'drawer'
}

export function isLegOrBaseRole(role: PanelRole): boolean {
  return (
    role === 'plinth_base' ||
    role === 'plinth_recessed' ||
    role === 'wood_legs' ||
    role === 'metal_legs' ||
    role === 'tv_short_legs' ||
    role === 'metal_frame' ||
    role === 'metal_u_legs' ||
    role === 'metal_x_legs' ||
    role === 'wood_pillars' ||
    role === 'wood_arch'
  )
}

export function isMetalBaseRole(role: PanelRole): boolean {
  return (
    role === 'metal_legs' ||
    role === 'tv_short_legs' ||
    role === 'metal_frame' ||
    role === 'metal_u_legs' ||
    role === 'metal_x_legs'
  )
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
    case 'tv_short_legs':
    case 'metal_frame':
    case 'metal_u_legs':
    case 'metal_x_legs':
    case 'wood_pillars':
      return { top: false, bottom: false, right: false, left: false }
    case 'wood_arch':
      return { top: true, bottom: false, right: true, left: true }
    case 'horizontal':
    case 'vertical':
    case 'shelf':
    case 'divider':
    case 'plinth_base':
    case 'plinth_recessed':
    case 'custom':
      return { top: true, bottom: false, right: false, left: false }
  }
}

export function getEffectiveEdgeBanding(panel: Pick<FurniturePanel, 'role' | 'edgeBanding'>): EdgeBanding {
  return panel.edgeBanding ?? getDefaultEdgeBanding(panel.role)
}

export function getDefaultPanelHandle(
  panel: Pick<FurniturePanel, 'role' | 'hasHandle' | 'hingeSide' | 'dimensions'>
): PanelHandleConfig {
  if (panel.hasHandle === false) {
    return {
      type: 'none',
      color: 'silver',
      position: panel.role === 'drawer' ? 'center' : panel.hingeSide === 'left' ? 'right' : 'left',
      orientation: panel.role === 'drawer' ? 'horizontal' : 'vertical',
      length: 16,
    }
  }

  if (panel.role === 'drawer') {
    return {
      type: 'bar',
      color: 'silver',
      position: 'center',
      orientation: 'horizontal',
      length: Math.min(16, Math.max(8, Math.round(panel.dimensions.width * 0.3))),
    }
  }

  if (panel.role === 'sliding_door') {
    return {
      type: 'recessed',
      color: 'silver',
      position: panel.hingeSide === 'right' ? 'right' : 'left',
      orientation: 'vertical',
      length: 16,
    }
  }

  if (panel.role === 'hinged_door') {
    return {
      type: 'bar',
      color: 'silver',
      position: panel.hingeSide === 'left' ? 'right' : 'left',
      orientation: 'vertical',
      length: 14,
    }
  }

  return {
    type: 'none',
    color: 'silver',
    position: 'center',
    orientation: 'horizontal',
    length: 12,
  }
}

export function getEffectivePanelHandle(
  panel: Pick<FurniturePanel, 'role' | 'hasHandle' | 'hingeSide' | 'dimensions' | 'handle'>
): PanelHandleConfig {
  const defaults = getDefaultPanelHandle(panel)
  if (!panel.handle) return defaults
  return {
    type: panel.handle.type,
    color: panel.handle.color,
    position: panel.handle.position,
    orientation: panel.handle.orientation ?? defaults.orientation,
    length: panel.handle.length ?? defaults.length,
  }
}
