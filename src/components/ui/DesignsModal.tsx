import { Check, FilePlus2, FolderOpen, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

interface DesignsModalProps {
  open: boolean
  onClose: () => void
}

export function DesignsModal({ open, onClose }: DesignsModalProps) {
  if (!open) return null
  return <DesignsModalContent onClose={onClose} />
}

function DesignsModalContent({ onClose }: { onClose: () => void }) {
  const currentDesignName = useDesignStore((s) => s.currentDesignName)
  const currentDesignId = useDesignStore((s) => s.currentDesignId)
  const panels = useDesignStore((s) => s.panels)
  const savedDesigns = useDesignStore((s) => s.savedDesigns)
  const saveCurrentDesign = useDesignStore((s) => s.saveCurrentDesign)
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const removeSavedDesign = useDesignStore((s) => s.removeSavedDesign)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const [nameInput, setNameInput] = useState(currentDesignName)
  const [savedNotice, setSavedNotice] = useState(false)

  const handleSave = (asNew = false) => {
    saveCurrentDesign(nameInput, asNew)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  const formatDate = (ts: number) => {
    try {
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(ts))
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">حفظ واسترجاع التصاميم</h2>
            <p className="text-xs text-slate-400">
              يتم الحفظ محلياً في المتصفح (عدد الألواح الحالية: {panels.length})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* نموذج الحفظ */}
        <div className="border-b border-slate-800 bg-slate-950/40 p-5">
          <label className="mb-1.5 block text-xs font-bold text-slate-300">اسم التصميم</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="مثال: دولاب مطبخ علوي 120 سم"
            className="mb-3 h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 text-sm font-semibold text-white outline-none focus:border-amber-500"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
            >
              {savedNotice ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>{savedNotice ? 'تم الحفظ بنجاح' : 'حفظ التصميم'}</span>
            </button>

            {currentDesignId && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                حفظ كنسخة جديدة
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                newEmptyDesign()
                onClose()
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              <FilePlus2 className="h-4 w-4 text-sky-400" />
              <span>تصميم جديد</span>
            </button>
          </div>
        </div>

        {/* قائمة التصاميم المحفوظة */}
        <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-5">
          <div className="mb-2 text-xs font-bold text-slate-400">
            التصاميم المحفوظة ({savedDesigns.length})
          </div>

          {savedDesigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
              لا توجد تصاميم محفوظة بعد. اكتب اسماً واضغط &quot;حفظ التصميم&quot;.
            </div>
          ) : (
            savedDesigns.map((design) => {
              const isCurrent = design.id === currentDesignId
              return (
                <div
                  key={design.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                    isCurrent
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-100">
                        {design.name}
                      </span>
                      {isCurrent && (
                        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          مفتوح حالياً
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {design.panels.length} لوح · {formatDate(design.updatedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        loadDesign(design.id)
                        onClose()
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-100 hover:bg-slate-700"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
                      <span>فتح</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSavedDesign(design.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                      aria-label={`حذف ${design.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
