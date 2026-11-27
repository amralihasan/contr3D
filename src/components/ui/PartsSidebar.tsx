import {
  AlignVerticalSpaceAround,
  BookmarkPlus,
  BoxSelect,
  Check,
  CheckSquare,
  Columns3,
  DoorClosed,
  Footprints,
  Layers,
  LayoutGrid,
  LayoutTemplate,
  PanelBottom,
  Plus,
  Replace,
  Rows3,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { MATERIALS } from '../../constants/materials'
import {
  BASE_PRESETS,
  INTERFACE_PRESETS,
  PANEL_PRESETS,
  type PanelPreset,
} from '../../constants/presets'
import { FURNITURE_TEMPLATES } from '../../constants/templates'
import { useDesignStore } from '../../store/useDesignStore'
import type { PanelDimensions, PanelRole } from '../../types/furniture'
import { AddPartModal } from './AddPartModal'

interface PartsSidebarProps {
  onCloseMobile?: () => void
}

type SidebarTab = 'panels' | 'fronts' | 'bases' | 'templates'

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
    case 'plinth_recessed':
    case 'wood_legs':
    case 'metal_legs':
    case 'metal_frame':
    case 'metal_u_legs':
    case 'metal_x_legs':
    case 'wood_pillars':
    case 'wood_arch':
      return <Footprints className="h-5 w-5 text-emerald-300" />
  }
}

interface PendingTemplateChoice {
  kind: 'builtin' | 'custom'
  id: string
  name: string
}

