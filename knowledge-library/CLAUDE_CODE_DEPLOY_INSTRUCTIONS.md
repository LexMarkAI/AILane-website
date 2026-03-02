# AILANE — Knowledge Library Deployment Instructions
# For Claude Code to execute against the AILane-website repo

## TASK

Add the Knowledge Library page to the Ailane website at `ailane.ai/knowledge-library/`.
The page is a complete, self-contained HTML file that connects to the live Supabase database
and displays the UK employment legislation library with filtering, search, and detail panels.

## FILES TO DEPLOY

1. Create directory: `knowledge-library/` in repo root
2. Copy the `knowledge-library.html` file as `knowledge-library/index.html`

That's it — single file, no build step needed. GitHub Pages serves it directly.

## ALSO: Add navigation link to existing dashboard-app

In the existing `dashboard-app/index.html`, find the navigation/header section and add
a link to the Knowledge Library tab:

```html
<a href="/knowledge-library/" title="Knowledge Library">Knowledge Library</a>
```

Match the existing nav styling. The Knowledge Library page already has reciprocal navigation
links back to the dashboard and other pages.

## VERIFICATION

After deployment, the page should be accessible at:
- https://ailane.ai/knowledge-library/

It will automatically fetch legislation data from the Supabase database and render the grid.

## FEATURES INCLUDED

- Live data from Supabase `legislation_library` table (30 instruments)
- Search across titles, summaries, provisions, tags
- Filter by type (Acts, SIs, Codes), lifecycle stage, ACEI category
- Sort by SCI significance, date, or alphabetical
- Click any legislation → slide-over detail panel with:
  - Full summary and key provisions
  - Interactive employer obligations checklist (tick off items)
  - ACEI category impact visualisation (primary + linked categories)
  - Enforcement mechanisms and penalty framework
  - RRI pillar impact mapping (5 pillars with icons)
  - Forward Exposure Register status for pending bills (ACEI Art. VII)
  - Key dates and lifecycle tracking
  - Constitutional governance references
  - Searchable tags
  - Direct link to legislation.gov.uk
  - Copy reference button
- Stats bar with live counts
- Responsive design (mobile-friendly)
- Top navigation with links to Dashboard, Command Centre, Ticker
- mark@ailane.ai user badge
