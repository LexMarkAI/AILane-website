// preScreen() — Document classification and scope gating
// Updated per AILANE-CC-BRIEF-HBCHECK-001 §5 with handbook detection signals

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface PreScreenResult {
  inScope: boolean;
  detectedType: string;
  reason: string;
}

const PRE_SCREEN_SYSTEM_PROMPT = `You are a document classifier for Ailane, a UK employment law compliance analysis tool. Your job is to classify uploaded documents and determine whether they are in scope for analysis.

CLASSIFICATION RULES:

1. Determine if the document is a UK employment-related document. If it is NOT, return inScope: false.

2. If it IS in scope, classify it as one of:
   - "employment_contract" — an individual employment contract
   - "staff_handbook" — a staff/employee handbook containing organisational policies
   - "policy_document" — a standalone employment policy document

HANDBOOK CLASSIFICATION SIGNALS (detectedType = "staff_handbook"):
- Multiple distinct policy sections with separate headings
- Procedure headings (Disciplinary, Grievance, Sickness, Leave)
- ACAS Code of Practice language or references
- Organisational scope language ("all employees", "this handbook applies to")
- Table of contents covering multiple employment policy domains
- References to multiple statutory instruments across different employment law areas
- Section numbering suggesting a multi-chapter document
- Absence of individual employee name / specific salary / specific start date (these indicate a contract, not a handbook)

CONTRACT CLASSIFICATION SIGNALS (detectedType = "employment_contract"):
- Named employer and named employee/worker
- Specific start date and job title
- Specific remuneration and hours
- Written statement of particulars structure
- Individual terms and conditions focus
- Notice period specific to this individual
- ERA 1996 s.1 language patterns

POLICY DOCUMENT SIGNALS (detectedType = "policy_document"):
- Single-topic employment policy (e.g. just a data protection policy, just a disciplinary policy)
- Organisational scope but covering only one domain
- Not a multi-domain handbook and not an individual contract

AMBIGUITY RULE: If the document is ambiguous (e.g. a combined contract-and-handbook), classify as "staff_handbook" — the handbook library is a superset that will catch contract-relevant findings too.

OUT-OF-SCOPE SIGNALS (inScope = false):
- Commercial contracts (supply agreements, SaaS terms, NDAs between companies)
- Non-UK employment documents (US offer letters, EU contracts under non-UK law)
- CVs, cover letters, job advertisements
- Financial documents, invoices, tax returns
- Academic papers, news articles
- Documents with no discernible employment law content

You MUST return ONLY valid JSON with this structure:
{
  "inScope": true/false,
  "detectedType": "employment_contract" | "staff_handbook" | "policy_document" | "out_of_scope",
  "reason": "Brief explanation of classification decision"
}`;

export async function preScreen(
  docText: string,
  declaredType: string,
  anthropicApiKey: string,
): Promise<PreScreenResult> {
  // Use first ~4000 chars for classification (enough to detect structure)
  const sampleText = docText.slice(0, 4000);

  const userMessage = `The user declared this document as: "${declaredType}"

Please classify the following document based on its actual content (the declared type may be incorrect):

DOCUMENT TEXT (first portion):
${sampleText}`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: PRE_SCREEN_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`PreScreen API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const result = JSON.parse(text);
    return {
      inScope: Boolean(result.inScope),
      detectedType: result.detectedType || 'employment_contract',
      reason: result.reason || '',
    };
  } catch {
    // If parsing fails, assume in-scope contract (safe default)
    return {
      inScope: true,
      detectedType: 'employment_contract',
      reason: 'Classification parse error — defaulting to employment contract',
    };
  }
}
