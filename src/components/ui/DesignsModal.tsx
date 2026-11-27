import {
  AlertCircle,
  Box,
  Check,
  CopyPlus,
  Download,
  Eye,
  FilePlus2,
  FolderOpen,
  Layers,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import type { SavedDesignSummary } from '../../types/furniture'
import {
  exportProjectToJsonFile,
  parseAndValidateProjectJson,
} from '../../utils/storage'

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
  const hasUnsavedChanges = useDesignStore((s) => s.hasUnsavedChanges)
  const panels = useDesignStore((s) => s.panels)
  const guides = useDesignStore((s) => s.guides)
  const savedDesigns = useDesignStore((s) => s.savedDesigns)
  const designsLoading = useDesignStore((s) => s.designsLoading)
  const designsActionLoading = useDesignStore((s) => s.designsActionLoading)
  const designsError = useDesignStore((s) => s.designsError)
  const refreshSavedDesigns = useDesignStore((s) => s.refreshSavedDesigns)
  const clearDesignsError = useDesignStore((s) => s.clearDesignsError)
  const saveCurrentDesign = useDesignStore((s) => s.saveCurrentDesign)
  const importDesignProject = useDesignStore((s) => s.importDesignProject)
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const removeSavedDesign = useDesignStore((s) => s.removeSavedDesign)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const [nameInput, setNameInput] = useState(currentDesignName)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [previewDesign, setPreviewDesign] = useState<SavedDesignSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void refreshSavedDesigns()
  }, [refreshSavedDesigns])

  const hasSavedMatch = Boolean(
    currentDesignId && savedDesigns.some((d) => d.id === currentDesignId)
  )

  const showTempNotice = (msg: string) => {
    setNoticeMsg(msg)
    setTimeout(() => setNoticeMsg((curr) => (curr === msg ? null : curr)), 2400)
  }

  const handleSave = async (asNew = false) => {
    const saved = await saveCurrentDesign(nameInput, asNew)
    if (saved) {
      setNameInput(saved.name)
      showTempNotice(asNew ? 'تم حفظ نسخة جديدة على السيرفر' : 'تم حفظ التعديلات على السيرفر')
    }
  }

  const handleOpenDesign = async (id: string) => {
    setOpeningId(id)
    const ok = await loadDesign(id)
    setOpeningId(null)
    if (ok) {
      onClose()
    }
  }

  const handleExportJson = () => {
    exportProjectToJsonFile(nameInput || currentDesignName, panels, guides)
    showTempNotice('تم تنزيل ملف المشروع (.json)')
  }

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (!file) {
      input.value = ''
      return
    }

    setImportError(null)
    clearDesignsError()
    try {
      const text = await file.text()
      const parsed = parseAndValidateProjectJson(text)
      setNameInput(parsed.name)
      const saved = await importDesignProject(parsed)
      if (saved) {
        onClose()
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'تعذر قراءة ملف المشروع، تأكد من صلاحية الملف.'
      )
    } finally {
      input.value = ''
    }
  }

  const formatDate = (ts: number) => {
    if (!ts) return 'غير محدد'
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
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5"
    >
      <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-400" />
              <h2 className="text-base font-extrabold text-white sm:text-lg">
                مشاريعي وحفظ التصاميم
              </h2>
              {hasUnsavedChanges && (
                <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
                  تعديلات غير محفوظة
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              المشروع المفتوح: <span className="font-bold text-slate-200">{currentDesignName}</span>{' '}
              · عدد القطع الحالية: {panels.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* نموذج الحفظ والتصدير/الاستيراد */}
        <div className="border-b border-slate-800 bg-slate-950/45 p-4 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="project-name-input"
                className="mb-1 block text-xs font-bold text-slate-300"
              >
                اسم المشروع
              </label>
              <input
                id="project-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="مثال: دولاب مطبخ علوي 120 سم"
                className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={designsActionLoading}
                onClick={() => void handleSave(false)}
                className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-60 sm:flex-initial sm:text-sm"
              >
                {designsActionLoading && !openingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : noticeMsg ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>{noticeMsg ?? (hasSavedMatch ? 'حفظ التعديلات' : 'حفظ التصميم')}</span>
              </button>

              {hasSavedMatch && (
                <button
                  type="button"
                  disabled={designsActionLoading}
                  onClick={() => void handleSave(true)}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800 px-3.5 text-xs font-bold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98] disabled:opacity-60"
                >
                  <CopyPlus className="h-4 w-4 text-amber-400" />
                  <span>حفظ كجديد</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  newEmptyDesign()
                  onClose()
                }}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800 px-3.5 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-[0.98]"
              >
                <FilePlus2 className="h-4 w-4 text-sky-400" />
                <span>تصميم جديد</span>
              </button>
            </div>
          </div>

          {/* أدوات النقل بين الأجهزة (.json) */}
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-3">
            <button
              type="button"
              onClick={handleExportJson}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-sky-500/35 bg-sky-500/10 px-3.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/20 active:scale-[0.98]"
            >
              <Download className="h-4 w-4 text-sky-300" />
              <span>تصدير ملف مشروع (.json)</span>
            </button>

            <button
              type="button"
              disabled={designsActionLoading}
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20 active:scale-[0.98] disabled:opacity-60"
            >
              <Upload className="h-4 w-4 text-emerald-300" />
              <span>استيراد ملف مشروع (.json)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => void handleImportFileChange(e)}
              className="hidden"
            />
          </div>

          {(importError || designsError) && (
            <div
              role="alert"
              className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-200"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{importError ?? designsError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImportError(null)
                  clearDesignsError()
                  void refreshSavedDesigns()
                }}
                className="shrink-0 rounded-xl border border-rose-400/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-100 transition hover:bg-rose-500/25"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* جدول المشاريع المحفوظة على السيرفر */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400">
              التصاميم المحفوظة على السيرفر ({savedDesigns.length})
            </div>
            <button
              type="button"
              disabled={designsLoading}
              onClick={() => void refreshSavedDesigns()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 text-[11px] font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${designsLoading ? 'animate-spin' : ''}`} />
              <span>تحديث القائمة</span>
            </button>
          </div>

          {designsLoading && savedDesigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-slate-800 bg-slate-950/40 p-10 text-xs font-semibold text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <span>جاري تحميل التصاميم من السيرفر...</span>
            </div>
          ) : savedDesigns.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
              لا توجد مشاريع محفوظة على السيرفر بعد. اكتب اسم المشروع واضغط &quot;حفظ التصميم&quot;
              أو استورد ملف <span className="font-mono text-slate-300">.json</span>.
            </div>
          ) : (
            <div className="relative overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              {designsLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-amber-300 shadow-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري تحديث القائمة...</span>
                  </div>
                </div>
              )}

              <table className="w-full min-w-[680px] border-collapse text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-bold text-slate-400">
                    <th className="px-4 py-3">اسم المشروع</th>
                    <th className="px-3 py-3 whitespace-nowrap">تاريخ الإنشاء</th>
                    <th className="px-3 py-3 whitespace-nowrap">آخر تعديل</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">المعاينة</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">الإجراءات (فتح)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/75">
                  {savedDesigns.map((design) => {
                    const isCurrent = design.id === currentDesignId
                    const isConfirmingDelete = confirmDeleteId === design.id
                    const isOpeningThis = openingId === design.id
                    const createdTs = design.createdAt || design.updatedAt

                    return (
                      <tr
                        key={design.id}
                        className={`transition-colors ${
                          isCurrent
                            ? 'bg-amber-500/10 hover:bg-amber-500/15'
                            : 'even:bg-slate-900/30 hover:bg-slate-800/50'
                        }`}
                      >
                        {/* 1. اسم المشروع + عدد القطع */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-100">
                              {design.name}
                            </span>
                            {isCurrent && (
                              <span className="rounded-full border border-amber-400/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-300">
                                مفتوح الآن
                              </span>
                            )}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                            <Layers className="h-3 w-3 text-amber-400" />
                            <span>{design.panelsCount} قطعة</span>
                          </div>
                        </td>

                        {/* 2. تاريخ الإنشاء */}
                        <td className="px-3 py-3 align-middle text-slate-300 whitespace-nowrap">
                          {formatDate(createdTs)}
                        </td>

                        {/* 3. آخر تعديل */}
                        <td className="px-3 py-3 align-middle text-slate-300 whitespace-nowrap">
                          {formatDate(design.updatedAt)}
                        </td>

                        {/* 4. المعاينة */}
                        <td className="px-3 py-3 align-middle text-center">
                          {design.thumbnail ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDesign(design)}
                              className="group relative inline-flex overflow-hidden rounded-md border border-slate-700 transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                              title="تكبير المعاينة"
                              aria-label={`تكبير معاينة ${design.name}`}
                            >
                              <img
                                src={design.thumbnail}
                                alt={design.name}
                                className="h-12 w-20 object-cover transition duration-150 group-hover:scale-105"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-slate-950/45 opacity-0 transition group-hover:opacity-100">
                                <Eye className="h-4 w-4 text-amber-300" />
                              </span>
                            </button>
                          ) : (
                            <div
                              className="mx-auto flex h-12 w-20 items-center justify-center rounded-md border border-slate-800 bg-slate-900/90 text-slate-600"
                              title="لا توجد صورة معاينة"
                            >
                              <Box className="h-4 w-4" />
                            </div>
                          )}
                        </td>

                        {/* 5. الإجراءات (فتح وحذف) */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={designsActionLoading}
                              onClick={() => void handleOpenDesign(design.id)}
                              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3.5 text-xs font-bold text-slate-100 transition hover:bg-amber-500 hover:text-slate-950 active:scale-[0.98] disabled:opacity-60"
                            >
                              {isOpeningThis ? (
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                              ) : (
                                <FolderOpen className="h-4 w-4 shrink-0" />
                              )}
                              <span>{isOpeningThis ? 'جاري الفتح...' : 'فتح'}</span>
                            </button>

                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={designsActionLoading}
                                  onClick={() => {
                                    void removeSavedDesign(design.id).then((ok) => {
                                      if (ok) setConfirmDeleteId(null)
                                    })
                                  }}
                                  className="h-11 rounded-xl bg-rose-500 px-3 text-xs font-extrabold text-white transition hover:bg-rose-400 disabled:opacity-60"
                                >
                                  تأكيد
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="h-11 rounded-xl border border-slate-700 bg-slate-800 px-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={designsActionLoading}
                                onClick={() => setConfirmDeleteId(design.id)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-400 disabled:opacity-50"
                                title="حذف المشروع"
                                aria-label={`حذف ${design.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* نافذة تكبير المعاينة السريعة (Lightbox) */}
      {previewDesign?.thumbnail && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`معاينة ${previewDesign.name}`}
          onClick={() => setPreviewDesign(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold text-white sm:text-base">
                  {previewDesign.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {previewDesign.panelsCount} قطعة · آخر تعديل:{' '}
                  {formatDate(previewDesign.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
                aria-label="إغلاق المعاينة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-hidden bg-slate-950 p-4">
              <img
                src={previewDesign.thumbnail}
                alt={previewDesign.name}
                className="max-h-[65dvh] w-full rounded-xl border border-slate-800 object-contain"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">
              <button
                type="button"
                onClick={() => setPreviewDesign(null)}
                className="h-11 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
              >
                إغلاق
              </button>
              <button
                type="button"
                disabled={designsActionLoading}
                onClick={() => {
                  const id = previewDesign.id
                  setPreviewDesign(null)
                  void handleOpenDesign(id)
                }}
                className="flex h-11 items-center gap-1.5 rounded-2xl bg-amber-500 px-5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                <FolderOpen className="h-4 w-4" />
                <span>فتح وإكمال العمل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
