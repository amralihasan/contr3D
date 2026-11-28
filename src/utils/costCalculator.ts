import {
  getEffectivePanelHandle,
  type FurniturePanel,
  type PricingConfig,
} from '../types/furniture'
import type { CutListReport } from './cutList'
import type { NestingReport } from './sheetOptimizer'
import { roundTo } from './snapping'

export type PricingFieldKey = keyof PricingConfig

export interface CostLineItem {
  key: string
  label: string
  note: string
  quantity: number
  unitLabel: string
  unitPrice: number
  priceField: PricingFieldKey
  totalCost: number
}

export interface CostEstimateReport {
  sheet18Count: number
  sheet6Count: number
  edgeBandingMeters: number
  hingedDoorCount: number
  hingeCount: number
  drawerCount: number
  handleCount: number
  legsSetCount: number
  mirrorDoorCount: number
  mirrorAreaSqm: number
  lineItems: CostLineItem[]
  materialsCost: number
  laborCost: number
  totalCost: number
  profitMarginPercent: number
  profitAmount: number
  suggestedSellingPrice: number
}

export function formatEgp(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(safe) ? 0 : 0,
    maximumFractionDigits: 2,
  }).format(safe)} ج.م`
}

export function computeCostEstimate(
  panels: FurniturePanel[],
  cutReport: CutListReport,
  nestingReport: NestingReport,
  pricing: PricingConfig
): CostEstimateReport {
  let sheet18Count = 0
  let sheet6Count = 0

  for (const group of nestingReport.groups) {
    if (group.thicknessMm <= 8) {
      sheet6Count += group.sheets.length
    } else {
      sheet18Count += group.sheets.length
    }
  }

  const edgeBandingMeters = roundTo(cutReport.totalEdgeMeters, 2)

  let hingedDoorCount = 0
  let hingeCount = 0
  let drawerCount = 0
  let handleCount = 0
  let legsSetCount = 0
  let mirrorDoorCount = 0
  let totalMirrorSqm = 0

  for (const panel of panels) {
    if (panel.role === 'hinged_door') {
      hingedDoorCount += 1
      hingeCount += panel.dimensions.height > 100 ? 3 : 2
      if (getEffectivePanelHandle(panel).type !== 'none') handleCount += 1
      if (panel.hasMirror) {
        mirrorDoorCount += 1
        totalMirrorSqm += (panel.dimensions.width * panel.dimensions.height) / 10000
      }
    } else if (panel.role === 'sliding_door') {
      if (getEffectivePanelHandle(panel).type !== 'none') handleCount += 1
      if (panel.hasMirror) {
        mirrorDoorCount += 1
        totalMirrorSqm += (panel.dimensions.width * panel.dimensions.height) / 10000
      }
    } else if (panel.role === 'drawer') {
      drawerCount += 1
      if (getEffectivePanelHandle(panel).type !== 'none') handleCount += 1
    } else if (
      panel.role === 'wood_legs' ||
      panel.role === 'metal_legs' ||
      panel.role === 'tv_short_legs' ||
      panel.role === 'metal_frame' ||
      panel.role === 'metal_u_legs' ||
      panel.role === 'metal_x_legs' ||
      panel.role === 'wood_pillars'
    ) {
      legsSetCount += 1
    }
  }

  const mirrorAreaSqm = roundTo(totalMirrorSqm, 2)

  const lineItems: CostLineItem[] = [
    {
      key: 'sheet18',
      label: 'ألواح كونتر 18 مم (122×244)',
      note: 'محسوبة تلقائياً من مخطط رص الألواح',
      quantity: sheet18Count,
      unitLabel: 'لوح',
      unitPrice: pricing.sheet18Price,
      priceField: 'sheet18Price',
      totalCost: roundTo(sheet18Count * pricing.sheet18Price, 2),
    },
    {
      key: 'sheet6',
      label: 'ألواح ضهر 6 مم (122×244)',
      note: 'ألواح الضهر والسُمك الرفيع',
      quantity: sheet6Count,
      unitLabel: 'لوح',
      unitPrice: pricing.sheet6Price,
      priceField: 'sheet6Price',
      totalCost: roundTo(sheet6Count * pricing.sheet6Price, 2),
    },
    {
      key: 'edgeBanding',
      label: 'شريط حرف PVC',
      note: 'إجمالي أمتار الحروف الظاهرة في التصميم',
      quantity: edgeBandingMeters,
      unitLabel: 'متر',
      unitPrice: pricing.edgeBandingPricePerMeter,
      priceField: 'edgeBandingPricePerMeter',
      totalCost: roundTo(edgeBandingMeters * pricing.edgeBandingPricePerMeter, 2),
    },
    {
      key: 'hinges',
      label: 'مفصلات أبواب',
      note:
        hingedDoorCount > 0
          ? `${hingedDoorCount} ضلفة مفصلية (2 مفصلة أو 3 للارتفاع > 100 سم)`
          : '2 مفصلة لكل ضلفة (3 إذا زاد الارتفاع عن 100 سم)',
      quantity: hingeCount,
      unitLabel: 'مفصلة',
      unitPrice: pricing.hingePrice,
      priceField: 'hingePrice',
      totalCost: roundTo(hingeCount * pricing.hingePrice, 2),
    },
    {
      key: 'drawerSlides',
      label: 'أطقم مجاري أدراج',
      note: 'طقم مجرى واحد لكل درج',
      quantity: drawerCount,
      unitLabel: 'طقم',
      unitPrice: pricing.drawerSlidePrice,
      priceField: 'drawerSlidePrice',
      totalCost: roundTo(drawerCount * pricing.drawerSlidePrice, 2),
    },
    {
      key: 'handles',
      label: 'مقابض',
      note: 'مقبض واحد لكل ضلفة أو درج',
      quantity: handleCount,
      unitLabel: 'مقبض',
      unitPrice: pricing.handlePrice,
      priceField: 'handlePrice',
      totalCost: roundTo(handleCount * pricing.handlePrice, 2),
    },
    {
      key: 'legs',
      label: 'قواعد وأطقم رجول (معدن / خشب)',
      note: 'تشمل أطقم الرجول والشاسيهات المعدنية والأعمدة',
      quantity: legsSetCount,
      unitLabel: 'طقم',
      unitPrice: pricing.legsSetPrice,
      priceField: 'legsSetPrice',
      totalCost: roundTo(legsSetCount * pricing.legsSetPrice, 2),
    },
    {
      key: 'mirror',
      label: 'مرايا ضلف (سعر المتر المربع)',
      note:
        mirrorDoorCount > 0
          ? `${mirrorDoorCount} ضلفة مرايا بإجمالي ${mirrorAreaSqm} م²`
          : 'تُحسب تلقائياً عند وجود ضلف مغطاة بمرايا',
      quantity: mirrorAreaSqm,
      unitLabel: 'م²',
      unitPrice: pricing.mirrorPricePerSqm,
      priceField: 'mirrorPricePerSqm',
      totalCost: roundTo(mirrorAreaSqm * pricing.mirrorPricePerSqm, 2),
    },
  ]

  const materialsCost = roundTo(
    lineItems.reduce((sum, item) => sum + item.totalCost, 0),
    2
  )
  const laborCost = roundTo(Math.max(0, pricing.laborCost), 2)
  const totalCost = roundTo(materialsCost + laborCost, 2)
  const profitMarginPercent = roundTo(Math.max(0, pricing.profitMarginPercent), 1)
  const profitAmount = roundTo(totalCost * (profitMarginPercent / 100), 2)
  const suggestedSellingPrice = roundTo(totalCost + profitAmount, 2)

  return {
    sheet18Count,
    sheet6Count,
    edgeBandingMeters,
    hingedDoorCount,
    hingeCount,
    drawerCount,
    handleCount,
    legsSetCount,
    mirrorDoorCount,
    mirrorAreaSqm,
    lineItems,
    materialsCost,
    laborCost,
    totalCost,
    profitMarginPercent,
    profitAmount,
    suggestedSellingPrice,
  }
}
