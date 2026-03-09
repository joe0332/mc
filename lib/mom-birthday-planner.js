import fs from 'node:fs'
import path from 'node:path'
import { isSnapshotMode, readSnapshot } from './snapshot-store.js'

const ROOT = process.cwd()
const DATA_PATH = path.join(ROOT, 'memory', 'mom-70-birthday-options.json')

export const CATEGORY_OPTIONS = ['Food', 'Brewery-Bar', 'Walk', 'Falls', 'Coffee', 'Shops']

const DEFAULT_ROWS = [
  { id: 'mom70-1', category: 'Walk', name: 'Niagara Falls State Park viewpoints + Queen Victoria Park promenade', shortDescription: 'Iconic scenic walk and photo-friendly, easy pace for all ages.', links: ['https://www.niagaraparks.com/'], interest: 5, location: 'Niagara Falls, ON', distanceFromAirbnb: '~5-8 min drive / ~15-25 min walk', comments: 'Great first-day low-stress anchor.' },
  { id: 'mom70-2', category: 'Falls', name: 'Journey Behind the Falls', shortDescription: 'Classic wow-factor attraction without a full-day commitment.', links: ['https://www.niagaraparks.com/visit/attractions/journey-behind-the-falls/'], interest: 5, location: 'Niagara Falls, ON', distanceFromAirbnb: '~7-10 min drive', comments: 'Strong milestone-birthday experience.' },
  { id: 'mom70-3', category: 'Falls', name: 'Niagara City Cruises (Hornblower)', shortDescription: 'Best close-up Falls experience and family memory-maker.', links: ['https://www.cityexperiences.com/niagara-ca/city-cruises/voyage-to-the-falls-boat-tour/'], interest: 5, location: 'Niagara Falls, ON', distanceFromAirbnb: '~7-10 min drive', comments: 'Book time slot in advance if possible.' },
  { id: 'mom70-4', category: 'Falls', name: 'Niagara Parks Power Station + Tunnel', shortDescription: 'Indoor/outdoor combo, weather-flexible and interesting.', links: ['https://www.niagaraparks.com/visit/attractions/niagara-parks-power-station/'], interest: 4, location: 'Niagara Falls, ON', distanceFromAirbnb: '~6-9 min drive', comments: 'Good mixed-weather option.' },
  { id: 'mom70-5', category: 'Brewery-Bar', name: 'Niagara Brewing Company', shortDescription: 'Casual lively dinner stop near Clifton Hill.', links: ['https://www.cliftonhill.com/attractions/niagara-brewing-company', 'https://www.cliftonhill.com/'], interest: 4, location: 'Clifton Hill, Niagara Falls, ON', distanceFromAirbnb: '~5-8 min drive / ~15-22 min walk', comments: 'Easy family dinner candidate.' },
  { id: 'mom70-6', category: 'Brewery-Bar', name: 'Counterpart Brewing', shortDescription: 'Local craft beer with quality casual food.', links: ['https://counterpartbrewing.com/'], interest: 4, location: 'Niagara Falls, ON', distanceFromAirbnb: '~12-18 min drive', comments: 'Great relaxed meal option.' },
  { id: 'mom70-7', category: 'Brewery-Bar', name: 'The Exchange Brewery (optional half-day)', shortDescription: 'Destination brewery plus charming town stroll.', links: ['https://www.exchangebrewery.com/', 'https://www.visitniagaracanada.com/explore/niagara-on-the-lake/'], interest: 3, location: 'Niagara-on-the-Lake, ON', distanceFromAirbnb: '~25-35 min drive', comments: 'Good if pairing with NOTL browsing.' },
  { id: 'mom70-8', category: 'Walk', name: 'Queen Street district (coffee + browse)', shortDescription: 'Best local strip for a slower coffee-and-shops vibe.', links: ['https://www.visitniagaracanada.com/explore/niagara-falls/'], interest: 4, location: 'Downtown Niagara Falls, ON', distanceFromAirbnb: '~4-8 min drive', comments: 'Good mom-focused low-pressure block.' },
  { id: 'mom70-9', category: 'Coffee', name: 'Caffery (book café)', shortDescription: 'Quiet reset stop for coffee and relaxed conversation.', links: ['https://caffery.ca/'], interest: 4, location: 'Niagara Falls, ON', distanceFromAirbnb: '~5-9 min drive', comments: 'Nice start to a light day.' },
  { id: 'mom70-10', category: 'Coffee', name: 'Paris Crêpes Café', shortDescription: 'Sweet/brunch-style stop with cozy vibe.', links: ['https://www.tripadvisor.com/Restaurant_Review-g154998-d7066669-Reviews-Paris_Crepes_Cafe-Niagara_Falls_Ontario.html'], interest: 4, location: 'Queen Street area, Niagara Falls, ON', distanceFromAirbnb: '~5-9 min drive', comments: 'Potential birthday-weekend brunch stop.' },
  { id: 'mom70-11', category: 'Shops', name: 'Niagara-on-the-Lake Old Town stroll', shortDescription: 'Best nearby boutique/shopping walk area.', links: ['https://www.visitniagaracanada.com/explore/niagara-on-the-lake/'], interest: 5, location: 'Niagara-on-the-Lake, ON', distanceFromAirbnb: '~25-35 min drive', comments: 'Strong candidate for mom-focused day.' },
  { id: 'mom70-12', category: 'Shops', name: 'Michaels (Montrose Rd)', shortDescription: 'Practical craft-supply stop if desired.', links: ['https://locationsca.michaels.com/on/niagara-falls/3965'], interest: 2, location: 'Niagara Falls, ON', distanceFromAirbnb: '~12-18 min drive', comments: 'Only if craft shopping is needed.' },
  { id: 'mom70-13', category: 'Falls', name: 'Butterfly Conservatory', shortDescription: 'Calm, magical, family-friendly attraction.', links: ['https://www.niagaraparks.com/visit/attractions/butterfly-conservatory/'], interest: 4, location: 'Niagara Falls, ON', distanceFromAirbnb: '~12-18 min drive', comments: 'Kid + grandma-friendly option.' },
  { id: 'mom70-14', category: 'Falls', name: 'Bird Kingdom', shortDescription: 'Indoor, visual, weather-safe activity.', links: ['https://www.birdkingdom.ca/'], interest: 4, location: 'Niagara Falls, ON', distanceFromAirbnb: '~3-6 min drive / ~10-18 min walk', comments: 'Good short-duration backup plan.' },
  { id: 'mom70-15', category: 'Falls', name: 'Fallsview Indoor Waterpark', shortDescription: 'Rain-proof energy-burn option for kids.', links: ['https://www.fallsviewwaterpark.com/'], interest: 3, location: 'Niagara Falls, ON', distanceFromAirbnb: '~5-8 min drive', comments: 'Use if weather turns or kids need movement.' }
]

