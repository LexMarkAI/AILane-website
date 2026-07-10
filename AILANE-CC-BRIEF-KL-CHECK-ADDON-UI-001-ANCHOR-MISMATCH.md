# ANCHOR-MISMATCH — AILANE-CC-BRIEF-KL-CHECK-ADDON-UI-001

**Repo:** `LexMarkAI/AILane-website` (§0.1 repo gate PASSED — `origin` is
`https://github.com/LexMarkAI/AILane-website`).
**Determination:** §0.2 anchor **(e) is materially absent** → the brief's
deterministic **ANCHOR-MISMATCH** completion path applies (§0.2 gate, §3).
No edits were made to `kl-app.jsx` or `knowledge-library/kl-app.js`
("do NOT improvise: implement nothing … do not invent a command").
Base HEAD at time of check: `98d4f5e` (Merge PR #404).

Anchors (a)–(d) were verified and **match** the Grounding; only anchor (e)
differs. Per the gate, "if **any** of (a)–(e) is materially absent," the
ANCHOR-MISMATCH path is the completed execution. Full findings below.

---

## §0.2(a) — `check_limit_reached` branch (the injection point) — MATCHES

**Enclosing function:** `async function handleRunAnalysis(documentId, msgId)`
(declared `knowledge-library/kl-app.jsx:10453`).
**Branch location:** `kl-app.jsx:10510`, inside the `if (!startResponse.ok)`
block, after `const startData = await startResponse.json();`.

Quoted verbatim as it appears in `kl-app.jsx` (lines 10510–10529):

```js
        if (startData && startData.error === 'check_limit_reached') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === loadingMsgId) {
                return Object.assign({}, m, {
                  content:
                    startData.message ||
                    'You have used all bundled Contract Compliance Checks in this session. Additional checks are available at £15 each.',
                  isAnalysisLoading: false,
                  isLocal: true,
                });
              }
              if (m.id === msgId) {
                return Object.assign({}, m, { analysisTriggered: false });
              }
              return m;
            })
          );
          return;
        }
```

**Message-object flags in use:** `content` (set to `startData.message ||`
the hardcoded fallback), `isAnalysisLoading: false`, `isLocal: true`, and the
row is keyed by `id` (`m.id === loadingMsgId`). This matches the Grounding
shape exactly, including the retired **`£15 each`** (£15) fallback string
that Change C (§2) would correct.

## §0.2(b) — upsell/extension card that calls `create-checkout` — MATCHES

**Component:** `function UpsellCard({ productType, minutesRemaining, onDismiss })`
(`kl-app.jsx:6704`). Config object `UPSELL_CONFIG` at `kl-app.jsx:6684`.

- **Offer / `productType` shape:** `UPSELL_CONFIG[productType]` →
  `{ threshold, title, message, offers: [{ cta, productType }] }`; card
  iterates `c.offers.map((offer) => …)` and each button carries
  `offer.productType` (existing extend types `kl_extend_qs_to_day`,
  `kl_extend_qs_to_week`, `kl_extend_day_to_week`).
- **Terms-consent gate:** `const [consent, setConsent] = useState(false)`; a
  single checkbox governs the card; `startExtend()` early-returns with an error
  if `!consent`; buttons are `disabled={!ready}` where `ready = consent && !busy`.
- **`gtag` begin_checkout call:** verbatim
  `try { if (window.gtag) window.gtag('event', 'begin_checkout', { item_id: offer.productType }); } catch (e) {}`
  (`kl-app.jsx:6722`).
- **Checkout call:** `fetch(CREATE_CHECKOUT_URL, { method:'POST',
  headers:{ 'Content-Type':'application/json' },
  body: JSON.stringify({ product_type: offer.productType }) })` → on `{ url }`
  `window.location.href = d.url` → on failure the catch sets the inline error
  (`kl-app.jsx:6723`). No `Authorization`/`apikey`/`email` header — sends
  `{ product_type }` only.
- **Busy / inline-error state:** `const [busy, setBusy] = useState('')` (single
  in-flight guard, disables buttons; label flips to "Preparing secure checkout…")
  and `const [err, setErr] = useState('')`; the failure catch sets
  `"Checkout is temporarily unavailable — please try again in a moment."`

## §0.2(c) — message-render component — MATCHES

**Component:** `function MessageBubble({ msg, onRunAnalysis, onVaultOnly })`
(`kl-app.jsx:2491`), rendered from the chat list via `messages.map((m, i) => …)`
returning `<MessageBubble key={i} msg={m} … />` (`kl-app.jsx:3037`–`3048`).

A message object becomes a bubble through ordered branches:
`type === 'file_upload'` → file bubble; `role === 'user'` → user bubble;
`msg.isUploadComplete` → dual-choice card; otherwise the default **assistant**
return (`kl-app.jsx:2545`+) renders `EileenSenderLabel`, an optional
`msg.isAnalysisLoading` indicator, and the text body from
`renderMarkdown(msg.content || '')`. The local `check_limit_reached` message
(`isLocal: true`, `isAnalysisLoading: false`, plain `content`) falls through to
this default assistant branch. This is the branch where a `checkAddonOffer === true`
flag test would render an extra card **beneath the message text** (Change B, §2).

## §0.2(d) — `CREATE_CHECKOUT_URL` — MATCHES

`const CREATE_CHECKOUT_URL = 'https://cnbsxwtvazfvzmltkuvx.functions.supabase.co/create-checkout';`
(`kl-app.jsx:6678`). Confirmed it targets `…functions.supabase.co/create-checkout`.

## §0.2(e) — build command producing `kl-app.js` from `kl-app.jsx` — **ABSENT (mismatch)**

The brief (§0.2e, §3) requires a **documented** build command in `package.json`
scripts, `README`, and/or `CLAUDE.md`. None exists. Exhaustive check:

| Source | Result |
|---|---|
| `package.json` `scripts` | Only `"test": "echo \"Error: no test specified\" && exit 1"`. No `build`, no `build:kl`, no esbuild invocation. |
| `README.md` | Two lines ("# AILane-website / Official Ailane website"). No build command. |
| `CLAUDE.md` | Describes the *pattern* ("pre-compiled JSX via esbuild (92KB bundle pattern)") and RULE 23 policy, but gives **no exact runnable command**. (The "92KB bundle" figure does not even match `kl-app.js`, which is ~546 KB.) |
| `docs/`, `.claude/` | No build command / esbuild invocation for `kl-app`. |
| `.github/workflows/` | `dealroom-readiness.yml`, `post-deploy-cache-check.yml`, `ringfence-terms.yml`. None builds the bundle; `post-deploy-cache-check` only fires on GitHub Pages `page_build` (static serve, no esbuild step). |
| Any build script | Only `workspace/build.sh`, which builds a **different** app (`workspace/src/index.js` → `workspace/dist/workspace-bundle.js`) and uses `--global-name=AilaneWorkspace --minify` — **both forbidden by §3** for the KL build ("must NOT use `--global-name`"). It is not the `kl-app.js` build command. |

**Corroborating git history — a rebuild is not merely undocumented, it is unsafe:**

- Commit `605d051`: "The served SPA bundle (`kl-app.js`) was hand-edited ahead
  of its source (`kl-app.jsx`) in commit `4ae304f` … so a byte-fidelity esbuild
  rebuild **would have dropped live `detectKLPass` / `klVaultNavButton` /
  `KL_SUBSCRIPTION_TIERS` code**. The Recent Cases nav item is therefore added
  **surgically to BOTH `kl-app.jsx` and `kl-app.js`** … rather than via full
  rebuild, preserving the divergent live features."
- Commit `d5b49bd`: "Note: `kl-app.jsx` (esbuild source of `kl-app.js`) mirrored
  alongside the shipped bundle **to prevent a rebuild reverting the change**."

The served `kl-app.js` and its `kl-app.jsx` source have **diverged**; the
maintainers deliberately do **not** run a full esbuild rebuild (it would revert
live features that also fall under this brief's §7 scope-exclusions, e.g.
`detectKLPass`/routing). No safe, documented build command exists to satisfy §3
and §4(f).

Because §3 states plainly — *"If no build command is documented, that is an §0
ANCHOR-MISMATCH (report it; **do not invent a command**)"* — and §0.2 directs
*"do NOT improvise: implement nothing"*, no source edits were performed.

---

## Why not the alternatives

- **Inventing an esbuild command** is expressly prohibited ("do not invent a
  command") and would, per the git history above, revert live
  `detectKLPass`/`klVaultNavButton`/`KL_SUBSCRIPTION_TIERS`/Recent-Cases code —
  a real regression touching §7-excluded surfaces.
- **Hand-editing both files** (the maintainers' surgical practice) is
  "improvising"; §0.2 forecloses it ("implement nothing") when the anchor gate
  trips.

## What would clear the gate (for the Director)

Provide a documented build command that produces `knowledge-library/kl-app.js`
from `knowledge-library/kl-app.jsx` — e.g. add an npm script such as
`"build:kl": "esbuild knowledge-library/kl-app.jsx --bundle --format=iife --jsx=transform --outfile=knowledge-library/kl-app.js"`
(no `--global-name`, per RULE 23) — **and** confirm whether the current
`kl-app.js` ⇄ `kl-app.jsx` divergence has been reconciled so a rebuild will not
drop live features. With that documented and safe, §1–§3 can be executed as
written.

## Self-check (§4 items applicable to this path)

- (a) Working tree carries only this findings report; **no change to
  `kl-app.jsx` or `knowledge-library/kl-app.js`** (implement-nothing path).
- (c) `grep -i "Solicitor Preparation Pack" kl-app.jsx` → **0** (wrong-name
  guard holds; nothing added).
- (d) The retired `£15` string remains untouched at `kl-app.jsx:10517` — it is
  the single occurrence in the file; correcting it is Change C, deferred with
  the rest of the implementation.
- (g) `<head>` untouched; no HTML/GA4/CSP/favicon change.
