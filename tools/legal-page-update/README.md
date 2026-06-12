# Legal-page write-automation tooling (LPU v1.0)

Governed, deterministic applier for changes to the four database-registered
legal pages:

- `privacy/index.html`
- `terms/index.html`
- `complaints/index.html`
- `tribunal-privacy/index.html`

It exists to close one recurring defect class: **version stamps drifting**
across a page's three locations (header badge, footer governance line, change
log) and **hand-applied edits diverging** from Director-approved wording. From
this build onward, every legal-page change is encoded as a reviewable JSON
edit-spec and applied by a script — not by hand.

> **CC never touches the database.** The register and the acceptance function
> are operated by the Chairman. This tool only edits HTML files in the repo.

## Governed flow

1. **Register due raised** — the database register flags a legal page as due.
2. **Chairman drafts diff document** — the proposed wording change.
3. **Director approves wording** — producing an `approval_ref` for that wording.
4. **Edit-spec JSON committed** under `tools/legal-page-update/edit-specs/`.
5. **Script applied** on a `claude/legal-<slug>-NNN` branch:
   ```
   node tools/legal-page-update/apply-legal-update.mjs <edit-spec.json> [--dry-run]
   ```
6. **Director merges** from the compare URL.
7. **Chairman runs database acceptance** (Chairman-side only; CC never executes
   any database operation).

**An edit-spec without an `approval_ref` is not applicable to `privacy/`,
`terms/`, `complaints/`, or `tribunal-privacy/`.** The script rejects any spec
lacking a non-empty `approval_ref`.

## Edit-spec shape

```json
{
  "spec_id": "LPU-2026-001",
  "page_path": "privacy/index.html",
  "new_version_label": "Version 4.3 — 15 June 2026",
  "edits": [
    { "find": "exact unique string", "replace": "replacement string" }
  ],
  "changelog_append": "string or null",
  "approval_ref": "Director sign-off reference"
}
```

- `page_path` must be one of the four governed pages (a fixture path under
  `tools/legal-page-update/fixtures/` is permitted for self-testing only).
- `new_version_label` must match `Version <n> — <day> <month> <year>`
  (literal em-dash), e.g. `Version 4.3 — 15 June 2026`.
- Each `edits[].find` MUST occur **exactly once** in the target file. Zero or
  more than one occurrence aborts the whole run (all-or-nothing); nothing is
  written.

## What the script guarantees

Applied in this order:

1. **edits** — each `find` replaced by its `replace` (validated unique first).
2. **header version badge** — the `Version … — …` stamp nearest the page `<h1>`
   is set to `new_version_label`.
3. **footer governance stamp** — the `Current version: …` stamp (or, failing
   that, the trailing header-style stamp) is set to the same version, with the
   `Version ` prefix stripped where the footer pattern omits it, and
   `changelog_append` appended when non-null.
4. **stamp-sync invariant** — after transformation, every header-style
   `Version <n> — <day> <month> <year>` stamp must equal `new_version_label`,
   or the run aborts and writes nothing.
5. **banned-term sweep** — `Flash Check` / `Full Check` (case-sensitive) present
   after edits aborts the run. Use the canonical product names
   (Contract Compliance Check; Three-Document Bundle).
6. **REPORT-ONLY** — a count of `scan` used as a noun is printed (never fails;
   Director decision pending).

On success the script prints:

```
APPLIED <spec_id> <page_path> sha256:<new file sha256>
```

With `--dry-run` it additionally prints `DRY-RUN — file not written` and writes
nothing.

## Self-test

A fixture and spec are included (these are NOT real legal pages):

- `fixtures/sample/index.html`
- `fixtures/sample-spec.json`

```
node tools/legal-page-update/apply-legal-update.mjs tools/legal-page-update/fixtures/sample-spec.json --dry-run
node tools/legal-page-update/apply-legal-update.mjs tools/legal-page-update/fixtures/sample-spec.json
```

The first run reports `APPLIED … DRY-RUN` and leaves the fixture unchanged. The
second applies the change (header and footer both carry the new version, and the
body sentence is amended). Running the same spec a third time prints `EDIT-FAIL`
because the `find` string is no longer present.
