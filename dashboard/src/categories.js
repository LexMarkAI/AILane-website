export const BANDS = [
  { label: 'Low Exposure',        min: 0,  max: 20, color: 'var(--band-low)',        hex: '#34d399' },
  { label: 'Controlled Exposure',  min: 21, max: 40, color: 'var(--band-controlled)', hex: '#38bdf8' },
  { label: 'Elevated Exposure',    min: 41, max: 60, color: 'var(--band-elevated)',   hex: '#fbbf24' },
  { label: 'High Exposure',        min: 61, max: 80, color: 'var(--band-high)',       hex: '#f97316' },
  { label: 'Severe Exposure',      min: 81, max: 100, color: 'var(--band-severe)',    hex: '#ef4444' },
]

export const CATEGORY_META = {
  unfair_dismissal:              { id: 1,  num: '01', name: 'Unfair Dismissal & Wrongful Termination', short: 'Dismissal',      icon: '\u2696\uFE0F', color: 'rose' },
  discrimination_harassment:     { id: 2,  num: '02', name: 'Discrimination & Harassment',             short: 'Discrimination', icon: '\uD83D\uDEE1\uFE0F', color: 'rose',    uncapped: true },
  wages_working_time:            { id: 3,  num: '03', name: 'Wages, Working Time & Holiday Pay',       short: 'Wages & Time',   icon: '\u23F1\uFE0F', color: 'amber' },
  whistleblowing:                { id: 4,  num: '04', name: 'Whistleblowing & Protected Disclosures',  short: 'Whistleblowing', icon: '\uD83D\uDCE2', color: 'rose',    uncapped: true },
  employment_status:             { id: 5,  num: '05', name: 'Employment Status & Worker Classification', short: 'Status',       icon: '\uD83D\uDCCB', color: 'violet' },
  redundancy_org_change:         { id: 6,  num: '06', name: 'Redundancy & Restructuring',              short: 'Redundancy',     icon: '\uD83C\uDFD7\uFE0F', color: 'amber' },
  parental_family_rights:        { id: 7,  num: '07', name: 'Parental & Family Rights',                short: 'Parental',       icon: '\uD83D\uDC76', color: 'emerald' },
  trade_union_collective:        { id: 8,  num: '08', name: 'Trade Union & Collective Rights',         short: 'Trade Union',    icon: '\uD83E\uDD1D', color: 'cyan' },
  breach_of_contract:            { id: 9,  num: '09', name: 'Breach of Contract & Notice Disputes',    short: 'Contract',       icon: '\uD83D\uDCC4', color: 'amber' },
  health_safety:                 { id: 10, num: '10', name: 'Health & Safety Protections',             short: 'H&S',            icon: '\uD83D\uDD12', color: 'emerald' },
  data_protection_privacy:       { id: 11, num: '11', name: 'Data Protection & Employee Privacy',     short: 'Data',           icon: '\uD83D\uDD10', color: 'violet' },
  business_transfers_insolvency: { id: 12, num: '12', name: 'Business Transfers & Insolvency',        short: 'Transfers',      icon: '\uD83D\uDD04', color: 'cyan' },
}

export const COLOR_MAP = {
  rose:    '#fb7185',
  amber:   '#fbbf24',
  violet:  '#a78bfa',
  emerald: '#34d399',
  cyan:    '#38bdf8',
}

export function getBand(score) {
  return BANDS.find(b => score >= b.min && score <= b.max) || BANDS[0]
}

export function formatDelta(val) {
  if (val == null) return '\u2014'
  if (val > 0) return `+${val}`
  if (val < 0) return `${val}`
  return '0'
}

export function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
