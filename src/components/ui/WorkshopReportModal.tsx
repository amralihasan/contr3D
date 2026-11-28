import {
  AlertTriangle,
  Calculator,
  Camera,
  ClipboardList,
  LayoutGrid,
  Printer,
  RotateCcw,
  Scissors,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDesignStore } from '../../store/useDesignStore'
import type { PricingConfig } from '../../types/furniture'
import {
  computeCostEstimate,
  formatEgp,
  type CostEstimateReport,
  type PricingFieldKey,
} from '../../utils/costCalculator'
import { buildCutListReport } from '../../utils/cutList'
import { computeOverallDimensions } from '../../utils/dimensions'
import { DEFAULT_KERF_CM, optimizeSheetNesting } from '../../utils/sheetOptimizer'
import {
  DEFAULT_PRICING_CONFIG,
  loadPricingConfig,
  savePricingConfig,
} from '../../utils/storage'
import { SheetNestingDiagram } from './SheetNestingDiagram'

interface WorkshopReportModalProps {
  open: boolean
  onClose: () => void
}

type ReportTab = 'cutlist' | 'nesting' | 'cost' | 'export'

function PrintableCostSummary({ cost }: { cost: CostEstimateReport }) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-extrabold text-slate-900">
        ملخص التكلفة التقديرية والتسعير
      </h4>
      <table className="mb-3 w-full border-collapse border border-slate-300 text-right text-xs">
        <thead className="bg-slate-100">
          <tr>
            <th className="border border-slate-300 px-2.5 py-1.5">البند</th>
            <th className="border border-slate-300 px-2.5 py-1.5">الكمية</th>
            <th className="border border-slate-300 px-2.5 py-1.5">سعر الوحدة</th>
            <th className="border border-slate-300 px-2.5 py-1.5">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {cost.lineItems
            .filter((item) => item.quantity > 0)
            .map((item) => (
              <tr key={item.key}>
                <td className="border border-slate-300 px-2.5 py-1.5 font-bold">
                  {item.label}
                </td>
                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5">
                  {item.quantity} {item.unitLabel}
                </td>
                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5">
                  {formatEgp(item.unitPrice)}
                </td>
                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5 font-bold">
                  {formatEgp(item.totalCost)}
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs sm:grid-cols-4">
        <div>
          <span className="text-slate-600">تكلفة الخامات: </span>
          <span className="tabular-nums font-extrabold text-slate-900">
            {formatEgp(cost.materialsCost)}
          </span>
        </div>
        <div>
          <span className="text-slate-600">المصنعية والتجميع: </span>
          <span className="tabular-nums font-extrabold text-slate-900">
            {formatEgp(cost.laborCost)}
          </span>
        </div>
        <div>
          <span className="text-slate-600">التكلفة الإجمالية: </span>
          <span className="tabular-nums font-extrabold text-slate-900">
            {formatEgp(cost.totalCost)}
          </span>
        </div>
        <div>
          <span className="text-slate-600">سعر البيع ({cost.profitMarginPercent}%): </span>
          <span className="tabular-nums font-extrabold text-emerald-800">
            {formatEgp(cost.suggestedSellingPrice)}
          </span>
        </div>
      </div>
    </div>
  )
}

function captureViewportScreenshot(): string | null {
  try {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export function WorkshopReportModal({ open, onClose }: WorkshopReportModalProps) {
  if (!open) return null
  return <WorkshopReportModalContent onClose={onClose} />
}

function WorkshopReportModalContent({ onClose }: { onClose: () => void }) {
  const panels = useDesignStore((s) => s.panels)
  const currentDesignName = useDesignStore((s) => s.currentDesignName)

  const [activeTab, setActiveTab] = useState<ReportTab>('cutlist')
  const [kerfCm, setKerfCm] = useState<number>(DEFAULT_KERF_CM)
  const [respectWoodGrain, setRespectWoodGrain] = useState(false)
  const [pricing, setPricing] = useState<PricingConfig>(() => loadPricingConfig())
  const [includeCostInPrint, setIncludeCostInPrint] = useState(false)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(() =>
    captureViewportScreenshot()
  )
  const [reportTimestamp] = useState<number>(() => Date.now())

  const cutReport = useMemo(() => buildCutListReport(panels), [panels])
  const nestingReport = useMemo(
    () => optimizeSheetNesting(cutReport.pieces, kerfCm, respectWoodGrain),
    [cutReport.pieces, kerfCm, respectWoodGrain]
  )
  const costReport = useMemo(
    () => computeCostEstimate(panels, cutReport, nestingReport, pricing),
    [panels, cutReport, nestingReport, pricing]
  )
  const overall = useMemo(() => computeOverallDimensions(panels), [panels])

  const updatePricingField = (field: PricingFieldKey, rawValue: string) => {
    const parsed = Number.parseFloat(rawValue)
    const safeVal = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
    setPricing((prev) => {
      const next = { ...prev, [field]: safeVal }
      savePricingConfig(next)
      return next
    })
  }

  const handleResetDefaultPricing = () => {
    const next = { ...DEFAULT_PRICING_CONFIG }
    setPricing(next)
    savePricingConfig(next)
  }

  const formattedDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(reportTimestamp)
    } catch {
      return ''
    }
  }, [reportTimestamp])

  const handlePrintPdf = () => {
    const freshShot = captureViewportScreenshot()
    if (freshShot) setScreenshotUrl(freshShot)
    setTimeout(() => {
      window.print()
    }, 80)
  }

  const refreshScreenshot = () => {
    setScreenshotUrl(captureViewportScreenshot())
  }

  return (
    <>
      {/* نافذة التقرير التفاعلية */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5 print:hidden">
        <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
          {/* رأس النافذة */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  تقرير الورشة وكشف التقطيع
                </h2>
                <p className="text-xs text-slate-400">
                  {currentDesignName} · لوح الكونتر القياسي 122 × 244 سم
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                disabled={cutReport.pieces.length === 0}
                className="flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-40 sm:text-sm"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة / حفظ PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* شريط التبويبات الأربعة */}
          <div className="grid grid-cols-2 gap-1.5 border-b border-slate-800 bg-slate-950/50 p-2.5 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setActiveTab('cutlist')}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === 'cutlist'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Scissors className="h-4 w-4 shrink-0" />
              <span>1. كشف التقطيع</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('nesting')}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === 'nesting'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span>2. رص الألواح</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cost')}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === 'cost'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Calculator className="h-4 w-4 shrink-0" />
              <span>3. التكلفة والتسعير</span>
            </button>
            <button
              type="button"
              onClick={() => {
                refreshScreenshot()
                setActiveTab('export')
              }}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition sm:text-sm ${
                activeTab === 'export'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>4. معاينة PDF</span>
            </button>
          </div>

          {/* محتوى التبويب النشط */}
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
            {cutReport.pieces.length === 0 && cutReport.hardware.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-400">
                لا توجد قطع في التصميم الحالي بعد. أضف ألواحاً أولاً لإنشاء تقرير الورشة.
              </div>
            ) : (
              <>
                {/* ملخص سريع أعلى التبويب */}
                <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[11px] text-slate-400">إجمالي قطع التقطيع</div>
                    <div className="tabular-nums mt-0.5 text-lg font-extrabold text-white">
                      {cutReport.totalCutPieces} قطعة
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[11px] text-slate-400">ألواح الكونتر (122×244)</div>
                    <div className="tabular-nums mt-0.5 text-lg font-extrabold text-amber-400">
                      {nestingReport.totalSheets} لوح
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[11px] text-slate-400">إجمالي شريط الحرف</div>
                    <div className="tabular-nums mt-0.5 text-lg font-extrabold text-sky-400">
                      {cutReport.totalEdgeMeters} متر
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[11px] text-slate-400">نسبة الاستغلال / الهالك</div>
                    <div className="tabular-nums mt-0.5 text-sm font-extrabold text-emerald-400">
                      {nestingReport.overallUtilizationPct}%{' '}
                      <span className="text-xs text-rose-400">
                        (هالك {nestingReport.overallWastePct}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* التبويب 1: كشف التقطيع + شريط الحرف */}
                {activeTab === 'cutlist' && (
                  <div className="space-y-5">
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full min-w-[680px] text-right text-xs">
                        <thead className="bg-slate-950 text-slate-300">
                          <tr>
                            <th className="px-3 py-3 font-bold">القطعة</th>
                            <th className="px-3 py-3 font-bold">المقاس الصافي (سم)</th>
                            <th className="px-3 py-3 font-bold">بالمم</th>
                            <th className="px-3 py-3 font-bold">السُمك</th>
                            <th className="px-3 py-3 font-bold">الخامة</th>
                            <th className="px-3 py-3 font-bold">الكمية</th>
                            <th className="px-3 py-3 font-bold">شريط الحرف</th>
                            <th className="px-3 py-3 font-bold">الأمتار</th>
                            <th className="px-3 py-3 font-bold">ملاحظات الورشة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                          {cutReport.rows.map((row) => (
                            <tr key={row.key} className="hover:bg-slate-800/40">
                              <td className="px-3 py-2.5 font-bold text-slate-100">
                                <div>{row.names.join('، ')}</div>
                                <div className="text-[11px] font-normal text-slate-400">
                                  {row.roleLabel}
                                </div>
                              </td>
                              <td className="tabular-nums px-3 py-2.5 font-bold text-amber-200">
                                {row.lengthCm} × {row.widthCm} سم
                              </td>
                              <td className="tabular-nums px-3 py-2.5 text-slate-400">
                                {Math.round(row.lengthCm * 10)} × {Math.round(row.widthCm * 10)}
                              </td>
                              <td className="tabular-nums px-3 py-2.5 text-slate-200">
                                {row.thicknessMm} مم
                              </td>
                              <td className="px-3 py-2.5 text-slate-200">{row.materialLabel}</td>
                              <td className="tabular-nums px-3 py-2.5 font-extrabold text-white">
                                {row.quantity}
                              </td>
                              <td className="px-3 py-2.5 text-slate-300">{row.edgeLabel}</td>
                              <td className="tabular-nums px-3 py-2.5 font-bold text-sky-300">
                                {row.totalEdgeMeters > 0 ? `${row.totalEdgeMeters} م` : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-amber-200">
                                {row.workshopNotes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* إجمالي أمتار شريط الحرف لكل خامة */}
                    {cutReport.edgeTotalsByMaterial.length > 0 && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <h3 className="mb-2.5 text-xs font-bold text-slate-200">
                          إجمالي شريط الحرف المطلوب حسب الخامة
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {cutReport.edgeTotalsByMaterial.map((item) => (
                            <div
                              key={item.materialId}
                              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                            >
                              <span className="font-bold text-slate-200">
                                {item.materialLabel}:
                              </span>
                              <span className="tabular-nums font-extrabold text-sky-300">
                                {item.meters} متر
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* إكسسوارات ورجول */}
                    {cutReport.hardware.length > 0 && (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <h3 className="mb-2.5 text-xs font-bold text-slate-200">
                          الرجول والإكسسوارات والزجاج
                        </h3>
                        <div className="space-y-1.5 text-xs">
                          {cutReport.hardware.map((hw) => (
                            <div
                              key={hw.key}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2"
                            >
                              <span className="font-bold text-slate-200">
                                {hw.name} ({hw.materialLabel})
                              </span>
                              <span className="tabular-nums text-slate-400">
                                {hw.dimensionsLabel} · العدد: {hw.quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* التبويب 2: مخطط رص الألواح */}
                {activeTab === 'nesting' && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                      <div className="flex items-center gap-2.5 text-xs">
                        <label className="font-bold text-slate-300">
                          سُمك سلاح المنشار (Kerf):
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          max={1.5}
                          value={kerfCm}
                          onChange={(e) => {
                            const v = Number.parseFloat(e.target.value)
                            setKerfCm(Number.isFinite(v) ? v : DEFAULT_KERF_CM)
                          }}
                          className="tabular-nums h-10 w-20 rounded-xl border border-slate-700 bg-slate-900 px-2 text-center font-bold text-white outline-none focus:border-amber-500"
                        />
                        <span className="text-slate-400">سم ({Math.round(kerfCm * 10)} مم)</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setRespectWoodGrain((v) => !v)}
                        className={`h-10 rounded-xl border px-3 text-xs font-bold transition ${
                          respectWoodGrain
                            ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {respectWoodGrain
                          ? 'تثبيت اتجاه تعريق الخشب: مفعّل'
                          : 'التدوير التلقائي 90° لتقليل الهالك'}
                      </button>
                    </div>

                    {nestingReport.groups.map((group) => (
                      <div key={group.key} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                          <h3 className="text-sm font-bold text-slate-100">
                            {group.materialLabel} — سُمك {group.thicknessMm} مم ({group.sheets.length} لوح)
                          </h3>
                          <span className="tabular-nums text-xs text-slate-400">
                            الاستغلال: {group.utilizationPct}% · الهالك: {group.wastePct}%
                          </span>
                        </div>

                        {group.oversizedPieces.length > 0 && (
                          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                            <div>
                              توجد قطع أكبر من مقاس اللوح القياسي (244 × 122 سم):{' '}
                              {group.oversizedPieces
                                .map((p) => `${p.name} (${p.lengthCm}×${p.widthCm} سم)`)
                                .join('، ')}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                          {group.sheets.map((sheet) => (
                            <SheetNestingDiagram key={sheet.sheetNumber} sheet={sheet} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* التبويب 3: حاسبة التكلفة والتسعير */}
                {activeTab === 'cost' && (
                  <div className="space-y-5">
                    {/* بطاقات ملخص التكلفة والتسعير */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                        <div className="text-xs font-bold text-slate-400">تكلفة الخامات والإكسسوارات</div>
                        <div className="tabular-nums mt-1 text-2xl font-extrabold text-sky-300">
                          {formatEgp(costReport.materialsCost)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          خشب + شريط حرف + إكسسوارات ومرايا
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
                        <div className="text-xs font-bold text-amber-200">التكلفة الإجمالية</div>
                        <div className="tabular-nums mt-1 text-2xl font-extrabold text-amber-300">
                          {formatEgp(costReport.totalCost)}
                        </div>
                        <div className="mt-1 text-[11px] text-amber-200/75">
                          شاملة المصنعية والتجميع ({formatEgp(costReport.laborCost)})
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/45 bg-emerald-500/15 p-4">
                        <div className="text-xs font-bold text-emerald-200">
                          سعر البيع المقترح للعميل
                        </div>
                        <div className="tabular-nums mt-1 text-2xl font-extrabold text-emerald-300">
                          {formatEgp(costReport.suggestedSellingPrice)}
                        </div>
                        <div className="tabular-nums mt-1 text-[11px] font-semibold text-emerald-200/80">
                          صافي الربح ({costReport.profitMarginPercent}%):{' '}
                          {formatEgp(costReport.profitAmount)}
                        </div>
                      </div>
                    </div>

                    {/* خانات المصنعية وهامش الربح وخيار الطباعة */}
                    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-3">
                      <div>
                        <label
                          htmlFor="cost-labor-input"
                          className="mb-1.5 block text-xs font-bold text-slate-300"
                        >
                          تكلفة المصنعية والتجميع (ج.م)
                        </label>
                        <input
                          id="cost-labor-input"
                          type="number"
                          min={0}
                          step={50}
                          value={pricing.laborCost}
                          onChange={(e) => updatePricingField('laborCost', e.target.value)}
                          className="tabular-nums h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="cost-margin-input"
                          className="mb-1.5 block text-xs font-bold text-slate-300"
                        >
                          نسبة هامش الربح (%)
                        </label>
                        <input
                          id="cost-margin-input"
                          type="number"
                          min={0}
                          max={300}
                          step={1}
                          value={pricing.profitMarginPercent}
                          onChange={(e) =>
                            updatePricingField('profitMarginPercent', e.target.value)
                          }
                          className="tabular-nums h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="flex flex-col justify-between gap-2">
                        <label className="flex min-h-[44px] cursor-pointer select-none items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-700">
                          <input
                            type="checkbox"
                            checked={includeCostInPrint}
                            onChange={(e) => setIncludeCostInPrint(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/40"
                          />
                          <span>تضمين التكلفة عند الطباعة</span>
                        </label>

                        <button
                          type="button"
                          onClick={handleResetDefaultPricing}
                          className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 text-[11px] font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>استعادة الأسعار الافتراضية</span>
                        </button>
                      </div>
                    </div>

                    {/* جدول تفصيلي لبنود التكلفة وأسعار الوحدات القابلة للتعديل */}
                    <div className="overflow-x-auto rounded-2xl border border-slate-800">
                      <table className="w-full min-w-[640px] text-right text-xs">
                        <thead className="bg-slate-950 text-slate-300">
                          <tr>
                            <th className="px-3.5 py-3 font-bold">البند</th>
                            <th className="px-3.5 py-3 font-bold">الكمية المحسوبة</th>
                            <th className="px-3.5 py-3 font-bold">سعر الوحدة (ج.م)</th>
                            <th className="px-3.5 py-3 font-bold">الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                          {costReport.lineItems.map((item) => {
                            const unused = item.quantity === 0
                            return (
                              <tr
                                key={item.key}
                                className={unused ? 'opacity-55 hover:opacity-90' : 'hover:bg-slate-800/40'}
                              >
                                <td className="px-3.5 py-2.5">
                                  <div className="font-bold text-slate-100">{item.label}</div>
                                  <div className="text-[11px] text-slate-400">{item.note}</div>
                                </td>
                                <td className="tabular-nums px-3.5 py-2.5 font-extrabold text-amber-200">
                                  {item.quantity} {item.unitLabel}
                                </td>
                                <td className="px-3.5 py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    step={item.priceField === 'edgeBandingPricePerMeter' ? 1 : 10}
                                    value={item.unitPrice}
                                    onChange={(e) =>
                                      updatePricingField(item.priceField, e.target.value)
                                    }
                                    className="tabular-nums h-10 w-28 rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-center font-bold text-white outline-none focus:border-amber-500"
                                    aria-label={`سعر ${item.label}`}
                                  />
                                </td>
                                <td className="tabular-nums px-3.5 py-2.5 font-extrabold text-white">
                                  {formatEgp(item.totalCost)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* التبويب 4: معاينة وتصدير PDF */}
                {activeTab === 'export' && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div>
                        <div className="text-sm font-bold text-amber-200">
                          تقرير جاهز للطباعة والحفظ كـ PDF
                        </div>
                        <p className="text-xs text-slate-300">
                          يتضمن لقطة 3D للتصميم والمقاسات الإجمالية وجدول التقطيع ومخططات الرص.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex h-11 cursor-pointer select-none items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 text-xs font-bold text-slate-200">
                          <input
                            type="checkbox"
                            checked={includeCostInPrint}
                            onChange={(e) => setIncludeCostInPrint(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500"
                          />
                          <span>تضمين التكلفة عند الطباعة</span>
                        </label>
                        <button
                          type="button"
                          onClick={refreshScreenshot}
                          className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
                        >
                          <Camera className="h-4 w-4" />
                          <span>تحديث اللقطة</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintPdf}
                          className="flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 hover:bg-amber-400"
                        >
                          <Printer className="h-4 w-4" />
                          <span>طباعة / حفظ كـ PDF</span>
                        </button>
                      </div>
                    </div>

                    {/* معاينة التقرير داخل النافذة */}
                    <div className="space-y-5 rounded-2xl border border-slate-700 bg-white p-6 text-slate-900">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900">
                            {currentDesignName}
                          </h3>
                          <p className="text-xs text-slate-500">
                            تقرير الورشة وكشف التقطيع — {formattedDate}
                          </p>
                        </div>
                        {overall && (
                          <div className="tabular-nums rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800">
                            المقاس الكلي: {overall.width} × {overall.height} × {overall.depth} سم
                          </div>
                        )}
                      </div>

                      {screenshotUrl && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                          <img
                            src={screenshotUrl}
                            alt="معاينة 3D للتصميم"
                            className="mx-auto max-h-72 w-full object-contain"
                          />
                        </div>
                      )}

                      <div>
                        <h4 className="mb-2 text-sm font-extrabold text-slate-900">
                          جدول كشف التقطيع ({cutReport.totalCutPieces} قطعة)
                        </h4>
                        <table className="w-full border-collapse border border-slate-300 text-right text-xs">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="border border-slate-300 px-2.5 py-2">القطعة</th>
                              <th className="border border-slate-300 px-2.5 py-2">المقاس (سم)</th>
                              <th className="border border-slate-300 px-2.5 py-2">السُمك</th>
                              <th className="border border-slate-300 px-2.5 py-2">الخامة</th>
                              <th className="border border-slate-300 px-2.5 py-2">الكمية</th>
                              <th className="border border-slate-300 px-2.5 py-2">شريط الحرف</th>
                              <th className="border border-slate-300 px-2.5 py-2">ملاحظات الورشة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cutReport.rows.map((row) => (
                              <tr key={row.key}>
                                <td className="border border-slate-300 px-2.5 py-1.5 font-bold">
                                  {row.names.join('، ')}
                                </td>
                                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5 font-bold">
                                  {row.lengthCm} × {row.widthCm}
                                </td>
                                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5">
                                  {row.thicknessMm} مم
                                </td>
                                <td className="border border-slate-300 px-2.5 py-1.5">
                                  {row.materialLabel}
                                </td>
                                <td className="tabular-nums border border-slate-300 px-2.5 py-1.5 font-bold">
                                  {row.quantity}
                                </td>
                                <td className="border border-slate-300 px-2.5 py-1.5">
                                  {row.edgeLabel} ({row.totalEdgeMeters} م)
                                </td>
                                <td className="border border-slate-300 px-2.5 py-1.5 text-[11px]">
                                  {row.workshopNotes || '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h4 className="mb-2 text-sm font-extrabold text-slate-900">
                          مخطط رص الألواح القياسية ({nestingReport.totalSheets} لوح 122×244 سم)
                        </h4>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {nestingReport.groups.flatMap((g) =>
                            g.sheets.map((sh) => (
                              <SheetNestingDiagram
                                key={`${g.key}-${sh.sheetNumber}`}
                                sheet={sh}
                                printMode
                              />
                            ))
                          )}
                        </div>
                      </div>

                      {includeCostInPrint && <PrintableCostSummary cost={costReport} />}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* نسخة الطباعة النظيفة (@media print) تظهر فقط عند الطباعة / حفظ PDF */}
      {createPortal(
        <div
          dir="rtl"
          className="hidden print:block bg-white p-6 text-slate-900"
        >
          <div className="mb-4 flex items-start justify-between border-b-2 border-slate-800 pb-3">
            <div>
              <h1 className="text-2xl font-extrabold">{currentDesignName}</h1>
              <p className="text-xs text-slate-600">
                تقرير الورشة وكشف تقطيع خشب الكونتر — {formattedDate}
              </p>
            </div>
            {overall && (
              <div className="tabular-nums text-left text-xs font-bold">
                <div>المقاس الكلي: {overall.width} × {overall.height} × {overall.depth} سم</div>
                <div>
                  الألواح المطلوبة: {nestingReport.totalSheets} لوح · شريط الحرف: {cutReport.totalEdgeMeters} م
                </div>
              </div>
            )}
          </div>

          {screenshotUrl && (
            <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
              <img
                src={screenshotUrl}
                alt="لقطة ثلاثية الأبعاد للتصميم"
                className="mx-auto max-h-64 w-full object-contain"
              />
            </div>
          )}

          <h2 className="mb-2 text-sm font-extrabold">جدول كشف التقطيع</h2>
          <table className="mb-5 w-full border-collapse border border-slate-400 text-right text-xs">
            <thead className="bg-slate-100">
              <tr>
                <th className="border border-slate-400 px-2 py-1.5">القطعة</th>
                <th className="border border-slate-400 px-2 py-1.5">المقاس (سم)</th>
                <th className="border border-slate-400 px-2 py-1.5">بالمم</th>
                <th className="border border-slate-400 px-2 py-1.5">السُمك</th>
                <th className="border border-slate-400 px-2 py-1.5">الخامة</th>
                <th className="border border-slate-400 px-2 py-1.5">الكمية</th>
                <th className="border border-slate-400 px-2 py-1.5">شريط الحرف</th>
                <th className="border border-slate-400 px-2 py-1.5">ملاحظات الورشة</th>
              </tr>
            </thead>
            <tbody>
              {cutReport.rows.map((row) => (
                <tr key={row.key}>
                  <td className="border border-slate-400 px-2 py-1.5 font-bold">
                    {row.names.join('، ')}
                  </td>
                  <td className="tabular-nums border border-slate-400 px-2 py-1.5 font-bold">
                    {row.lengthCm} × {row.widthCm}
                  </td>
                  <td className="tabular-nums border border-slate-400 px-2 py-1.5">
                    {Math.round(row.lengthCm * 10)} × {Math.round(row.widthCm * 10)}
                  </td>
                  <td className="tabular-nums border border-slate-400 px-2 py-1.5">
                    {row.thicknessMm} مم
                  </td>
                  <td className="border border-slate-400 px-2 py-1.5">{row.materialLabel}</td>
                  <td className="tabular-nums border border-slate-400 px-2 py-1.5 font-bold">
                    {row.quantity}
                  </td>
                  <td className="border border-slate-400 px-2 py-1.5">
                    {row.edgeLabel} ({row.totalEdgeMeters} م)
                  </td>
                  <td className="border border-slate-400 px-2 py-1.5 text-[11px]">
                    {row.workshopNotes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {cutReport.edgeTotalsByMaterial.length > 0 && (
            <div className="mb-5 text-xs">
              <span className="font-bold">إجمالي شريط الحرف: </span>
              {cutReport.edgeTotalsByMaterial
                .map((e) => `${e.materialLabel}: ${e.meters} م`)
                .join(' | ')}
            </div>
          )}

          <h2 className="mb-2 text-sm font-extrabold">
            مخططات رص الألواح (122 × 244 سم) — إجمالي {nestingReport.totalSheets} لوح (هالك {nestingReport.overallWastePct}%)
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {nestingReport.groups.flatMap((g) =>
              g.sheets.map((sh) => (
                <SheetNestingDiagram
                  key={`print-${g.key}-${sh.sheetNumber}`}
                  sheet={sh}
                  printMode
                />
              ))
            )}
          </div>

          {includeCostInPrint && <PrintableCostSummary cost={costReport} />}
        </div>,
        document.body
      )}
    </>
  )
}
