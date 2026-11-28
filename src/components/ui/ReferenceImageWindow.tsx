import {
  GripHorizontal,
  ImagePlus,
  PictureInPicture2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useDesignStore } from '../../store/useDesignStore'

interface ReferenceImageWindowProps {
  open: boolean
  onClose: () => void
}

const DEFAULT_WIDTH = 300
const DEFAULT_HEIGHT = 240
const MIN_WIDTH = 220
const MIN_HEIGHT = 170
const VIEWPORT_MARGIN = 12

function clampPosition(x: number, y: number, w: number, h: number): { x: number; y: number } {
  if (typeof window === 'undefined') return { x, y }
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - w - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN)
  return {
    x: Math.min(maxX, Math.max(VIEWPORT_MARGIN, x)),
    y: Math.min(maxY, Math.max(VIEWPORT_MARGIN, y)),
  }
}

export function ReferenceImageWindow({ open, onClose }: ReferenceImageWindowProps) {
  const isExporting = useDesignStore((s) => s.isExporting)

  // تظل الصورة وموضع النافذة ومقاسها محفوظة في الذاكرة عند الإخفاء والإظهار
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [imageName, setImageName] = useState<string>('')
  const [opacityPct, setOpacityPct] = useState<number>(100)
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  })
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 16, y: 120 }
    return {
      x: 16,
      y: Math.max(72, window.innerHeight - DEFAULT_HEIGHT - 84),
    }
  })

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const interactionRef = useRef<
    | {
        mode: 'drag'
        startClientX: number
        startClientY: number
        startX: number
        startY: number
      }
    | {
        mode: 'resize'
        startClientX: number
        startClientY: number
        startW: number
        startH: number
      }
    | null
  >(null)

  const loadImageFile = useCallback((file: File | Blob, label?: string) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('يرجى اختيار ملف صورة صالح (PNG / JPG / WebP).')
      return
    }
    setErrorMsg(null)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageSrc(reader.result)
        setImageName(label || ('name' in file && file.name ? file.name : 'صورة مرجعية'))
      }
    }
    reader.onerror = () => {
      setErrorMsg('تعذر قراءة الصورة المختارة.')
    }
    reader.readAsDataURL(file)
  }, [])

  // دعم لصق الصور مباشرة من الحافظة (Ctrl+V / Cmd+V) عند فتح النافذة
  useEffect(() => {
    if (!open || isExporting) return

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (blob) {
            e.preventDefault()
            loadImageFile(blob, 'صورة من الحافظة')
            return
          }
        }
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, isExporting, loadImageFile])

  // الحفاظ على النافذة داخل الشاشة عند تغيير حجم المتصفح
  useEffect(() => {
    const onResizeWindow = () => {
      setPos((curr) => clampPosition(curr.x, curr.y, size.width, size.height))
    }
    window.addEventListener('resize', onResizeWindow)
    return () => window.removeEventListener('resize', onResizeWindow)
  }, [size.width, size.height])

  // أحداث السحب وتغيير المقاس بالماوس أو اللمس
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const active = interactionRef.current
      if (!active) return

      if (active.mode === 'drag') {
        const dx = e.clientX - active.startClientX
        const dy = e.clientY - active.startClientY
        setPos(clampPosition(active.startX + dx, active.startY + dy, size.width, size.height))
      } else {
        const dx = e.clientX - active.startClientX
        const dy = e.clientY - active.startClientY
        const maxW = Math.max(MIN_WIDTH, window.innerWidth - pos.x - VIEWPORT_MARGIN)
        const maxH = Math.max(MIN_HEIGHT, window.innerHeight - pos.y - VIEWPORT_MARGIN)
        setSize({
          width: Math.round(Math.min(maxW, Math.max(MIN_WIDTH, active.startW + dx))),
          height: Math.round(Math.min(maxH, Math.max(MIN_HEIGHT, active.startH + dy))),
        })
      }
    }

    const onPointerUp = () => {
      interactionRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [pos.x, pos.y, size.width, size.height])

  if (!open || isExporting) return null

  const handleHeaderPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (target && target.closest('button, input')) return
    e.stopPropagation()
    e.preventDefault()
    interactionRef.current = {
      mode: 'drag',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: pos.x,
      startY: pos.y,
    }
  }

  const handleResizePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    interactionRef.current = {
      mode: 'resize',
      startClientX: e.clientX,
      startClientY: e.clientY,
      startW: size.width,
      startH: size.height,
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = input.files?.[0]
    if (file) {
      loadImageFile(file, file.name)
    }
    input.value = ''
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      loadImageFile(file, file.name)
    }
  }

  return (
    <div
      dir="rtl"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        opacity: opacityPct / 100,
      }}
      className={`fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-slate-900/95 shadow-2xl backdrop-blur-md transition-colors print:hidden ${
        isDragOver ? 'border-amber-400 ring-2 ring-amber-400/60' : 'border-slate-700/90'
      }`}
    >
      {/* شريط التحكم العلوي القابل للسحب */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex shrink-0 cursor-grab items-center justify-between gap-1.5 border-b border-slate-800 bg-slate-950/90 px-2.5 py-1.5 select-none active:cursor-grabbing touch-none"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <GripHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
          <PictureInPicture2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="truncate text-[11px] font-extrabold text-slate-100">
            {imageName || 'صورة مرجعية'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* شريط الشفافية من 30% إلى 100% */}
          <label
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-1.5 py-1"
            title={`شفافية النافذة: ${opacityPct}%`}
          >
            <span className="tabular-nums text-[10px] font-bold text-slate-400">
              {opacityPct}%
            </span>
            <input
              type="range"
              min={30}
              max={100}
              step={5}
              value={opacityPct}
              onChange={(e) => setOpacityPct(Number(e.target.value))}
              className="h-1 w-12 cursor-pointer accent-cyan-400"
              aria-label="شفافية نافذة الصورة المرجعية"
            />
          </label>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-200 transition hover:bg-slate-700 hover:text-cyan-300"
            title={imageSrc ? 'تبديل الصورة' : 'اختيار صورة من الجهاز'}
            aria-label={imageSrc ? 'تبديل الصورة' : 'اختيار صورة'}
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>

          {imageSrc && (
            <button
              type="button"
              onClick={() => {
                setImageSrc(null)
                setImageName('')
                setErrorMsg(null)
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-800 text-slate-400 transition hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-300"
              title="مسح الصورة"
              aria-label="مسح الصورة"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="إخفاء النافذة (تظل الصورة محفوظة)"
            aria-label="إخفاء نافذة الصورة المرجعية"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* منطقة عرض الصورة أو التحميل */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-slate-950/60 p-2">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageName || 'صورة مرجعية'}
            draggable={false}
            className="h-full w-full select-none rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-3 text-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-11 items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/25 active:scale-95"
            >
              <Upload className="h-4 w-4 text-cyan-300" />
              <span>اختيار صورة من الجهاز</span>
            </button>
            <p className="text-[11px] leading-relaxed text-slate-400">
              أو اسحب الصورة وأفلتها هنا، أو اضغط{' '}
              <span className="font-mono text-slate-300">Ctrl+V</span> للصق صورة من الحافظة
            </p>
            {errorMsg && <p className="text-[11px] font-semibold text-rose-400">{errorMsg}</p>}
          </div>
        )}

        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/75 text-xs font-extrabold text-amber-300">
            أفلت الصورة هنا لعرضها كمرجع
          </div>
        )}

        {/* مقبض تغيير المقاس في الزاوية السفلية اليمنى */}
        <button
          type="button"
          onPointerDown={handleResizePointerDown}
          title="اسحب لتغيير مقاس النافذة"
          aria-label="تغيير مقاس نافذة الصورة المرجعية"
          className="absolute right-1 bottom-1 flex h-5 w-5 cursor-nwse-resize items-end justify-end rounded p-0.5 text-slate-500 transition hover:text-cyan-300 touch-none"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M11 5L5 11M11 9L9 11" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
