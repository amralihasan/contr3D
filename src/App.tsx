import {
  AlignVerticalSpaceAround,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { SceneCanvas } from './components/canvas/SceneCanvas'
import { ViewportOverlay } from './components/canvas/ViewportOverlay'
import { AuthGate } from './components/ui/AuthGate'
import { DesignsModal } from './components/ui/DesignsModal'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { PartsSidebar } from './components/ui/PartsSidebar'
import { PropertiesPanel } from './components/ui/PropertiesPanel'
import { QuickActionMenu } from './components/ui/QuickActionMenu'
import { TapeMeasureHud } from './components/ui/TapeMeasureHud'
import { TopToolbar } from './components/ui/TopToolbar'
import { WorkshopReportModal } from './components/ui/WorkshopReportModal'
import { useAutoSave } from './hooks/useAutoSave'
import { useDesignStore } from './store/useDesignStore'
import { checkStoredAuthSession, clearAuthSession } from './utils/auth'

function WorkspaceApp({ onLock }: { onLock: () => void }) {
  useAutoSave()
  const [designsModalOpen, setDesignsModalOpen] = useState(false)
  const [workshopReportOpen, setWorkshopReportOpen] = useState(false)
  const [mobilePartsOpen, setMobilePartsOpen] = useState(false)
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  const partsSidebarOpen = useDesignStore((s) => s.partsSidebarOpen)
  const propsSidebarOpen = useDesignStore((s) => s.propsSidebarOpen)
  const togglePartsSidebar = useDesignStore((s) => s.togglePartsSidebar)
  const togglePropsSidebar = useDesignStore((s) => s.togglePropsSidebar)
  const toggleFocusMode = useDesignStore((s) => s.toggleFocusMode)

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

  // اختصارات لوحة المفاتيح (بما فيها Tab لوضع التركيز)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) return

      if (e.key === 'Tab' && !designsModalOpen && !workshopReportOpen) {
        e.preventDefault()
        toggleFocusMode()
        return
      }

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
    toggleFocusMode,
    selectedPanelIds,
    selectedGuideId,
    toolMode,
    activeReferenceEdge,
    designsModalOpen,
    workshopReportOpen,
    contextMenuPos,
  ])

  const hideBottomFloatingActions =
    mobilePropsOpen || Boolean(selectedGuideId) || Boolean(activeReferenceEdge)

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 print:hidden">
      <TopToolbar
        onOpenDesignsModal={() => setDesignsModalOpen(true)}
        onOpenWorkshopReport={() => setWorkshopReportOpen(true)}
        onTogglePartsDrawer={() => {
          setMobilePartsOpen((v) => !v)
          setMobilePropsOpen(false)
        }}
        onTogglePropsDrawer={() => {
          setMobilePropsOpen((v) => !v)
          setMobilePartsOpen(false)
        }}
        onLockApp={onLock}
        isPartsOpen={mobilePartsOpen}
        isPropsOpen={mobilePropsOpen}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* القائمة اليمنى: مكتبة الأجزاء (قابلة للطي بسلاسة على الكمبيوتر والتابلت) */}
        <div
          className={`hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block ${
            partsSidebarOpen ? 'w-68 lg:w-72' : 'w-0'
          }`}
        >
          <div className="h-full w-68 lg:w-72">
            <PartsSidebar />
          </div>
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
          <ErrorBoundary compact title="تعذر تشغيل مشهد العرض ثلاثي الأبعاد (3D)">
            <SceneCanvas />
          </ErrorBoundary>
          <ViewportOverlay />
          <TapeMeasureHud />

          {/* زر طي/فتح القائمة اليمنى (Chevron Toggle Tab) */}
          <button
            type="button"
            onClick={togglePartsSidebar}
            className="hidden md:flex absolute right-0 top-1/2 z-20 h-14 w-6 -translate-y-1/2 items-center justify-center rounded-l-xl border border-r-0 border-slate-700/80 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur-md transition hover:bg-slate-800 hover:text-amber-300"
            title={partsSidebarOpen ? 'طي مكتبة الأجزاء' : 'إظهار مكتبة الأجزاء'}
            aria-label={partsSidebarOpen ? 'طي مكتبة الأجزاء' : 'إظهار مكتبة الأجزاء'}
          >
            {partsSidebarOpen ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>

          {/* زر طي/فتح القائمة اليسرى (Chevron Toggle Tab) */}
          <button
            type="button"
            onClick={togglePropsSidebar}
            className="hidden md:flex absolute left-0 top-1/2 z-20 h-14 w-6 -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-700/80 bg-slate-900/90 text-slate-300 shadow-lg backdrop-blur-md transition hover:bg-slate-800 hover:text-amber-300"
            title={propsSidebarOpen ? 'طي لوحة الخصائص' : 'إظهار لوحة الخصائص'}
            aria-label={propsSidebarOpen ? 'طي لوحة الخصائص' : 'إظهار لوحة الخصائص'}
          >
            {propsSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* الشريط العائم للإجراءات السريعة + أزرار الموبايل */}
          {!hideBottomFloatingActions && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex flex-col items-center gap-2 px-3">
              {selectedPanelIds.length >= 2 && (
                <div className="flex justify-center gap-2 md:hidden">
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
                    onClick={() => setMobilePropsOpen(true)}
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/95 px-4 text-xs font-bold text-slate-100 shadow-xl backdrop-blur-md transition active:scale-95"
                  >
                    <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                    <span>خيارات</span>
                  </button>
                </div>
              )}

              {selectedPanelIds.length === 1 && selectedPanel && (
                <div className="flex justify-center md:hidden">
                  <button
                    type="button"
                    onClick={() => setMobilePropsOpen(true)}
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

        {/* القائمة اليسرى: خصائص العنصر (قابلة للطي بسلاسة على الكمبيوتر والتابلت) */}
        <div
          className={`hidden h-full shrink-0 overflow-hidden transition-[width] duration-200 ease-out md:block ${
            propsSidebarOpen ? 'w-68 lg:w-72' : 'w-0'
          }`}
        >
          <div className="h-full w-68 lg:w-72">
            <PropertiesPanel />
          </div>
        </div>

        {/* درج الأجزاء للموبايل والشاشات الصغيرة */}
        {mobilePartsOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setMobilePartsOpen(false)}
            />
            <div className="relative z-10 h-full w-80 max-w-[85vw] shadow-2xl">
              <PartsSidebar onCloseMobile={() => setMobilePartsOpen(false)} />
            </div>
          </div>
        )}

        {/* درج الخصائص للموبايل والشاشات الصغيرة */}
        {mobilePropsOpen && (
          <div className="fixed inset-0 z-40 flex justify-end md:hidden">
            <div
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px]"
              onClick={() => setMobilePropsOpen(false)}
            />
            <div className="relative z-10 h-full w-80 max-w-[88vw] shadow-2xl">
              <PropertiesPanel onCloseMobile={() => setMobilePropsOpen(false)} />
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

export function App() {
  const [authStatus, setAuthStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking')

  useEffect(() => {
    let active = true
    checkStoredAuthSession()
      .then((ok) => {
        if (active) setAuthStatus(ok ? 'unlocked' : 'locked')
      })
      .catch(() => {
        if (active) setAuthStatus('locked')
      })
    return () => {
      active = false
    }
  }, [])

  if (authStatus === 'checking') {
    return (
      <div
        dir="rtl"
        className="flex min-h-dvh w-screen items-center justify-center bg-slate-950 text-sm text-slate-400"
      >
        جاري التحقق من الجلسة...
      </div>
    )
  }

  if (authStatus === 'locked') {
    return <AuthGate onAuthenticated={() => setAuthStatus('unlocked')} />
  }

  return (
    <WorkspaceApp
      onLock={() => {
        clearAuthSession()
        setAuthStatus('locked')
      }}
    />
  )
}

export default App
