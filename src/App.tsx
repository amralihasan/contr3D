import { AlignVerticalSpaceAround, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SceneCanvas } from './components/canvas/SceneCanvas'
import { ViewportOverlay } from './components/canvas/ViewportOverlay'
import { DesignsModal } from './components/ui/DesignsModal'
import { PartsSidebar } from './components/ui/PartsSidebar'
import { PropertiesPanel } from './components/ui/PropertiesPanel'
import { QuickActionMenu } from './components/ui/QuickActionMenu'
import { TapeMeasureHud } from './components/ui/TapeMeasureHud'
import { TopToolbar } from './components/ui/TopToolbar'
import { WorkshopReportModal } from './components/ui/WorkshopReportModal'
import { useDesignStore } from './store/useDesignStore'

export function App() {
  const [designsModalOpen, setDesignsModalOpen] = useState(false)
  const [workshopReportOpen, setWorkshopReportOpen] = useState(false)
  const [partsDrawerOpen, setPartsDrawerOpen] = useState(false)
  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const selectedGuideId = useDesignStore((s) => s.selectedGuideId)
  const toolMode = useDesignStore((s) => s.toolMode)
  const activeReferenceEdge = useDesignStore((s) => s.activeReferenceEdge)
  const panels = useDesignStore((s) => s.panels)

  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const copySelected = useDesignStore((s) => s.copySelected)
  const cutSelected = useDesignStore((s) => s.cutSelected)
  const pasteClipboard = useDesignStore((s) => s.pasteClipboard)
  const duplicateSelected = useDesignStore((s) => s.duplicateSelected)
  const deleteSelected = useDesignStore((s) => s.deleteSelected)
  const deleteGuide = useDesignStore((s) => s.deleteGuide)
  const selectGuide = useDesignStore((s) => s.selectGuide)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const setToolMode = useDesignStore((s) => s.setToolMode)
  const setActiveReferenceEdge = useDesignStore((s) => s.setActiveReferenceEdge)
  const autoDistributeSelected = useDesignStore((s) => s.autoDistributeSelected)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null

  // اختصارات لوحة المفاتيح للكمبيوتر (تدعم لوحة المفاتيح العربية والإنجليزية عبر e.code)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      if (isInput) return

      const mod = e.ctrlKey || e.metaKey
      const code = e.code
      const key = e.key.toLowerCase()

      if (mod && (code === 'KeyZ' || key === 'z')) {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (mod && (code === 'KeyY' || key === 'y')) {
        e.preventDefault()
        redo()
        return
      }

      if (mod && (code === 'KeyC' || key === 'c')) {
        if (selectedPanelIds.length > 0) {
          e.preventDefault()
          copySelected()
        }
        return
      }

      if (mod && (code === 'KeyX' || key === 'x')) {
        if (selectedPanelIds.length > 0) {
          e.preventDefault()
          cutSelected()
        }
        return
      }

      if (mod && (code === 'KeyV' || key === 'v')) {
        if (useDesignStore.getState().clipboard.length > 0) {
          e.preventDefault()
          pasteClipboard()
        }
        return
      }

      if (mod && (code === 'KeyD' || key === 'd')) {
        e.preventDefault()
        if (selectedPanelIds.length > 0) {
          duplicateSelected()
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGuideId) {
          e.preventDefault()
          deleteGuide(selectedGuideId)
          return
        }
        if (selectedPanelIds.length > 0) {
          e.preventDefault()
          deleteSelected()
          return
        }
      }

      if (e.key === 'Escape') {
        if (contextMenuPos) {
          setContextMenuPos(null)
        } else if (workshopReportOpen) {
          setWorkshopReportOpen(false)
        } else if (designsModalOpen) {
          setDesignsModalOpen(false)
        } else if (activeReferenceEdge) {
          setActiveReferenceEdge(null)
        } else if (selectedGuideId) {
          selectGuide(null)
        } else if (toolMode === 'tape') {
          setToolMode('select')
        } else if (selectedPanelIds.length > 0) {
          selectPanel(null)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    undo,
    redo,
    copySelected,
    cutSelected,
    pasteClipboard,
    duplicateSelected,
    deleteSelected,
    deleteGuide,
    selectGuide,
    selectPanel,
    setToolMode,
    setActiveReferenceEdge,
    selectedPanelIds,
    selectedGuideId,
    toolMode,
    activeReferenceEdge,
    designsModalOpen,
    workshopReportOpen,
    contextMenuPos,
  ])

  const hideBottomFloatingActions =
    propsDrawerOpen || Boolean(selectedGuideId) || Boolean(activeReferenceEdge)

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 print:hidden">
      <TopToolbar
        onOpenDesignsModal={() => setDesignsModalOpen(true)}
        onOpenWorkshopReport={() => setWorkshopReportOpen(true)}
        onTogglePartsDrawer={() => {
          setPartsDrawerOpen((v) => !v)
          setPropsDrawerOpen(false)
        }}
        onTogglePropsDrawer={() => {
          setPropsDrawerOpen((v) => !v)
          setPartsDrawerOpen(false)
        }}
        isPartsOpen={partsDrawerOpen}
        isPropsOpen={propsDrawerOpen}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* القائمة اليمنى: مكتبة الأجزاء (ثابتة على الشاشات الكبيرة) */}
        <div className="hidden h-full w-72 shrink-0 lg:block xl:w-80">
          <PartsSidebar />
        </div>

        {/* مساحة العمل 3D */}
        <main
          className="relative h-full min-w-0 flex-1"
          onContextMenu={(e) => {
            if (toolMode !== 'select') return
            const state = useDesignStore.getState()
            if (state.selectedPanelIds.length > 0 || state.clipboard.length > 0) {
              e.preventDefault()
              setContextMenuPos({ x: e.clientX, y: e.clientY })
            }
          }}
        >
          <SceneCanvas />
          <ViewportOverlay />
          <TapeMeasureHud />

          {/* الشريط العائم للإجراءات السريعة + أزرار التابلت السريعة بدون أي تعارض */}
          {!hideBottomFloatingActions && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-3">
              {selectedPanelIds.length >= 2 && (
                <div className="flex justify-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => autoDistributeSelected()}
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl bg-emerald-500 px-4 text-xs font-bold text-slate-950 shadow-xl transition active:scale-95"
                  >
                    <AlignVerticalSpaceAround className="h-4 w-4" />
                    <span>توزيع متساوي ({selectedPanelIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPropsDrawerOpen(true)}
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 text-xs font-bold text-slate-100 shadow-xl backdrop-blur-md transition active:scale-95"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                    <span>خيارات</span>
                  </button>
                </div>
              )}

              {selectedPanelIds.length === 1 && selectedPanel && (
                <div className="flex justify-center lg:hidden">
                  <button
                    type="button"
                    onClick={() => setPropsDrawerOpen(true)}
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-amber-500/60 bg-slate-900/95 px-4 text-xs font-bold text-amber-200 shadow-xl backdrop-blur-md transition active:scale-95"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                    <span>تعديل خصائص: {selectedPanel.name}</span>
                  </button>
                </div>
              )}

              <QuickActionMenu />
            </div>
          )}

          {/* قائمة الكليك يمين الموضعية على الكمبيوتر */}
          {contextMenuPos && (
            <QuickActionMenu
              contextMenuPosition={contextMenuPos}
              onCloseContextMenu={() => setContextMenuPos(null)}
            />
          )}
        </main>

        {/* القائمة اليسرى: خصائص العنصر المحدد (ثابتة على الشاشات الكبيرة) */}
        <div className="hidden h-full w-72 shrink-0 lg:block xl:w-80">
          <PropertiesPanel />
        </div>

        {/* درج الأجزاء للتابلت والموبايل */}
        {partsDrawerOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setPartsDrawerOpen(false)}
            />
            <div className="relative z-10 h-full w-80 max-w-[85vw] shadow-2xl">
              <PartsSidebar onCloseMobile={() => setPartsDrawerOpen(false)} />
            </div>
          </div>
        )}

        {/* درج الخصائص للتابلت والموبايل */}
        {propsDrawerOpen && (
          <div className="fixed inset-0 z-40 flex justify-end lg:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setPropsDrawerOpen(false)}
            />
            <div className="relative z-10 h-full w-80 max-w-[88vw] shadow-2xl">
              <PropertiesPanel onCloseMobile={() => setPropsDrawerOpen(false)} />
            </div>
          </div>
        )}
      </div>

      <DesignsModal open={designsModalOpen} onClose={() => setDesignsModalOpen(false)} />
      <WorkshopReportModal
        open={workshopReportOpen}
        onClose={() => setWorkshopReportOpen(false)}
      />
    </div>
  )
}

export default App
