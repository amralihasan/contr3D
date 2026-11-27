import express from 'express'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT_DIR, 'data')
const DESIGNS_DIR = path.join(DATA_DIR, 'designs')
const CUSTOM_TEMPLATES_FILE = path.join(DATA_DIR, 'custom-templates.json')
const DIST_DIR = path.join(ROOT_DIR, 'dist')

const PORT = Number(process.env.PORT) || 3001

function sanitizeId(rawId) {
  if (typeof rawId !== 'string') return ''
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '')
}

function getDesignFilePath(safeId) {
  const target = path.resolve(DESIGNS_DIR, `${safeId}.json`)
  if (!target.startsWith(`${DESIGNS_DIR}${path.sep}`)) {
    return null
  }
  return target
}

async function ensureStorageReady() {
  await fs.mkdir(DESIGNS_DIR, { recursive: true })
  try {
    await fs.access(CUSTOM_TEMPLATES_FILE)
  } catch {
    await fs.writeFile(CUSTOM_TEMPLATES_FILE, '[]\n', 'utf8')
  }
}

function toDesignSummary(record) {
  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : 0
  const createdAt =
    typeof record.createdAt === 'number' &&
    Number.isFinite(record.createdAt) &&
    record.createdAt > 0
      ? record.createdAt
      : updatedAt

  return {
    id: record.id,
    name: typeof record.name === 'string' && record.name.trim() ? record.name : 'تصميم بدون اسم',
    createdAt,
    updatedAt,
    panelsCount: Array.isArray(record.panels) ? record.panels.length : 0,
    thumbnail:
      typeof record.thumbnail === 'string' && record.thumbnail.startsWith('data:image/')
        ? record.thumbnail
        : undefined,
  }
}

