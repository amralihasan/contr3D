import {
  BookmarkPlus,
  Check,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Scissors,
  Trash2,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useDesignStore } from '../../store/useDesignStore'

interface QuickActionMenuProps {
  contextMenuPosition?: { x: number; y: number } | null
  onCloseContextMenu?: () => void
}

export function QuickActionMenu({
  contextMenuPosition,
  onCloseContextMenu,
}: QuickActionMenuProps) {
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const clipboardCount = useDesignStore((s) => s.clipboard.length)
  const toolMode = useDesignStore((s) => s.toolMode)
  const activeReferenceEdge = useDesignStore((s) => s.activeReferenceEdge)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)

  const copySelected = useDesignStore((s) => s.copySelected)
  const cutSelected = useDesignStore((s) => s.cutSelected)
  const pasteClipboard = useDesignStore((s) => s.pasteClipboard)
  const duplicateSelected = useDesignStore((s) => s.duplicateSelected)
  const deleteSelected = useDesignStore((s) => s.deleteSelected)
  const saveAsCustomTemplate = useDesignStore((s) => s.saveAsCustomTemplate)

  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const hasSelection = selectedPanelIds.length > 0
  const hasClipboard = clipboardCount > 0

  const openSaveDialog = () => {
    setTemplateName(`وحدة مخصصة (${selectedPanelIds.length} قطعة)`)
    setSaveModalOpen(true)
  }

  const handleSaveTemplateSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!hasSelection) return
    saveAsCustomTemplate(templateName, 'selected')
    setSaveModalOpen(false)
    onCloseContextMenu?.()
  }

  // 1) قائمة الكليك يمين الموضعية على الكمبيوتر
  if (contextMenuPosition) {
    if (!hasSelection && !hasClipboard) return null

    const runAction = (fn: () => void) => {
      fn()
      onCloseContextMenu?.()
    }

    return (
      <div
        className="fixed inset-0 z-50"
        onClick={() => onCloseContextMenu?.()}
        onContextMenu={(e) => {
          e.preventDefault()
          onCloseContextMenu?.()
        }}
      >
        <div
          dir="rtl"
          style={{
            left: `${Math.min(contextMenuPosition.x, window.innerWidth - 250)}px`,
            top: `${Math.min(contextMenuPosition.y, window.innerHeight - 300)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-[210px] max-w-[260px] rounded-2xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          {saveModalOpen ? (
            <form onSubmit={handleSaveTemplateSubmit} className="space-y-2 p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-300">حفظ المحدد كقالب</span>
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="اسم القالب..."
                className="h-9 w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 text-xs text-white outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
              >
                <Check className="h-3.5 w-3.5" />
                <span>حفظ القالب</span>
              </button>
            </form>
          ) : (
            <>
              {hasSelection && (
                <>
                  <button
                    type="button"
                    onClick={() => runAction(copySelected)}
                    className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-sky-400" />
                      <span>نسخ</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Ctrl+C</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => runAction(cutSelected)}
                    className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-amber-400" />
                      <span>قص</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Ctrl+X</span>
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={!hasClipboard}
                onClick={() => runAction(pasteClipboard)}
                className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <ClipboardPaste className="h-4 w-4 text-emerald-400" />
                  <span>لصق {hasClipboard ? `(${clipboardCount})` : ''}</span>
                </span>
                <span className="text-[10px] text-slate-500">Ctrl+V</span>
              </button>

              {hasSelection && (
                <>
                  <button
                    type="button"
                    onClick={() => runAction(duplicateSelected)}
                    className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <CopyPlus className="h-4 w-4 text-violet-400" />
                      <span>تكرار</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Ctrl+D</span>
                  </button>

                  <button
                    type="button"
                    onClick={openSaveDialog}
                    className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/15"
                  >
                    <span className="flex items-center gap-2">
                      <BookmarkPlus className="h-4 w-4 text-amber-400" />
                      <span>حفظ كقالب</span>
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-800" />

                  <button
                    type="button"
                    onClick={() => runAction(deleteSelected)}
                    className="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      <span>حذف</span>
                    </span>
                    <span className="text-[10px] text-rose-400/70">Del</span>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // 2) الشريط العائم أسفل منتصف مساحة الـ 3D (مريح للمس على التابلت والماوس)
  if (toolMode !== 'select' || activeReferenceEdge || selectedGuideId) {
    return null
  }

  if (!hasSelection && !hasClipboard) {
    return null
  }

  // لا يوجد عنصر محدد ولكن الحافظة تحتوي عناصر: زر لصق مصغّر فقط
  if (!hasSelection && hasClipboard) {
    return (
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-emerald-500/50 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md">
        <button
          type="button"
          onClick={pasteClipboard}
          className="flex h-11 items-center gap-2 rounded-full bg-emerald-500/20 px-4 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30 active:scale-95"
          title="لصق العناصر المنسوخة (Ctrl+V)"
        >
          <ClipboardPaste className="h-4 w-4 text-emerald-300" />
          <span>لصق ({clipboardCount})</span>
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="pointer-events-auto relative flex flex-col items-center gap-2">
      {/* نافذة صغيرة لحفظ القطع المحددة كقالب مخصص */}
      {saveModalOpen && (
        <form
          onSubmit={handleSaveTemplateSubmit}
          className="w-72 rounded-2xl border border-amber-500/50 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md sm:w-80"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
              <BookmarkPlus className="h-4 w-4" />
              <span>حفظ المحدد كقالب ({selectedPanelIds.length} قطعة)</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            autoFocus
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="اكتب اسم القالب المخصص..."
            className="mb-2.5 h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs font-semibold text-white outline-none focus:border-amber-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
            >
              <Check className="h-4 w-4" />
              <span>حفظ القالب</span>
            </button>
            <button
              type="button"
              onClick={() => setSaveModalOpen(false)}
              className="h-10 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md sm:rounded-full">
        {selectedPanelIds.length > 1 && (
          <span className="tabular-nums px-2 text-[11px] font-extrabold text-amber-300">
            {selectedPanelIds.length} محدد
          </span>
        )}

        <button
          type="button"
          onClick={copySelected}
          className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800 active:scale-95 sm:rounded-full"
          title="نسخ (Ctrl+C)"
        >
          <Copy className="h-4 w-4 text-sky-400" />
          <span>نسخ</span>
        </button>

        <button
          type="button"
          onClick={cutSelected}
          className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800 active:scale-95 sm:rounded-full"
          title="قص (Ctrl+X)"
        >
          <Scissors className="h-4 w-4 text-amber-400" />
          <span>قص</span>
        </button>

        <button
          type="button"
          onClick={pasteClipboard}
          disabled={!hasClipboard}
          className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 sm:rounded-full"
          title="لصق (Ctrl+V)"
        >
          <ClipboardPaste className="h-4 w-4 text-emerald-400" />
          <span>لصق</span>
        </button>

        <button
          type="button"
          onClick={duplicateSelected}
          className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-100 transition hover:bg-slate-800 active:scale-95 sm:rounded-full"
          title="تكرار (Ctrl+D)"
        >
          <CopyPlus className="h-4 w-4 text-violet-400" />
          <span>تكرار</span>
        </button>

        <button
          type="button"
          onClick={openSaveDialog}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 text-xs font-bold text-amber-200 transition hover:bg-amber-500/25 active:scale-95 sm:rounded-full"
          title="حفظ العناصر المحددة كقالب مخصص"
        >
          <BookmarkPlus className="h-4 w-4 text-amber-300" />
          <span>حفظ كقالب</span>
        </button>

        <button
          type="button"
          onClick={deleteSelected}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25 active:scale-95 sm:rounded-full"
          title="حذف (Delete)"
        >
          <Trash2 className="h-4 w-4" />
          <span>حذف</span>
        </button>
      </div>
    </div>
  )
}
