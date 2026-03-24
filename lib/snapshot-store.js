import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))
const MC_ROOT = path.resolve(MODULE_DIR, '..')
const SNAPSHOT_DIR = path.join(MC_ROOT, 'data', 'snapshots')

export function isSnapshotMode() {
  return process.env.VERCEL === '1' || process.env.MC_SNAPSHOT_MODE === '1'
}

export function readSnapshot(name, fallback = null) {
  try {
    const p = path.join(SNAPSHOT_DIR, `${name}.json`)
    if (!fs.existsSync(p)) return fallback
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}
