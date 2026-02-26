// ACEI Category classifier — keyword-based classification of employment tribunal decisions
// into one of 12 ACEI constitutional categories.

const CATEGORY_RULES = [
  {
    key: 'discrimination_harassment',
    keywords: [
      'discrimination', 'discriminat', 'harassment', 'victimisation', 'victimization',
      'equal pay', 'protected characteristic', 'equality act', 'sex discrimination',
      'race discrimination', 'disability discrimination', 'age discrimination',
      'religion discrimination', 'religious discrimination', 'sexual orientation',
      'gender reassignment', 'pregnancy discrimination', 'maternity discrimination',
      'marriage discrimination', 'civil partnership discrimination',
      'direct discrimination', 'indirect discrimination', 'reasonable adjustment',
      'reasonable adjustments', 'hostile environment', 'less favourable treatment',
      'comparator', 'protected act', 'detriment on grounds',
    ],
  },
  {
    key: 'whistleblowing',
    keywords: [
      'whistleblow', 'protected disclosure', 'public interest disclosure',
      'pida', 'qualifying disclosure', 'detriment for making',
      'section 43b', 's.43b', 's43b', 'section 47b', 's.47b', 's47b',
      'section 103a', 's.103a', 's103a',
    ],
  },
  {
    key: 'unfair_dismissal',
    keywords: [
      'unfair dismissal', 'unfairly dismissed', 'wrongful dismissal',
      'wrongful termination', 'constructive dismissal', 'constructive unfair',
      'automatically unfair', 'procedural unfairness', 'substantive unfairness',
      'section 94', 's.94', 'section 98', 's.98', 'band of reasonable responses',
      'acas code', 'disciplinary dismissal', 'misconduct dismissal',
      'capability dismissal', 'some other substantial reason', 'sosr',
      'gross misconduct', 'summary dismissal',
    ],
  },
  {
    key: 'wages_working_time',
    keywords: [
      'unlawful deduction', 'unauthorised deduction', 'deduction from wages',
      'unpaid wages', 'unpaid salary', 'national minimum wage', 'national living wage',
      'nmw', 'nlw', 'working time', 'working time regulations', 'wtr',
      'holiday pay', 'annual leave', 'paid annual leave', 'holiday entitlement',
      'overtime pay', 'rest break', 'rest period', '48 hour', '48-hour',
      'section 13', 's.13', 'era 1996 s.13', 'arrears of pay',
    ],
  },
  {
    key: 'redundancy_org_change',
    keywords: [
      'redundancy', 'redundant', 'collective consultation', 'protective award',
      'tupe', 'transfer of undertaking', 'business transfer',
      'section 188', 's.188', 'selection criteria', 'selection pool',
      'suitable alternative employment', 'bumping', 'consultation period',
      'section 139', 's.139', 'diminished requirement',
    ],
  },
  {
    key: 'employment_status',
    keywords: [
      'employment status', 'worker status', 'employee status',
      'independent contractor', 'self-employed', 'gig economy',
      'zero hours', 'zero-hours', 'umbrella company', 'agency worker',
      'ir35', 'mutuality of obligation', 'personal service',
      'substitution clause', 'limb b worker',
    ],
  },
  {
    key: 'parental_family_rights',
    keywords: [
      'maternity leave', 'maternity pay', 'paternity leave', 'paternity pay',
      'shared parental', 'parental leave', 'flexible working',
      'pregnancy related', 'pregnancy-related', 'return from maternity',
      'childcare', 'adoption leave', 'adoption pay', 'dependant leave',
      'time off for dependant', 'section 99', 's.99',
    ],
  },
  {
    key: 'trade_union_collective',
    keywords: [
      'trade union', 'trade union membership', 'union recognition',
      'collective bargaining', 'industrial action', 'blacklisting',
      'union activities', 'union detriment', 'section 146', 's.146',
      'section 152', 's.152', 'union representative',
    ],
  },
  {
    key: 'breach_of_contract',
    keywords: [
      'breach of contract', 'notice pay', 'notice period', 'payment in lieu',
      'pilon', 'garden leave', 'restrictive covenant', 'non-compete',
      'bonus entitlement', 'bonus claim', 'contractual entitlement',
      'variation of contract', 'implied term',
    ],
  },
  {
    key: 'health_safety',
    keywords: [
      'health and safety', 'health & safety', 'unsafe work', 'safety concern',
      'safety representative', 'riddor', 'serious and imminent danger',
      'section 44', 's.44', 'section 100', 's.100',
      'ppe', 'risk assessment', 'occupational health',
    ],
  },
  {
    key: 'data_protection_privacy',
    keywords: [
      'data protection', 'gdpr', 'subject access request', 'sar',
      'privacy', 'personal data', 'data breach', 'ico',
      'information commissioner', 'surveillance', 'monitoring employee',
      'article 88', 'covert recording',
    ],
  },
  {
    key: 'business_transfers_insolvency',
    keywords: [
      'insolvency', 'administration', 'liquidation', 'receivership',
      'national insurance fund', 'nif', 'preferential creditor',
      'business transfer', 'insolvent employer',
      'section 166', 's.166', 'section 182', 's.182',
    ],
  },
]

/**
 * Classify a tribunal decision into one of 12 ACEI categories.
 * Uses keyword matching against title + body text.
 * Falls back to unfair_dismissal if no strong match (most common category).
 */
export function classify(title, bodyText) {
  const combined = `${title || ''} ${bodyText || ''}`.toLowerCase()

  let best = null
  let bestScore = 0

  for (const rule of CATEGORY_RULES) {
    let score = 0
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        score++
      }
    }
    if (score > bestScore) {
      bestScore = score
      best = rule.key
    }
  }

  // Default to unfair_dismissal — it's the most common category
  // and most tribunal decisions involve some form of dismissal
  return best || 'unfair_dismissal'
}
