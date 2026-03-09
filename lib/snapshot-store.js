import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SNAPSHOT_DIR = path.join(ROOT, 'data', 'snapshots')

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
