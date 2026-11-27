import { ArrowLeftRight, Check, Minus, PencilRuler, Plus, Ruler, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { formatDirectionLabel } from '../../utils/tapeMeasure'

export function TapeMeasureHud() {
  const toolMode = useDesignStore((s) => s.toolMode)
  const setToolMode = useDesignStore((s) => s.setToolMode)
  const tapeMode = useDesignStore((s) => s.tapeMode)
  const setTapeMode = useDesignStore((s) => s.setTapeMode)

  const activeReferenceEdge = useDesignStore((s) => s.activeReferenceEdge)
  const setActiveReferenceEdge = useDesignStore((s) => s.setActiveReferenceEdge)
  const draftGuideDistanceCm = useDesignStore((s) => s.draftGuideDistanceCm)
  const draftGuideDirection = useDesignStore((s) => s.draftGuideDirection)
  const setDraftGuideParams = useDesignStore((s) => s.setDraftGuideParams)
  const commitDraftGuide = useDesignStore((s) => s.commitDraftGuide)

  const guides = useDesignStore((s) => s.guides)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)
  const selectGuide = useDesignStore((s) => s.selectGuide)
  const updateGuideDistance = useDesignStore((s) => s.updateGuideDistance)
  const flipGuideDirection = useDesignStore((s) => s.flipGuideDirection)
  const deleteGuide = useDesignStore((s) => s.deleteGuide)

  const selectedGuide = guides.find((g) => g.id === selectedGuideId) ?? null
  const [editGuideDraft, setEditGuideDraft] = useState('')
  const [isEditingSelectedGuide, setIsEditingSelectedGuide] = useState(false)

  return (
    <>
      {/* شريط وضع أداة المتر أعلى وسط المشهد */}
      {toolMode === 'tape' && (
        <div className="pointer-events-none absolute inset-x-3 top-14 z-20 flex flex-col items-center gap-1.5 sm:top-3">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/50 bg-slate-900/95 p-1.5 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTapeMode('guide')}
              className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                tapeMode === 'guide'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <PencilRuler className="h-4 w-4" />
              <span>عمل علام (خط إرشادي)</span>
            </button>

            <button
              type="button"
              onClick={() => setTapeMode('measure')}
              className={`flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                tapeMode === 'measure'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Ruler className="h-4 w-4" />
              <span>قياس مسافة</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="flex h-10 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>إنهاء</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-sm">
            {tapeMode === 'guide'
              ? 'اضغط على حافة لوح ثم اسحب لعمل علام، أو اضغط الحافة لإدخال المسافة رقمياً'
              : 'اضغط نقطة البداية ثم نقطة النهاية على الألواح لقراءة المسافة'}
          </div>
        </div>
      )}

      {/* خانة الإدخال السريعة العائمة للتابلت بعد اختيار حافة مرجعية */}
      {toolMode === 'tape' && tapeMode === 'guide' && activeReferenceEdge && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
          <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-cyan-500/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-cyan-300">
                مرجع العلام: {activeReferenceEdge.edgeLabel} ({activeReferenceEdge.panelName})
              </div>
              <div className="text-xs font-bold text-slate-200">
                الاتجاه: {formatDirectionLabel(activeReferenceEdge.offsetAxis, draftGuideDirection)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDraftGuideParams(
                    Math.max(0, draftGuideDistanceCm - 1),
                    draftGuideDirection
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                aria-label="إنقاص المسافة"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-2">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={400}
                  value={draftGuideDistanceCm}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value)
                    setDraftGuideParams(Number.isFinite(v) ? v : 0, draftGuideDirection)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      commitDraftGuide()
                    }
                  }}
                  className="tabular-nums h-11 w-20 bg-transparent text-center text-sm font-extrabold text-white outline-none"
                />
                <span className="text-xs font-bold text-slate-400">سم</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDraftGuideParams(draftGuideDistanceCm + 1, draftGuideDirection)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                aria-label="زيادة المسافة"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraftGuideParams(
                    draftGuideDistanceCm,
                    draftGuideDirection === 1 ? -1 : 1
                  )
                }
                className="flex h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
                title="عكس الاتجاه"
              >
                <ArrowLeftRight className="h-4 w-4 text-cyan-300" />
                <span className="hidden sm:inline">عكس</span>
              </button>

              <button
                type="button"
                onClick={commitDraftGuide}
                className="flex h-11 items-center gap-1.5 rounded-xl bg-cyan-400 px-4 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-300"
              >
                <Check className="h-4 w-4" />
                <span>تثبيت العلام</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveReferenceEdge(null)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                aria-label="إلغاء"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* تعديل أو حذف علام محدد */}
      {selectedGuide && !activeReferenceEdge && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
          <div className="pointer-events-auto flex w-full max-w-lg flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-400/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-amber-300">
                علام محدد ({selectedGuide.panelName})
              </div>
              <div className="text-xs font-bold text-slate-200">
                من {selectedGuide.edgeLabel} ·{' '}
                {formatDirectionLabel(selectedGuide.offsetAxis, selectedGuide.direction)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateGuideDistance(
                    selectedGuide.id,
                    Math.max(0, selectedGuide.distanceCm - 1)
                  )
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                aria-label="إنقاص مسافة العلام"
              >
                <Minus className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-2">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={400}
                  value={
                    isEditingSelectedGuide ? editGuideDraft : String(selectedGuide.distanceCm)
                  }
                  onFocus={() => {
                    setEditGuideDraft(String(selectedGuide.distanceCm))
                    setIsEditingSelectedGuide(true)
                  }}
                  onChange={(e) => setEditGuideDraft(e.target.value)}
                  onBlur={() => {
                    setIsEditingSelectedGuide(false)
                    const v = Number.parseFloat(editGuideDraft)
                    if (Number.isFinite(v)) {
                      updateGuideDistance(selectedGuide.id, v)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                  className="tabular-nums h-11 w-20 bg-transparent text-center text-sm font-extrabold text-white outline-none"
                />
                <span className="text-xs font-bold text-slate-400">سم</span>
              </div>

              <button
                type="button"
                onClick={() =>
                  updateGuideDistance(selectedGuide.id, selectedGuide.distanceCm + 1)
                }
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                aria-label="زيادة مسافة العلام"
              >
                <Plus className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => flipGuideDirection(selectedGuide.id)}
                className="flex h-11 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
                title="عكس اتجاه العلام"
              >
                <ArrowLeftRight className="h-4 w-4 text-amber-300" />
              </button>

              <button
                type="button"
                onClick={() => deleteGuide(selectedGuide.id)}
                className="flex h-11 items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                title="حذف هذا العلام"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف</span>
              </button>

              <button
                type="button"
                onClick={() => selectGuide(null)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