export function PartsSidebar({ onCloseMobile }: PartsSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('panels')
  const [pendingPreset, setPendingPreset] = useState<PanelPreset | null>(null)
  const [pendingTemplate, setPendingTemplate] = useState<PendingTemplateChoice | null>(null)
  const [saveFormOpen, setSaveFormOpen] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState('')

  const panels = useDesignStore((s) => s.panels)
  const currentDesignName = useDesignStore((s) => s.currentDesignName)
  const customTemplates = useDesignStore((s) => s.customTemplates)
  const selectedPanelIds = useDesignStore((s) => s.selectedPanelIds)
  const multiSelectMode = useDesignStore((s) => s.multiSelectMode)
  const setMultiSelectMode = useDesignStore((s) => s.setMultiSelectMode)
  const selectAllByRole = useDesignStore((s) => s.selectAllByRole)
  const autoDistributeSelected = useDesignStore((s) => s.autoDistributeSelected)

  const addPresetPanel = useDesignStore((s) => s.addPresetPanel)
  const applyFurnitureTemplate = useDesignStore((s) => s.applyFurnitureTemplate)
  const saveAsCustomTemplate = useDesignStore((s) => s.saveAsCustomTemplate)
  const applyCustomTemplate = useDesignStore((s) => s.applyCustomTemplate)
  const removeCustomTemplate = useDesignStore((s) => s.removeCustomTemplate)
  const selectPanel = useDesignStore((s) => s.selectPanel)
  const togglePanelSelection = useDesignStore((s) => s.togglePanelSelection)
  const deletePanel = useDesignStore((s) => s.deletePanel)
  const resetToStarterTemplate = useDesignStore((s) => s.resetToStarterTemplate)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const handleConfirmAddPreset = (dimensions: PanelDimensions, quantity: number) => {
    if (!pendingPreset) return
    addPresetPanel(pendingPreset.role, { dimensions, quantity })
    setPendingPreset(null)
    onCloseMobile?.()
  }

  const handleSelectTemplate = (choice: PendingTemplateChoice) => {
    if (panels.length === 0) {
      if (choice.kind === 'custom') {
        applyCustomTemplate(choice.id, 'replace')
      } else {
        applyFurnitureTemplate(choice.id, 'replace')
      }
      setPendingTemplate(null)
      onCloseMobile?.()
      return
    }
    setPendingTemplate((curr) =>
      curr?.kind === choice.kind && curr.id === choice.id ? null : choice
    )
  }

  const handleConfirmTemplate = (mode: 'replace' | 'append') => {
    if (!pendingTemplate) return
    if (pendingTemplate.kind === 'custom') {
      applyCustomTemplate(pendingTemplate.id, mode)
    } else {
      applyFurnitureTemplate(pendingTemplate.id, mode)
    }
    setPendingTemplate(null)
    onCloseMobile?.()
  }

  const handleOpenSaveTemplateForm = () => {
    if (panels.length === 0) return
    setTemplateNameInput(currentDesignName || 'قالب مخصص')
    setSaveFormOpen((v) => !v)
  }

  const handleSaveCurrentAsTemplate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (panels.length === 0) return
    saveAsCustomTemplate(templateNameInput, 'all')
    setSaveFormOpen(false)
  }

  useEffect(() => {
    if (!pendingTemplate) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingTemplate(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingTemplate])

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
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 md:hidden"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* تبويبات الأقسام */}
      <div className="grid grid-cols-2 gap-1 border-b border-slate-800 bg-slate-950/40 p-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('panels')
            setPendingTemplate(null)
          }}
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
          onClick={() => {
            setActiveTab('fronts')
            setPendingTemplate(null)
          }}
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
          onClick={() => {
            setActiveTab('bases')
            setPendingTemplate(null)
          }}
          className={`h-10 rounded-xl px-2 text-xs font-bold transition ${
            activeTab === 'bases'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          قواعد ورجول
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`flex h-10 items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition ${
            activeTab === 'templates'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span>قوالب جاهزة</span>
        </button>
      </div>

      {/* أزرار الإضافة السريعة للقسم النشط أو بطاقات القوالب الجاهزة */}
      <div
        className={`space-y-2.5 overflow-y-auto p-3 custom-scrollbar ${
          activeTab === 'templates' ? 'max-h-[400px]' : 'max-h-[260px]'
        }`}
      >
        {activeTab === 'templates' ? (
          <>
            {/* زر حفظ التصميم الحالي كقالب مخصص */}
            <button
              type="button"
              disabled={panels.length === 0}
              onClick={handleOpenSaveTemplateForm}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/45 bg-amber-500/15 px-3 text-xs font-extrabold text-amber-200 transition hover:bg-amber-500/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <BookmarkPlus className="h-4 w-4 text-amber-300" />
              <span>حفظ التصميم الحالي كقالب</span>
            </button>

            {saveFormOpen && (
              <form
                onSubmit={handleSaveCurrentAsTemplate}
                className="space-y-2 rounded-2xl border border-amber-500/40 bg-slate-950/70 p-3"
              >
                <input
                  type="text"
                  autoFocus
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  placeholder="اسم القالب الجديد..."
                  className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-semibold text-white outline-none focus:border-amber-500"
                />
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex h-9 flex-1 items-center justify-center gap-1 rounded-xl bg-amber-500 px-3 text-xs font-extrabold text-slate-950 hover:bg-amber-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>حفظ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveFormOpen(false)}
                    className="h-9 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300 hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* قسم: قوالبي المخصصة */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-amber-300">
                  قوالبي المخصصة ({customTemplates.length})
                </span>
              </div>

              {customTemplates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-3 text-center text-[11px] text-slate-500">
                  لا توجد قوالب مخصصة بعد. احفظ التصميم الحالي أو حدد قطعاً واضغط &quot;حفظ كقالب&quot;.
                </div>
              ) : (
                customTemplates.map((tpl) => {
                  const isSelectedCard =
                    pendingTemplate?.kind === 'custom' && pendingTemplate.id === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      className={`flex items-center justify-between gap-2 rounded-2xl border p-2.5 transition ${
                        isSelectedCard
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-800/60 hover:border-amber-500/50 hover:bg-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectTemplate({
                            kind: 'custom',
                            id: tpl.id,
                            name: tpl.name,
                          })
                        }
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
                      >
                        {tpl.thumbnail ? (
                          <img
                            src={tpl.thumbnail}
                            alt={tpl.name}
                            className="h-11 w-14 shrink-0 rounded-xl border border-slate-700/80 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                            <BookmarkPlus className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-extrabold text-slate-100">
                            {tpl.name}
                          </div>
                          <div className="tabular-nums text-[10px] font-bold text-amber-300/90">
                            {tpl.dimensions.width} × {tpl.dimensions.height} × {tpl.dimensions.depth} سم
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {tpl.panels.length} قطعة
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (pendingTemplate?.kind === 'custom' && pendingTemplate.id === tpl.id) {
                            setPendingTemplate(null)
                          }
                          removeCustomTemplate(tpl.id)
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                        title="حذف القالب المخصص"
                        aria-label={`حذف قالب ${tpl.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            {/* قسم: قوالب جاهزة أساسية */}
            <div className="space-y-2 pt-1">
              <div className="px-1 text-[11px] font-extrabold text-slate-400">
                قوالب وحدات أساسية ({FURNITURE_TEMPLATES.length})
              </div>

              {FURNITURE_TEMPLATES.map((template) => {
                const pieceCount = template.buildPanels().length
                const isSelectedCard =
                  pendingTemplate?.kind === 'builtin' && pendingTemplate.id === template.id
                const badgeColor =
                  template.accentColor === 'emerald'
                    ? 'text-emerald-300 bg-emerald-500/15'
                    : template.accentColor === 'sky'
                      ? 'text-sky-300 bg-sky-500/15'
                      : 'text-amber-300 bg-amber-500/15'

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() =>
                      handleSelectTemplate({
                        kind: 'builtin',
                        id: template.id,
                        name: template.name,
                      })
                    }
                    className={`group flex w-full flex-col gap-1.5 rounded-2xl border p-3 text-right transition active:scale-[0.99] ${
                      isSelectedCard
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-800/60 hover:border-amber-500/50 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${badgeColor}`}>
                          <LayoutTemplate className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-slate-100 sm:text-sm">
                            {template.name}
                          </div>
                          <div className="tabular-nums text-[11px] font-bold text-amber-300/90">
                            {template.dimensions.width} × {template.dimensions.height} ×{' '}
                            {template.dimensions.depth} سم
                          </div>
                        </div>
                      </div>

                      <span className="flex items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-900 px-2 py-1 text-[10px] font-bold text-slate-300">
                        <Layers className="h-3 w-3 text-amber-400" />
                        <span>{pieceCount} قطعة</span>
                      </span>
                    </div>

                    <p className="text-[11px] leading-snug text-slate-400">
                      {template.subtitle}
                    </p>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          activePresets.map((preset) => (
            <button
              key={preset.role}
              type="button"
              onClick={() => setPendingPreset(preset)}
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
          ))
        )}
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

      {/* نافذة تحديد مقاسات القطعة والكمية قبل إضافتها للمشهد */}
      <AddPartModal
        preset={pendingPreset}
        onClose={() => setPendingPreset(null)}
        onConfirm={handleConfirmAddPreset}
      />

      {/* نافذة تأكيد تحميل القالب (Portal في منتصف الشاشة لمنع القص داخل القائمة الجانبية) */}
      {pendingTemplate &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            dir="rtl"
            onClick={() => setPendingTemplate(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-slate-700/90 bg-slate-900 p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/35">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      تحميل قالب: {pendingTemplate.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      المشهد يحتوي حالياً على {panels.length} قطعة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingTemplate(null)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                اختر ما إذا كنت تريد استبدال التصميم الحالي بالكامل أو إضافة القالب بجانب القطع
                الموجودة:
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmTemplate('replace')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98]"
                >
                  <Replace className="h-4 w-4" />
                  <span>استبدال التصميم الحالي</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirmTemplate('append')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/45 bg-emerald-500/15 px-4 text-xs font-extrabold text-emerald-200 transition hover:bg-emerald-500/25 active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4 text-emerald-300" />
                  <span>إضافة بجانب التصميم</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPendingTemplate(null)}
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </aside>
  )
}
