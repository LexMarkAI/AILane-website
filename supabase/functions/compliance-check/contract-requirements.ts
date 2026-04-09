// CONTRACT REQUIREMENT LIBRARY — existing requirements (verified per §2)
// These are the requirements that the current system prompt already contains.
// Do NOT rewrite or expand — contract library expansion is a separate task.

export interface ContractRequirement {
  id: string;
  domain: string;
  requirement: string;
  standard: string;
  severity_if_absent: 'Critical' | 'Major' | 'Minor';
  severity_if_deficient: 'Critical' | 'Major' | 'Minor';
  notes: string;
}

export const CONTRACT_REQUIREMENTS: ContractRequirement[] = [
  {
    id: 'CT-01',
    domain: 'Written Statement of Particulars',
    requirement: 'Written statement of employment particulars including: employer name, employee name, date employment began, date continuous employment began, job title/description, place of work, pay rate and intervals, hours of work, holiday entitlement, sick pay provisions, pension, notice periods, expected duration (if fixed-term), collective agreements, and (from day one) training entitlement and probation details',
    standard: 'Employment Rights Act 1996 s.1 (as amended by Employment Rights (Employment Particulars and Paid Annual Leave) (Amendment) Regulations 2018)',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Major',
    notes: 'Must be provided on or before the first day of employment. Failure entitles worker to 2–4 weeks pay compensation at tribunal (ERA 1996 s.38)',
  },
  {
    id: 'CT-02',
    domain: 'Pay & Wages',
    requirement: 'Pay not less than the National Minimum Wage / National Living Wage rate applicable to the worker\'s age band, with clear statement of pay intervals and calculation basis',
    standard: 'National Minimum Wage Act 1998; National Minimum Wage Regulations 2015',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Major',
    notes: 'Rates change annually each April. Contract should reference "the prevailing statutory rate" rather than a fixed figure to avoid becoming immediately outdated',
  },
  {
    id: 'CT-03',
    domain: 'Pay & Wages',
    requirement: 'Protection against unlawful deductions from wages — no deductions without prior written agreement or statutory authority',
    standard: 'Employment Rights Act 1996 s.13',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Major',
    notes: 'Any deduction clause must be clearly worded and agreed before the event giving rise to the deduction',
  },
  {
    id: 'CT-04',
    domain: 'Working Time',
    requirement: 'Working hours must comply with the 48-hour weekly average limit; if opt-out is included, it must be voluntary, in writing, and permit 7-day cancellation with notice',
    standard: 'Working Time Regulations 1998 Reg.4',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Major',
    notes: 'A blanket opt-out buried in the contract without separate prominence may not satisfy the "individual agreement" requirement',
  },
  {
    id: 'CT-05',
    domain: 'Holiday',
    requirement: 'Holiday entitlement of not less than 5.6 weeks (28 days for full-time) including bank holidays if counted within the entitlement; holiday pay calculation must not use the 12.07% accrual method for part-year workers',
    standard: 'Working Time Regulations 1998 Reg.13–16; Brazel v Harpur Trust [2022] UKSC 27',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Major',
    notes: 'Post-Brazel, percentage-based accrual is unlawful for part-year workers. Must state the full 5.6-week entitlement and the calculation method',
  },
  {
    id: 'CT-06',
    domain: 'Notice Periods',
    requirement: 'Notice period not less than statutory minimum: 1 week after 1 month\'s service, plus 1 week per year of service up to 12 weeks after 12 years',
    standard: 'Employment Rights Act 1996 s.86',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Major',
    notes: 'Contract may provide for longer notice than statutory minimum but never less',
  },
  {
    id: 'CT-07',
    domain: 'Sick Pay',
    requirement: 'Statement of sick pay provisions including Statutory Sick Pay (SSP) entitlement, qualifying conditions, and any enhanced company sick pay scheme',
    standard: 'Social Security Contributions and Benefits Act 1992; SSP General Regulations 1982',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Minor',
    notes: 'ERA 1996 s.1(4)(d) requires the written statement to include information about incapacity for work due to sickness or injury, including any provision for sick pay',
  },
  {
    id: 'CT-08',
    domain: 'Pension',
    requirement: 'Auto-enrolment pension provision or statement of pension arrangements; employer contribution at or above statutory minimum',
    standard: 'Pensions Act 2008; The Occupational and Personal Pension Schemes (Automatic Enrolment) Regulations 2010',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Major',
    notes: 'All employers must automatically enrol eligible workers into a qualifying pension scheme. Minimum employer contribution is 3% of qualifying earnings',
  },
  {
    id: 'CT-09',
    domain: 'Disciplinary & Grievance',
    requirement: 'Reference to disciplinary and grievance procedures, including the name or description of the person to whom the employee can apply if dissatisfied with a disciplinary decision or to raise a grievance',
    standard: 'Employment Rights Act 1996 s.1(4)(k); ACAS Code of Practice on Disciplinary and Grievance Procedures 2015',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Minor',
    notes: 'The written statement must specify or refer to a document specifying the disciplinary rules and grievance procedure. Full ACAS Code compliance is assessed separately',
  },
  {
    id: 'CT-10',
    domain: 'Flexible Working',
    requirement: 'Acknowledgement of the statutory right to request flexible working from day one of employment; process for making and responding to requests within the statutory timeframe',
    standard: 'Employment Relations (Flexible Working) Act 2023; ERA 1996 s.80F',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Major',
    notes: 'Day-one right from April 2024. Two requests per year. Employer must respond within two months. Eight statutory grounds for refusal only',
  },
  {
    id: 'CT-11',
    domain: 'Data Protection',
    requirement: 'Data protection notice informing the employee of how their personal data will be processed, the lawful basis, retention periods, and their rights as a data subject',
    standard: 'UK GDPR 2021 Art.13–14; Data Protection Act 2018',
    severity_if_absent: 'Major',
    severity_if_deficient: 'Minor',
    notes: 'Must reference UK GDPR specifically. Should be a standalone notice or clearly referenced annex — not buried in standard terms',
  },
  {
    id: 'CT-12',
    domain: 'Zero-Hours',
    requirement: 'If zero-hours or variable-hours contract: exclusivity clause prohibition — worker must not be prevented from working for other employers',
    standard: 'Small Business, Enterprise and Employment Act 2015 s.27A; Exclusivity Terms for Zero Hours Workers (Unenforceability and Redress) Regulations 2022',
    severity_if_absent: 'Critical',
    severity_if_deficient: 'Critical',
    notes: 'Exclusivity clauses in zero-hours contracts are unenforceable. Their presence indicates a potentially void and unlawful term',
  },
  {
    id: 'CT-13',
    domain: 'Restrictive Covenants',
    requirement: 'If restrictive covenants are present: assessment of enforceability — reasonable in scope, duration, and geographical area; must protect a legitimate business interest',
    standard: 'Common law restraint of trade doctrine; Tillman v Egon Zehnder Ltd [2019] UKSC 32',
    severity_if_absent: 'Minor',
    severity_if_deficient: 'Major',
    notes: 'Overly broad covenants are void. Post-Tillman, courts may sever unenforceable parts if the clause is drafted to permit it. Flag unreasonable duration (typically >12 months) or scope',
  },
];