async function readDesignFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function readCustomTemplatesList() {
  await ensureStorageReady()
  try {
    const raw = await fs.readFile(CUSTOM_TEMPLATES_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const app = express()
app.use(express.json({ limit: '20mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// 1. جلب قائمة التصاميم المحفوظة مرتبة بالأحدث
app.get('/api/designs', async (_req, res) => {
  try {
    await ensureStorageReady()
    const entries = await fs.readdir(DESIGNS_DIR, { withFileTypes: true })
    const summaries = []

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue
      const safeNameId = sanitizeId(entry.name.slice(0, -5))
      if (!safeNameId) continue
      const filePath = getDesignFilePath(safeNameId)
      if (!filePath) continue

      try {
        const parsed = await readDesignFile(filePath)
        if (!parsed || typeof parsed !== 'object') continue
        const normalizedId = sanitizeId(parsed.id) || safeNameId
        summaries.push(toDesignSummary({ ...parsed, id: normalizedId }))
      } catch {
        // تجاهل أي ملف تالف بدلاً من تعطيل القائمة كلها
      }
    }

    summaries.sort((a, b) => b.updatedAt - a.updatedAt)
    res.json({ designs: summaries })
  } catch (err) {
    console.error('Failed to list designs:', err)
    res.status(500).json({ error: 'تعذر قراءة قائمة التصاميم من السيرفر.' })
  }
})

// 2. جلب بيانات تصميم كامل بواسطة ID
app.get('/api/designs/:id', async (req, res) => {
  const safeId = sanitizeId(req.params.id)
  if (!safeId || safeId !== req.params.id) {
    res.status(400).json({ error: 'معرّف التصميم غير صالح.' })
    return
  }

  const filePath = getDesignFilePath(safeId)
  if (!filePath) {
    res.status(400).json({ error: 'مسار الملف غير صالح.' })
    return
  }

  try {
    await ensureStorageReady()
    const parsed = await readDesignFile(filePath)
    if (!parsed || typeof parsed !== 'object') {
      res.status(404).json({ error: 'التصميم غير موجود.' })
      return
    }
    const updatedAt =
      typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
        ? parsed.updatedAt
        : 0
    const createdAt =
      typeof parsed.createdAt === 'number' &&
      Number.isFinite(parsed.createdAt) &&
      parsed.createdAt > 0
        ? parsed.createdAt
        : updatedAt

    res.json({
      design: {
        ...parsed,
        id: safeId,
        createdAt,
        updatedAt,
        panels: Array.isArray(parsed.panels) ? parsed.panels : [],
        guides: Array.isArray(parsed.guides) ? parsed.guides : [],
      },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      res.status(404).json({ error: 'لم يتم العثور على ملف التصميم المطلوب.' })
      return
    }
    console.error('Failed to read design:', err)
    res.status(500).json({ error: 'تعذر تحميل بيانات التصميم من السيرفر.' })
  }
})

async function handleUpsertDesign(req, res, forcedId) {
  try {
    await ensureStorageReady()
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const now = Date.now()

    const requestedId = forcedId ?? sanitizeId(body.id)
    if (forcedId && forcedId !== req.params.id) {
      res.status(400).json({ error: 'معرّف التصميم غير صالح.' })
      return
    }

    const safeId =
      requestedId || `design_${now}_${Math.random().toString(36).slice(2, 7)}`
    const filePath = getDesignFilePath(safeId)
    if (!filePath) {
      res.status(400).json({ error: 'معرّف التصميم غير صالح.' })
      return
    }

    let existing = null
    try {
      existing = await readDesignFile(filePath)
    } catch {
      existing = null
    }

    const cleanName =
      typeof body.name === 'string' && body.name.trim().length > 0
        ? body.name.trim()
        : existing && typeof existing.name === 'string' && existing.name.trim()
          ? existing.name.trim()
          : 'تصميم بدون اسم'

    const existingCreatedAt =
      existing &&
      typeof existing.createdAt === 'number' &&
      Number.isFinite(existing.createdAt) &&
      existing.createdAt > 0
        ? existing.createdAt
        : existing &&
            typeof existing.updatedAt === 'number' &&
            Number.isFinite(existing.updatedAt) &&
            existing.updatedAt > 0
          ? existing.updatedAt
          : null

    const bodyCreatedAt =
      typeof body.createdAt === 'number' &&
      Number.isFinite(body.createdAt) &&
      body.createdAt > 0
        ? body.createdAt
        : null

    const createdAt = existingCreatedAt ?? bodyCreatedAt ?? now
    const updatedAt = now

    const thumbnail =
      typeof body.thumbnail === 'string' && body.thumbnail.startsWith('data:image/')
        ? body.thumbnail
        : existing && typeof existing.thumbnail === 'string'
          ? existing.thumbnail
          : undefined

    const record = {
      id: safeId,
      name: cleanName,
      createdAt,
      updatedAt,
      panels: Array.isArray(body.panels) ? body.panels : [],
      guides: Array.isArray(body.guides) ? body.guides : [],
      ...(thumbnail ? { thumbnail } : {}),
    }

    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8')
    res.status(existing ? 200 : 201).json({
      design: record,
      summary: toDesignSummary(record),
    })
  } catch (err) {
    console.error('Failed to save design:', err)
    res.status(500).json({ error: 'تعذر حفظ ملف التصميم على السيرفر.' })
  }
}

// 3. حفظ تصميم جديد أو تحديثه
app.post('/api/designs', async (req, res) => {
  await handleUpsertDesign(req, res, null)
})

app.put('/api/designs/:id', async (req, res) => {
  const safeId = sanitizeId(req.params.id)
  if (!safeId || safeId !== req.params.id) {
    res.status(400).json({ error: 'معرّف التصميم غير صالح.' })
    return
  }
  await handleUpsertDesign(req, res, safeId)
})

// 4. حذف تصميم من السيرفر
app.delete('/api/designs/:id', async (req, res) => {
  const safeId = sanitizeId(req.params.id)
  if (!safeId || safeId !== req.params.id) {
    res.status(400).json({ error: 'معرّف التصميم غير صالح.' })
    return
  }

  const filePath = getDesignFilePath(safeId)
  if (!filePath) {
    res.status(400).json({ error: 'مسار الملف غير صالح.' })
    return
  }

  try {
    await ensureStorageReady()
    await fs.unlink(filePath)
    res.json({ ok: true, id: safeId })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'ENOENT') {
      res.status(404).json({ error: 'التصميم غير موجود أو تم حذفه مسبقاً.' })
      return
    }
    console.error('Failed to delete design:', err)
    res.status(500).json({ error: 'تعذر حذف ملف التصميم من السيرفر.' })
  }
})

// 5. القوالب المخصصة (custom-templates.json)
app.get('/api/custom-templates', async (_req, res) => {
  try {
    const templates = await readCustomTemplatesList()
    res.json({ templates })
  } catch (err) {
    console.error('Failed to read custom templates:', err)
    res.status(500).json({ error: 'تعذر قراءة القوالب المخصصة من السيرفر.' })
  }
})

app.post('/api/custom-templates', async (req, res) => {
  try {
    const template = req.body && typeof req.body === 'object' ? req.body : null
    if (!template || typeof template.id !== 'string' || typeof template.name !== 'string') {
      res.status(400).json({ error: 'بيانات القالب المخصص غير صالحة.' })
      return
    }
    const existing = await readCustomTemplatesList()
    const nextList = [template, ...existing.filter((t) => t && t.id !== template.id)]
    await fs.writeFile(CUSTOM_TEMPLATES_FILE, JSON.stringify(nextList, null, 2), 'utf8')
    res.status(201).json({ template, templates: nextList })
  } catch (err) {
    console.error('Failed to save custom template:', err)
    res.status(500).json({ error: 'تعذر حفظ القالب المخصص على السيرفر.' })
  }
})

app.delete('/api/custom-templates/:id', async (req, res) => {
  try {
    const safeId = sanitizeId(req.params.id)
    if (!safeId || safeId !== req.params.id) {
      res.status(400).json({ error: 'معرّف القالب غير صالح.' })
      return
    }
    const existing = await readCustomTemplatesList()
    const nextList = existing.filter((t) => t && t.id !== safeId)
    await fs.writeFile(CUSTOM_TEMPLATES_FILE, JSON.stringify(nextList, null, 2), 'utf8')
    res.json({ ok: true, templates: nextList })
  } catch (err) {
    console.error('Failed to delete custom template:', err)
    res.status(500).json({ error: 'تعذر حذف القالب المخصص.' })
  }
})

// معالجة أخطاء حجم الملف أو صيغة JSON غير الصالحة برد JSON واضح
app.use((err, _req, res, next) => {
  if (err && typeof err === 'object' && 'type' in err && err.type === 'entity.too.large') {
    res.status(413).json({ error: 'حجم ملف المشروع أكبر من الحد المسموح (20 ميجابايت).' })
    return
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'تنسيق بيانات JSON المرسلة غير صالح.' })
    return
  }
  next(err)
})

// تقديم واجهة الإنتاج المبنية في مجلد dist/ على نفس البورت
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next()
      return
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })
}

ensureStorageReady()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Contr3D File Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Failed to initialize storage directory:', err)
    process.exit(1)
  })
