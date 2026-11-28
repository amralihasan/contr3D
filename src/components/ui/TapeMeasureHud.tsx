import { ArrowLeftRight, Check, Minus, PencilRuler, Plus, Ruler, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import type { TapeMeasureDraft } from '../../types/furniture'
import { formatDirectionLabel, getAxisColor, getAxisLabelAr } from '../../utils/tapeMeasure'

interface TapePointDistanceBarProps {
  draft: TapeMeasureDraft
  onCommit: (distanceCm: number) => void
  onCancel: () => void
}

function TapePointDistanceBar({ draft, onCommit, onCancel }: TapePointDistanceBarProps) {
  const [pointDistanceText, setPointDistanceText] = useState('')
  const [isTypingPointDistance, setIsTypingPointDistance] = useState(false)
  const pointInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return

      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault()
        setIsTypingPointDistance(true)
        setPointDistanceText((prev) => (prev === '' && e.key === '.' ? '0.' : prev + e.key))
        pointInputRef.current?.focus()
        return
      }

      if (e.key === 'Backspace' && pointDistanceText.length > 0) {
        e.preventDefault()
        setPointDistanceText((prev) => prev.slice(0, -1))
        pointInputRef.current?.focus()
        return
      }

      if (e.key === 'Enter') {
        const parsed = Number.parseFloat(pointDistanceText)
        if (Number.isFinite(parsed) && parsed > 0) {
          e.preventDefault()
          onCommit(parsed)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pointDistanceText, onCommit])

  const submitPointDistance = () => {
    const rawText = isTypingPointDistance ? pointDistanceText : String(draft.distanceCm)
    const parsed = Number.parseFloat(rawText)
    if (Number.isFinite(parsed) && parsed > 0) {
      onCommit(parsed)
    }
  }

  return (
    <div
      data-tape-hud="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
    >
      <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-400/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-extrabold text-white">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getAxisColor(draft.lockedAxis) }}
            />
            <span>{getAxisLabelAr(draft.lockedAxis)}</span>
          </div>
          <div className="text-[11px] font-semibold text-slate-400">
            اكتب المسافة المطلوبة واضغط Enter لتثبيت العلام بدقة
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="tape-distance-input" className="text-xs font-bold text-amber-300">
            المسافة (سم)
          </label>

          <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-2.5">
            <input
              id="tape-distance-input"
              ref={pointInputRef}
              type="number"
              step="0.1"
              min={0.1}
              max={999}
              value={isTypingPointDistance ? pointDistanceText : String(draft.distanceCm)}
              onFocus={() => {
                setPointDistanceText(draft.distanceCm > 0 ? String(draft.distanceCm) : '')
                setIsTypingPointDistance(true)
              }}
              onChange={(e) => {
                setIsTypingPointDistance(true)
                setPointDistanceText(e.target.value)
              }}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') {
                  submitPointDistance()
                } else if (e.key === 'Escape') {
                  onCancel()
                }
              }}
              className="tabular-nums h-11 w-24 bg-transparent text-center text-sm font-extrabold text-white outline-none"
            />
            <span className="text-xs font-bold text-slate-400">سم</span>
          </div>

          <button
            type="button"
            onClick={submitPointDistance}
            className="flex h-11 items-center gap-1.5 rounded-xl bg-amber-400 px-4 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
          >
            <Check className="h-4 w-4" />
            <span>تثبيت</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
            aria-label="إلغاء القياس الحالي"
            title="إلغاء القياس الحالي"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

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

  const tapeMeasureDraft = useDesignStore((s) => s.tapeMeasureDraft)
  const setTapeMeasureDraft = useDesignStore((s) => s.setTapeMeasureDraft)
  const commitTapeDraftDistance = useDesignStore((s) => s.commitTapeDraftDistance)

  const guides = useDesignStore((s) => s.guides)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)
  const selectGuide = useDesignStore((s) => s.selectGuide)
  const updateGuideDistance = useDesignStore((s) => s.updateGuideDistance)
  const flipGuideDirection = useDesignStore((s) => s.flipGuideDirection)
  const deleteGuide = useDesignStore((s) => s.deleteGuide)

  const selectedGuide = guides.find((g) => g.id === selectedGuideId) ?? null
  const [editGuideDraft, setEditGuideDraft] = useState('')
  const [isEditingSelectedGuide, setIsEditingSelectedGuide] = useState(false)
  const [draftInputText, setDraftInputText] = useState('')
  const [isEditingDraftInput, setIsEditingDraftInput] = useState(false)

  const isMeasureDraftActive =
    toolMode === 'tape' && tapeMode === 'measure' && tapeMeasureDraft !== null

  return (
    <>
      {/* شريط وضع أداة المتر أعلى وسط المشهد */}
      {toolMode === 'tape' && (
        <div
          data-tape-hud="true"
          className="pointer-events-none absolute inset-x-3 top-14 z-20 flex flex-col items-center gap-1.5 sm:top-3"
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-cyan-500/50 bg-slate-900/95 p-1.5 shadow-xl backdrop-blur-md">
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
              <span>قياس وعلام (نقطة ← نقطة)</span>
            </button>

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
              <span>علام من حافة</span>
            </button>

            <button
              type="button"
              onClick={() => setToolMode('select')}
              className="flex h-10 items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              <span>إنهاء (Esc)</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/85 px-3 py-1 text-[11px] font-semibold text-slate-300 backdrop-blur-sm">
            {tapeMode === 'measure'
              ? tapeMeasureDraft
                ? 'اضغط لتثبيت العلام أو اكتب المسافة (سم) ثم اضغط Enter'
                : 'اضغط على أي زاوية أو منتصف حافة لبدء القياس، واضغط في أي اتجاه لتثبيت العلام'
              : 'اضغط على حافة لوح ثم اسحب لعمل علام، أو اضغط الحافة لإدخال المسافة رقمياً'}
          </div>
        </div>
      )}

      {/* خانة المسافة (سم) السفلية أثناء القياس نقطة إلى نقطة (مثل SketchUp) */}
      {isMeasureDraftActive && tapeMeasureDraft && (
        <TapePointDistanceBar
          key={tapeMeasureDraft.start.join(',')}
          draft={tapeMeasureDraft}
          onCommit={commitTapeDraftDistance}
          onCancel={() => setTapeMeasureDraft(null)}
        />
      )}

      {/* خانة الإدخال السريعة بعد اختيار حافة مرجعية */}
      {toolMode === 'tape' && tapeMode === 'guide' && activeReferenceEdge && (
        <div
          data-tape-hud="true"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
        >
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
                  value={isEditingDraftInput ? draftInputText : String(draftGuideDistanceCm)}
                  onFocus={() => {
                    setDraftInputText(String(draftGuideDistanceCm))
                    setIsEditingDraftInput(true)
                  }}
                  onChange={(e) => {
                    const txt = e.target.value
                    setDraftInputText(txt)
                    const v = Number.parseFloat(txt)
                    if (Number.isFinite(v)) {
                      setDraftGuideParams(v, draftGuideDirection)
                    }
                  }}
                  onBlur={() => {
                    setIsEditingDraftInput(false)
                    const v = Number.parseFloat(draftInputText)
                    if (Number.isFinite(v)) {
                      setDraftGuideParams(v, draftGuideDirection)
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      setIsEditingDraftInput(false)
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
      {selectedGuide && !activeReferenceEdge && !isMeasureDraftActive && (
        <div
          data-tape-hud="true"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3"
        >
          <div className="pointer-events-auto flex w-full max-w-lg flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-400/60 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-amber-300">
                علام محدد ({selectedGuide.panelName})
              </div>
              <div className="text-xs font-bold text-slate-200">
                {selectedGuide.kind === 'point'
                  ? getAxisLabelAr(selectedGuide.lockedAxis ?? null)
                  : `من ${selectedGuide.edgeLabel} · ${formatDirectionLabel(
                      selectedGuide.offsetAxis,
                      selectedGuide.direction
                    )}`}
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
                  step="0.1"
                  min={0}
                  max={999}
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
                    e.stopPropagation()
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