const DEFAULT_DATA = {
  rows: DEFAULT_ROWS,
  updatedAtMs: null,
  sourceDoc: 'NIAGARA-TRIP-PLAN-DRAFT.md'
}

function normalizeLinks(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(/\r?\n|,/).map((v) => String(v || '').trim()).filter(Boolean)
  return []
}

function cleanRow(r = {}, i = 0) {
  const interestRaw = Number(r?.interest)
  const interest = Number.isFinite(interestRaw) ? Math.min(5, Math.max(1, Math.round(interestRaw))) : 3
  const category = CATEGORY_OPTIONS.includes(String(r?.category || '').trim()) ? String(r?.category).trim() : 'Food'
  return {
    id: String(r?.id || `mom70-${Date.now()}-${i}`),
    category,
    name: String(r?.name || '').trim(),
    shortDescription: String(r?.shortDescription || '').trim(),
    links: normalizeLinks(r?.links),
    interest,
    location: String(r?.location || '').trim(),
    distanceFromAirbnb: String(r?.distanceFromAirbnb || '').trim(),
    comments: String(r?.comments || '').trim()
  }
}

export function getMomBirthdayPlannerData() {
  if (isSnapshotMode()) {
    return readSnapshot('mom-70-birthday-planner', { ...DEFAULT_DATA, updatedAtMs: null })
  }
  try {
    if (!fs.existsSync(DATA_PATH)) {
      const seeded = { ...DEFAULT_DATA, updatedAtMs: Date.now() }
      fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
      fs.writeFileSync(DATA_PATH, JSON.stringify(seeded, null, 2), 'utf8')
      return seeded
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    return {
      rows: Array.isArray(parsed?.rows) ? parsed.rows.map((r, i) => cleanRow(r, i)) : DEFAULT_ROWS,
      updatedAtMs: Number(parsed?.updatedAtMs || 0) || null,
      sourceDoc: String(parsed?.sourceDoc || DEFAULT_DATA.sourceDoc)
    }
  } catch {
    return { ...DEFAULT_DATA, updatedAtMs: null }
  }
}

export function saveMomBirthdayPlannerData(payload = {}) {
  const rows = Array.isArray(payload?.rows) ? payload.rows.map((r, i) => cleanRow(r, i)).filter((r) => r.name) : []
  const out = {
    rows,
    updatedAtMs: Date.now(),
    sourceDoc: String(payload?.sourceDoc || DEFAULT_DATA.sourceDoc)
  }
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(out, null, 2), 'utf8')
  return out
}
