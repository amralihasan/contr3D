import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DesignsModal } from './components/layout/DesignsModal'
import { PartsSidebar } from './components/layout/PartsSidebar'
import { PropertiesPanel } from './components/layout/PropertiesPanel'
import { TopToolbar } from './components/layout/TopToolbar'
import { SceneCanvas } from './components/viewport/SceneCanvas'
import { ViewportOverlay } from './components/viewport/ViewportOverlay'
import { useDesignStore } from './store/useDesignStore'

export function App() {
  const [designsModalOpen, setDesignsModalOpen] = useState(false)
  const [partsDrawerOpen, setPartsDrawerOpen] = useState(false)
  const [propsDrawerOpen, setPropsDrawerOpen] = useState(false)

  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const panels = useDesignStore((s) => s.panels)
  const undo = useDesignStore((s) => s.undo)
  const redo = useDesignStore((s) => s.redo)
  const deletePanel = useDesignStore((s) => s.deletePanel)
  const selectPanel = useDesignStore((s) => s.selectPanel)

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null

  // اختصارات لوحة المفاتيح للكمبيوتر
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
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPanelId) {
        e.preventDefault()
        deletePanel(selectedPanelId)
        return
      }

      if (e.key === 'Escape') {
        if (designsModalOpen) {
          setDesignsModalOpen(false)
        } else if (selectedPanelId) {
          selectPanel(null)
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, deletePanel, selectPanel, selectedPanelId, designsModalOpen])

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-slate-950 text-slate-100">
      <TopToolbar
        onOpenDesignsModal={() => setDesignsModalOpen(true)}
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
        {/* القائمة اليمنى: إضافة الألواح (ثابتة على الشاشات الكبيرة) */}
        <div className="hidden h-full w-72 shrink-0 lg:block xl:w-80">
          <PartsSidebar />
        </div>

        {/* مساحة العمل 3D */}
        <main className="relative h-full min-w-0 flex-1">
          <SceneCanvas />
          <ViewportOverlay />

          {/* زر عائم مريح للتابلت عند تحديد لوح لفتح الخصائص بلمسة */}
          {selectedPanel && !propsDrawerOpen && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4 lg:hidden">
              <button
                type="button"
                onClick={() => setPropsDrawerOpen(true)}
                className="pointer-events-auto flex h-12 items-center gap-2 rounded-2xl border border-amber-500/60 bg-slate-900/95 px-4 text-xs font-bold text-amber-200 shadow-xl backdrop-blur-md transition active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                <span>تعديل خصائص: {selectedPanel.name}</span>
              </button>
            </div>
          )}
        </main>

        {/* القائمة اليسرى: خصائص اللوح المحدد (ثابتة على الشاشات الكبيرة) */}
        <div className="hidden h-full w-72 shrink-0 lg:block xl:w-80">
          <PropertiesPanel />
        </div>

        {/* درج الألواح للتابلت والموبايل */}
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
    </div>
  )
}

export default App
