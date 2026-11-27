import { Camera, Download, Loader2, RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  captureEcommerceStudio,
  composeEcommerceProductPng,
  type EcommerceCameraAngle,
  type EcommerceCaptureSnapshot,
} from '../../utils/ecommerceExport'
import { EcommerceDimensionLines } from '../canvas/EcommerceDimensionLines'

interface EcommerceExportModalProps {
  open: boolean
  onClose: () => void
}

const ANGLE_OPTIONS: { id: EcommerceCameraAngle; label: string }[] = [
  { id: 'current', label: 'الزاوية الحالية' },
  { id: 'perspective', label: 'منظور 3D' },
  { id: 'front', label: 'أمامي' },
  { id: 'side', label: 'جانبي' },
]

export function EcommerceExportModal({ open, onClose }: EcommerceExportModalProps) {
  if (!open) return null
  return <EcommerceExportModalContent onClose={onClose} />
}

function buildEcommerceFilename(designName: string): string {
  const cleaned = designName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
  return `${cleaned || 'furniture-design'}-dimensions.png`
}

function EcommerceExportModalContent({ onClose }: { onClose: () => void }) {
  const panelsCount = useDesignStore((s) => s.panels.length)
  const currentDesignName = useDesignStore((s) => s.currentDesignName)

  const [whitePiece, setWhitePiece] = useState(true)
  const [showInternalDimensions, setShowInternalDimensions] = useState(false)
  const [cameraAngle, setCameraAngle] = useState<EcommerceCameraAngle>('current')
  const [refreshSeq, setRefreshSeq] = useState(0)
  const [captured, setCaptured] = useState<{
    key: string
    snapshot: EcommerceCaptureSnapshot | null
  }>({ key: '', snapshot: null })

  const captureKey = `${whitePiece}-${cameraAngle}-${panelsCount}-${refreshSeq}`
  const snapshot = panelsCount === 0 ? null : captured.snapshot
  const capturing = panelsCount > 0 && captured.key !== captureKey

  useEffect(() => {
    if (panelsCount === 0) return
    let cancelled = false
    void captureEcommerceStudio({
      whitePiece,
      cameraAngle,
      width: 2000,
      height: 1200,
    }).then((result) => {
      if (!cancelled) {
        setCaptured({ key: captureKey, snapshot: result })
      }
    })
    return () => {
      cancelled = true
    }
  }, [panelsCount, whitePiece, cameraAngle, captureKey])

  const handleDownload = () => {
    if (!snapshot) return
    const dataUrl = composeEcommerceProductPng(snapshot, showInternalDimensions)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = buildEcommerceFilename(currentDesignName)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => {
      document.body.removeChild(link)
    }, 150)
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-400" />
              <h2 className="text-base font-extrabold text-white sm:text-lg">
                تصدير صورة مقاسات للمتجر
              </h2>
              <span className="rounded-full border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-0.5 text-[11px] font-bold text-indigo-200">
                2000 × 1200 PNG
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              صورة استوديو بيضاء نقية بخطوط مقاسات احترافية جاهزة لصفحات المنتجات والمتاجر
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* المحتوى */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          {panelsCount === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/50 p-10 text-center text-sm text-slate-400">
              المشهد فارغ حالياً. أضف قطعاً للتصميم أولاً لتتمكن من تصدير صورة المتجر.
            </div>
          ) : (
            <div className="space-y-4">
              {/* معاينة الصورة النهائية */}
              <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl border border-slate-700 bg-white shadow-inner">
                <EcommerceDimensionLines
                  snapshot={snapshot}
                  showInternalDimensions={showInternalDimensions}
                />
                {capturing && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/35 text-xs font-bold text-white backdrop-blur-[1px]">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                    <span>جاري تجهيز لقطة الاستوديو عالية الدقة...</span>
                  </div>
                )}
              </div>

              {/* خيارات التحكم السريعة */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3.5 md:grid-cols-2">
                <div className="space-y-2.5">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={whitePiece}
                      onChange={(e) => setWhitePiece(e.target.checked)}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    <div>
                      <div>تحويل القطعة للأبيض النظيف</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        أبيض مطفي ناعم مع بقاء المقابض والرجول المعدنية بلونها الطبيعي
                      </div>
                    </div>
                  </label>

                  <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={showInternalDimensions}
                      onChange={(e) => setShowInternalDimensions(e.target.checked)}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    <div>
                      <div>إظهار المقاسات الداخلية</div>
                      <div className="text-[10px] font-normal text-slate-400">
                        عرض وارتفاع الأدراج، ارتفاع الفتحات بين الرفوف، وارتفاع القاعدة
                      </div>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  <div>
                    <div className="mb-1.5 text-xs font-bold text-slate-300">زاوية التصوير</div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {ANGLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setCameraAngle(opt.id)}
                          className={`h-10 rounded-xl border px-2 text-xs font-bold transition ${
                            cameraAngle === opt.id
                              ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                              : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                    <span>الاسم المقترح: {buildEcommerceFilename(currentDesignName)}</span>
                    <button
                      type="button"
                      onClick={() => setRefreshSeq((n) => n + 1)}
                      disabled={capturing}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${capturing ? 'animate-spin' : ''}`} />
                      <span>تحديث</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* التذييل وأزرار التنزيل */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
          >
            إغلاق
          </button>
          <button
            type="button"
            disabled={!snapshot || capturing}
            onClick={handleDownload}
            className="flex h-11 items-center gap-2 rounded-2xl bg-indigo-500 px-5 text-xs font-extrabold text-white shadow-sm transition hover:bg-indigo-400 active:scale-[0.98] disabled:opacity-50 sm:text-sm"
          >
            <Download className="h-4 w-4" />
            <span>تنزيل صورة المتجر (PNG)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
