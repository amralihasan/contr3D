import { Columns3, LayoutGrid, Plus, Rows3, Sparkles, Square, Trash2, X } from 'lucide-react'
import { MATERIALS } from '../../constants/materials'
import { PANEL_PRESETS } from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import type { PanelRole } from '../../types/furniture'

interface PartsSidebarProps {
  onCloseMobile?: () => void
}

function getPresetIcon(role: Exclude<PanelRole, 'custom'>) {
  switch (role) {
    case 'horizontal':
      return <Rows3 className="h-5 w-5 text-amber-400" />
    case 'vertical':
      return <Columns3 className="h-5 w-5 text-sky-400" />
    case 'shelf':
      return <LayoutGrid className="h-5 w-5 text-emerald-400" />
    case 'back':
      return <Square className="h-5 w-5 text-slate-300" />
  }
}

export function PartsSidebar({ onCloseMobile }: PartsSidebarProps) {
  const panels = useDesignStore((s) => s.panels)
  const selectedPanelId = useDesignStore((s) => s.selectedPanelId)
  const addPresetPanel = useDesignStore((s) => s.addPresetPanel)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const deletePanel = useDesignStore((s) => s.deletePanel)
  const resetToStarterTemplate = useDesignStore((s) => s.resetToStarterTemplate)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const handleAdd = (role: Exclude<PanelRole, 'custom'>) => {
    addPresetPanel(role)
    onCloseMobile?.()
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* رأس القائمة */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-100">إضافة ألواح الكونتر</h2>
          <p className="text-xs text-slate-400">اضغط لإضافة قطعة جاهزة</p>
        </div>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 lg:hidden"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* أزرار الإضافة السريعة */}
      <div className="space-y-2 p-3">
        {PANEL_PRESETS.map((preset) => (
          <button
            key={preset.role}
            type="button"
            onClick={() => handleAdd(preset.role)}
            className="group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-800/60 px-3.5 py-2.5 text-right transition hover:border-amber-500/50 hover:bg-slate-800 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700/80">
                {getPresetIcon(preset.role)}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-100">{preset.label}</div>
                <div className="tabular-nums text-xs text-slate-400">{preset.subtitle}</div>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-slate-950">
              <Plus className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* قائمة الألواح الموجودة في المشهد */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-800">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-bold text-slate-300">
            ألواح التصميم ({panels.length})
          </span>
          {panels.length > 0 && (
            <button
              type="button"
              onClick={newEmptyDesign}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300"
            >
              مسح الكل
            </button>
          )}
        </div>

        <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
          {panels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              لا توجد ألواح بعد. أضف لوحاً من الأعلى أو استخدم النموذج الجاهز.
            </div>
          ) : (
            panels.map((panel) => {
              const selected = panel.id === selectedPanelId
              const mat = MATERIALS[panel.materialId]
              return (
                <div
                  key={panel.id}
                  className={`flex min-h-[46px] items-center justify-between gap-2 rounded-xl border px-3 py-2 transition ${
                    selected
                      ? 'border-amber-500/70 bg-amber-500/15 text-amber-100'
                      : 'border-slate-800/80 bg-slate-950/40 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectPanel(panel.id)
                      onCloseMobile?.()
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20"
                      style={{ backgroundColor: mat.swatch }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-bold">{panel.name}</div>
                      <div className="tabular-nums truncate text-[11px] text-slate-400">
                        {panel.dimensions.width} × {panel.dimensions.height} × {panel.dimensions.depth} سم
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePanel(panel.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-400"
                    title="حذف اللوح"
                    aria-label={`حذف ${panel.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* نموذج جاهز سريع */}
      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={() => {
            resetToStarterTemplate()
            onCloseMobile?.()
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 text-xs font-bold text-slate-200 transition hover:bg-slate-800"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>تحميل وحدة كونتر نموذجية</span>
        </button>
      </div>
    </aside>
  )
}
