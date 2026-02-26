export const CATEGORY_META = {
  unfair_dismissal:              { num: '01', name: 'Dismissal',          color: 'rose' },
  discrimination_harassment:     { num: '02', name: 'Discrimination',     color: 'rose',    uncapped: true },
  wages_working_time:            { num: '03', name: 'Wages & Time',       color: 'amber' },
  whistleblowing:                { num: '04', name: 'Whistleblowing',     color: 'rose',    uncapped: true },
  employment_status:             { num: '05', name: 'Employment Status',  color: 'violet' },
  redundancy_org_change:         { num: '06', name: 'Redundancy',         color: 'amber' },
  parental_family_rights:        { num: '07', name: 'Parental Rights',    color: 'emerald' },
  trade_union_collective:        { num: '08', name: 'Trade Union',        color: 'cyan' },
  breach_of_contract:            { num: '09', name: 'Contract',           color: 'amber' },
  health_safety:                 { num: '10', name: 'Health & Safety',    color: 'emerald' },
  data_protection_privacy:       { num: '11', name: 'Data Protection',    color: 'violet' },
  business_transfers_insolvency: { num: '12', name: 'Transfers',          color: 'cyan' },
}

export const COLOR_MAP = {
  rose:    '#fb7185',
  amber:   '#fbbf24',
  violet:  '#a78bfa',
  emerald: '#34d399',
  cyan:    '#38bdf8',
}

export function getBand(score) {
  if (score <= 20) return { label: 'Low Exposure',        color: '#34d399' }
  if (score <= 40) return { label: 'Controlled Exposure',  color: '#38bdf8' }
  if (score <= 60) return { label: 'Elevated Exposure',    color: '#fbbf24' }
  if (score <= 80) return { label: 'High Exposure',        color: '#f97316' }
  return              { label: 'Severe Exposure',      color: '#ef4444' }
}
