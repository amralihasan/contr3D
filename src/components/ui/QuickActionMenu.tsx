import { ClipboardPaste, Copy, CopyPlus, Scissors, Trash2 } from 'lucide-react'
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

  const hasSelection = selectedPanelIds.length > 0
  const hasClipboard = clipboardCount > 0

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
            left: `${Math.min(contextMenuPosition.x, window.innerWidth - 210)}px`,
            top: `${Math.min(contextMenuPosition.y, window.innerHeight - 260)}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 min-w-[190px] rounded-2xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
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
    <div
      dir="rtl"
      className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md sm:rounded-full"
    >
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
        onClick={deleteSelected}
        className="flex h-11 items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 text-xs font-bold text-rose-300 transition hover:bg-rose-500/25 active:scale-95 sm:rounded-full"
        title="حذف (Delete)"
      >
        <Trash2 className="h-4 w-4" />
        <span>حذف</span>
      </button>
    </div>
  )
}
