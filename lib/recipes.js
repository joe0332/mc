import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const RECIPES_DIR = path.join(ROOT, 'recipes')

function readRecipes() {
  if (!fs.existsSync(RECIPES_DIR)) return []
  const files = fs.readdirSync(RECIPES_DIR).filter((f) => f.toLowerCase().endsWith('.md'))
  return files.map((file) => {
    const full = path.join(RECIPES_DIR, file)
    const content = fs.readFileSync(full, 'utf8')
    const firstLine = content.split(/\r?\n/).find((l) => l.trim()) || file
    const title = firstLine.replace(/^#\s*/, '').trim()
    const summaryLine = content.split(/\r?\n/).find((l) => /^- \*\*Type:\*\*/i.test(l.trim())) || ''
    const summary = summaryLine.replace(/^- \*\*Type:\*\*/i, '').trim()
    return {
      file,
      relPath: `recipes/${file}`,
      title,
      summary,
      content,
      updatedAtMs: fs.statSync(full).mtimeMs
    }
  }).sort((a, b) => b.updatedAtMs - a.updatedAtMs)
}

export function getRecipesData() {
  const rows = readRecipes()
  return {
    rows,
    metrics: {
      total: rows.length
    },
    updatedAtMs: rows.length ? Math.max(...rows.map((r) => r.updatedAtMs)) : null
  }
}
