import {
  AlertCircle,
  Box,
  Check,
  CopyPlus,
  Download,
  FilePlus2,
  FolderOpen,
  Layers,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
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
  const saveCurrentDesign = useDesignStore((s) => s.saveCurrentDesign)
  const importDesignProject = useDesignStore((s) => s.importDesignProject)
  const loadDesign = useDesignStore((s) => s.loadDesign)
  const removeSavedDesign = useDesignStore((s) => s.removeSavedDesign)
  const newEmptyDesign = useDesignStore((s) => s.newEmptyDesign)

  const [nameInput, setNameInput] = useState(currentDesignName)
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const hasSavedMatch = Boolean(
    currentDesignId && savedDesigns.some((d) => d.id === currentDesignId)
  )

  const showTempNotice = (msg: string) => {
    setNoticeMsg(msg)
    setTimeout(() => setNoticeMsg((curr) => (curr === msg ? null : curr)), 2400)
  }

  const handleSave = (asNew = false) => {
    const saved = saveCurrentDesign(nameInput, asNew)
    setNameInput(saved.name)
    showTempNotice(asNew ? 'تم حفظ نسخة جديدة بنجاح' : 'تم حفظ التعديلات بنجاح')
  }

  const handleExportJson = () => {
    exportProjectToJsonFile(nameInput || currentDesignName, panels, guides)
    showTempNotice('تم تنزيل ملف المشروع (.json)')
  }

  const handleImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError(null)
    try {
      const text = await file.text()
      const parsed = parseAndValidateProjectJson(text)
      importDesignProject(parsed)
      onClose()
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'تعذر قراءة ملف المشروع، تأكد من صلاحية الملف.'
      )
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
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
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
        <div className="border-b border-slate-800 bg-slate-950/45 p-4 sm:p-5">
          <label
            htmlFor="project-name-input"
            className="mb-1.5 block text-xs font-bold text-slate-300"
          >
            اسم المشروع
          </label>
          <input
            id="project-name-input"
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="مثال: دولاب مطبخ علوي 120 سم"
            className="mb-3 h-11 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-500"
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex h-11 min-w-[160px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-xs font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-400 active:scale-[0.98] sm:text-sm"
            >
              {noticeMsg ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              <span>
                {noticeMsg ?? (hasSavedMatch ? 'حفظ التعديلات' : 'حفظ التصميم')}
              </span>
            </button>

            {hasSavedMatch && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-100 transition hover:bg-slate-700 active:scale-[0.98]"
              >
                <CopyPlus className="h-4 w-4 text-amber-400" />
                <span>حفظ كتصميم جديد</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                newEmptyDesign()
                onClose()
              }}
              className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-700 bg-slate-800 px-4 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-[0.98]"
            >
              <FilePlus2 className="h-4 w-4 text-sky-400" />
              <span>تصميم جديد (فارغ)</span>
            </button>
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
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/20 active:scale-[0.98]"
            >
              <Upload className="h-4 w-4 text-emerald-300" />
              <span>استيراد ملف مشروع (.json)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFileChange}
              className="hidden"
            />
          </div>

          {importError && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
          )}
        </div>

        {/* شبكة بطاقات المشاريع المحفوظة */}
        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400">
              التصاميم المحفوظة على هذا الجهاز ({savedDesigns.length})
            </div>
          </div>

          {savedDesigns.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center text-xs text-slate-400">
              لا توجد مشاريع محفوظة بعد. اكتب اسم المشروع واضغط &quot;حفظ التصميم&quot; أو
              استورد ملف <span className="font-mono text-slate-300">.json</span>.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {savedDesigns.map((design) => {
                const isCurrent = design.id === currentDesignId
                const isConfirmingDelete = confirmDeleteId === design.id

                return (
                  <div
                    key={design.id}
                    className={`flex flex-col overflow-hidden rounded-2xl border transition ${
                      isCurrent
                        ? 'border-amber-500/65 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                    }`}
                  >
                    {/* الصورة المصغرة من مشهد الـ 3D */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-slate-800/80 bg-slate-950">
                      {design.thumbnail ? (
                        <img
                          src={design.thumbnail}
                          alt={design.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-slate-600">
                          <Box className="h-8 w-8 opacity-60" />
                          <span className="text-[11px] font-semibold">
                            سيتم التقاط معاينة عند الحفظ
                          </span>
                        </div>
                      )}

                      {isCurrent && (
                        <span className="absolute top-2.5 right-2.5 rounded-full border border-amber-400/50 bg-slate-950/85 px-2.5 py-1 text-[10px] font-extrabold text-amber-300 backdrop-blur-sm">
                          مفتوح حالياً
                        </span>
                      )}

                      <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold text-slate-200 backdrop-blur-sm">
                        <Layers className="h-3 w-3 text-amber-400" />
                        <span>{design.panels.length} قطعة</span>
                      </span>
                    </div>

                    {/* تفاصيل البطاقة وأزرار الإجراءات */}
                    <div className="flex flex-1 flex-col justify-between p-3.5">
                      <div>
                        <h3 className="truncate text-sm font-extrabold text-slate-100">
                          {design.name}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-400">
                          آخر تعديل: {formatDate(design.updatedAt)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            loadDesign(design.id)
                            onClose()
                          }}
                          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-bold text-slate-100 transition hover:bg-amber-500 hover:text-slate-950 active:scale-[0.98]"
                        >
                          <FolderOpen className="h-4 w-4 shrink-0" />
                          <span>فتح وإكمال العمل</span>
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                removeSavedDesign(design.id)
                                setConfirmDeleteId(null)
                              }}
                              className="h-11 rounded-xl bg-rose-500 px-3 text-xs font-extrabold text-white transition hover:bg-rose-400"
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
                            onClick={() => setConfirmDeleteId(design.id)}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-400"
                            title="حذف المشروع"
                            aria-label={`حذف ${design.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
