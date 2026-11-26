import {
  AlignVerticalSpaceAround,
  BoxSelect,
  CheckSquare,
  Columns3,
  DoorClosed,
  Footprints,
  LayoutGrid,
  PanelBottom,
  Plus,
  Rows3,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { MATERIALS } from '../../constants/materials'
import {
  BASE_PRESETS,
  INTERFACE_PRESETS,
  PANEL_PRESETS,
  type PanelPreset,
} from '../../constants/presets'
import { useDesignStore } from '../../store/useDesignStore'
import type { PanelRole } from '../../types/furniture'

interface PartsSidebarProps {
  onCloseMobile?: () => void
}

type SidebarTab = 'panels' | 'fronts' | 'bases'

function getPresetIcon(role: Exclude<PanelRole, 'custom'>) {
  switch (role) {
    case 'horizontal':
      return <Rows3 className="h-5 w-5 text-amber-400" />
    case 'vertical':
    case 'divider':
      return <Columns3 className="h-5 w-5 text-sky-400" />
    case 'shelf':
      return <LayoutGrid className="h-5 w-5 text-emerald-400" />
    case 'back':
      return <Square className="h-5 w-5 text-slate-300" />
    case 'hinged_door':
    case 'sliding_door':
      return <DoorClosed className="h-5 w-5 text-amber-300" />
    case 'drawer':
      return <PanelBottom className="h-5 w-5 text-sky-300" />
    case 'plinth_base':
    case 'wood_legs':
    case 'metal_legs':
      return <Footprints className="h-5 w-5 text-emerald-300" />
  }
}

export function PartsSidebar({ onCloseMobile }: PartsSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('panels')

  const panels = useDesignStore((s) => s.panels)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const multiSelectMode = useDesignStore((s) => s.multiSelectMode)
  const setMultiSelectMode = useDesignStore((s) => s.setMultiSelectMode)
  const selectAllByRole = useDesignStore((s) => s.selectAllByRole)
  const autoDistributeSelected = useDesignStore((s) => s.autoDistributeSelected)

  const addPresetPanel = useDesignStore((s) => s.addPresetPanel)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const togglePanelSelection = useDesignStore((s) => s.togglePanelSelection)
  const deletePanel = useDesignStore((s) => s.deletePanel)
  const resetToStarterTemplate = useDesignStore((s) => s.resetToStarterTemplate)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const handleAdd = (role: Exclude<PanelRole, 'custom'>) => {
    addPresetPanel(role)
    onCloseMobile?.()
  }

  const activePresets: PanelPreset[] =
    activeTab === 'panels'
      ? PANEL_PRESETS
      : activeTab === 'fronts'
        ? INTERFACE_PRESETS
        : BASE_PRESETS

  const shelfCount = panels.filter((p) => p.role === 'shelf').length

  return (
    <aside className="flex h-full w-full flex-col border-l border-slate-800 bg-slate-900/95 backdrop-blur-md">
      {/* رأس القائمة */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-100">مكتبة الأجزاء</h2>
          <p className="text-xs text-slate-400">ألواح، ضلف وأدراج، ورجول</p>
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

      {/* تبويبات الأقسام */}
      <div className="grid grid-cols-3 gap-1 border-b border-slate-800 bg-slate-950/40 p-2">
        <button
          type="button"
          onClick={() => setActiveTab('panels')}
          className={`h-10 rounded-xl px-2 text-xs font-bold transition ${
            activeTab === 'panels'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          الألواح
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fronts')}
          className={`h-10 rounded-xl px-2 text-xs font-bold transition ${
            activeTab === 'fronts'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          ضلف وأدراج
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bases')}
          className={`h-10 rounded-xl px-2 text-xs font-bold transition ${
            activeTab === 'bases'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          قواعد ورجول
        </button>
      </div>

      {/* أزرار الإضافة السريعة للقسم النشط */}
      <div className="max-h-[260px] space-y-2 overflow-y-auto p-3 custom-scrollbar">
        {activePresets.map((preset) => (
          <button
            key={preset.role}
            type="button"
            onClick={() => handleAdd(preset.role)}
            className="group flex min-h-[54px] w-full items-center justify-between gap-2.5 rounded-2xl border border-slate-800 bg-slate-800/60 px-3 py-2 text-right transition hover:border-amber-500/50 hover:bg-slate-800 active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 ring-1 ring-slate-700/80">
                {getPresetIcon(preset.role)}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 sm:text-sm">
                  {preset.label}
                </div>
                <div className="tabular-nums text-[11px] text-slate-400">
                  {preset.subtitle}
                </div>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-slate-950">
              <Plus className="h-4 w-4" />
            </div>
          </button>
        ))}
      </div>

      {/* قائمة الألواح الموجودة + أدوات التحديد المتعدد والتوزيع المتساوي */}
      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2.5">
          <span className="text-xs font-bold text-slate-300">
            عناصر التصميم ({panels.length})
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMultiSelectMode(!multiSelectMode)}
              className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition ${
                multiSelectMode
                  ? 'border-sky-500/60 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-800'
              }`}
              title="تفعيل التحديد المتعدد لأكثر من قطعة"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              <span>تحديد متعدد</span>
            </button>

            {panels.length > 0 && (
              <button
                type="button"
                onClick={newEmptyDesign}
                className="h-8 rounded-lg px-2 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                مسح الكل
              </button>
            )}
          </div>
        </div>

        {/* شريط التوزيع السريع عند الحاجة */}
        {(selectedPanelIds.length >= 2 || shelfCount >= 2) && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-3 pb-2.5">
            {shelfCount >= 2 && selectedPanelIds.length < 2 && (
              <button
                type="button"
                onClick={() => selectAllByRole(['shelf'])}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
              >
                <BoxSelect className="h-3.5 w-3.5 text-amber-400" />
                <span>تحديد كل الأرفف ({shelfCount})</span>
              </button>
            )}

            {selectedPanelIds.length >= 2 && (
              <button
                type="button"
                onClick={() => autoDistributeSelected()}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 text-xs font-bold text-emerald-200 ring-1 ring-emerald-500/50 transition hover:bg-emerald-500/30 active:scale-[0.99]"
              >
                <AlignVerticalSpaceAround className="h-4 w-4 text-emerald-300" />
                <span>توزيع متساوي ({selectedPanelIds.length})</span>
              </button>
            )}
          </div>
        )}

        <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5">
          {panels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              لا توجد قطع بعد. أضف جزءاً من الأعلى أو استخدم النموذج الجاهز.
            </div>
          ) : (
            panels.map((panel) => {
              const selected = selectedPanelIds.includes(panel.id)
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
                      if (multiSelectMode) {
                        togglePanelSelection(panel.id)
                      } else {
                        selectPanel(panel.id)
                        onCloseMobile?.()
                      }
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
                  >
                    {multiSelectMode ? (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selected
                            ? 'border-amber-400 bg-amber-500 text-slate-950'
                            : 'border-slate-600 bg-slate-900'
                        }`}
                      >
                        {selected && <span className="text-[10px] font-black">✓</span>}
                      </span>
                    ) : (
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-white/20"
                        style={{ backgroundColor: mat.swatch }}
                      />
                    )}
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
                    title="حذف"
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
