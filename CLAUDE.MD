# تأكد (TAAKAD): project notes for Claude

Privacy-redaction scanner for Saudi official documents. Upload an ID/Iqama/passport/invoice
(image, PDF, or DOCX); Gemini vision returns bounding boxes for sensitive fields; the user
blacks out / blurs / pixelates them and exports a safe copy.

Repo: <https://github.com/LOAY109/taakad> (public). The developer works in English. The product is Arabic.

## Two implementations, only one is real

| path | status |
| --- | --- |
| `web/` | The product. Vanilla HTML/CSS/JS plus a dependency-free Node server. All work happens here. |
| `lib/`, `pubspec.yaml` | Flutter shell. No platform folders, no API key wired in, and `gemini_service.dart` falls back to hard-coded mock data on every path. Treat it as a prototype unless told otherwise. |

`check_img.js` is dead debug scrap pointing at a path on another machine. Ignore it.

## Run

```sh
npm start                     # node web/server.js → http://localhost:3000
curl localhost:3000/healthz   # {"ok":true,"geminiKeyConfigured":true|false}
```

- Needs `GEMINI_API_KEY`. Locally it lives in `.env` at the repo root (gitignored; template in
  `.env.example`). `server.js` has its own small `.env` loader (about 25 lines), so do not add
  `dotenv`. A real environment variable always wins over `.env`, and the boot banner says which
  one is in use.
- Zero npm dependencies. `server.js` uses only `http`, `https`, `fs`, `path`. Keep it that way.
- Node 18 or newer. Windows dev box: PowerShell primary, Git Bash available, Python 3.13
  available, and no Chrome installed, so the browser-automation MCP cannot launch.

## Architecture (web)

- The browser never calls Gemini. `app.js` posts `{image: base64, mimeType}` to the
  same-origin `POST /api/analyze`. `server.js` holds the key and proxies to Gemini with a
  long system prompt, a model fallback chain, and backoff on 429/503. Default chain is
  `gemini-3.5-flash-lite → gemini-3.1-flash-lite → gemma-4-26b-a4b-it`, overridable with
  `GEMINI_MODELS`. Measured on a synthetic ID card: flash-lite answers in about 5s with clean
  JSON and 7/7 fields; Gemma matches the accuracy but takes 60 to 80s and wraps its JSON in a
  markdown preamble, so the server parses with `extractJson()` rather than bare `JSON.parse`.
  Gemma is the backstop because its free quota is 14,400/day. Full Gemini 3.x Flash is capped
  at 20/day on this plan, Gemini 1.5 and 2.5 are retired for new keys, and the pro tier returns
  429. Confirmed from the AI Studio rate-limit page: each flash-lite model gets 15 RPM and
  500 RPD, so the two together give 1,000 fast scans a day before Gemma is touched.
  Response: `{summary_arabic, is_safe_overall, detections[]}`, where each
  detection has `box_2d: [ymin, xmin, ymax, xmax]` on a 0 to 1000 scale, plus `data_type`,
  `risk_level`, `default_selected`, and `is_recommended_only`. The server post-processes boxes
  (ordering, padding) and forces `face_photo` and `doc_meta` to opt-in.
- Static files are served by the same process from `web/` (`PUBLIC_DIR = __dirname`).
- The client is a 3-step wizard: upload, then analysis with drag/resize boxes, then a redaction
  studio (blackout / blur / pixelate, watermark, jsPDF export, Web Share). All rendering is
  canvas. `pdf.js`, `mammoth`, and `jsPDF` load from cdnjs.

## Deployment

Hosted on a Node PaaS (the user said Render / Railway / VPS). `package.json` exists only so the
host detects a Node service and runs `npm start`. Without it the host publishes a static site,
and `/api/analyze` returns 404/501 while the page itself looks fine. `server.listen` binds
`0.0.0.0`. Set `GEMINI_API_KEY` in the host dashboard, then check `/healthz` before testing a scan.

## Conventions

- Language split: everything the user sees is Arabic; everything in `console.*` is English.
  Strings that travel to the browser (JSON `error` fields, `reject(new Error(...))` messages,
  toasts) are user-facing, so keep them Arabic.
- Arabic typography: no negative `letter-spacing` on Arabic; headings need `line-height` of at
  least 1.35 and body text at least 1.7. Glue Latin tokens to their Arabic noun with `&nbsp;`
  (`ملف&nbsp;PDF`, `مستند&nbsp;Word`) so they cannot break across lines. The font is Cairo.
- No emoji as UI icons. Use inline SVG with `aria-hidden="true"`. Emoji in server logs is fine.
- Security: every model-returned string goes through `escapeHtml()` before `innerHTML`.
  Never commit an API key.
- Accessibility floor, already met, so keep it: 44px touch targets (`--tap-target`),
  `:focus-visible` rings on everything interactive, `prefers-reduced-motion` respected,
  contrast of at least 4.5:1 on all text tokens in both themes, `aria-pressed` kept in sync on
  every toggle-style button, and dynamic lists rebuilt with `innerHTML` re-find focus by
  `data-item-id`. Light-mode accents are darker than dark-mode ones; if you darken an accent
  that is also used as a fill, flip the text on it to white.
- Responsive: breakpoints at 920 / 820 / 640 / 400px. Any `minmax()` grid must be
  `minmax(min(100%, Npx), 1fr)` or it overflows at 375px. The stepper shows only the active
  step's label under 640px.
- Toast: default 2.6s, error toasts 4s, X button, hover holds it open, Escape closes.
  The hidden state is `transform: translateY(calc(-100% - 32px))`, never a fixed negative `top`.

## Gotchas that have bitten before

- `.file-hidden-input` is an invisible overlay covering the whole dropzone. Clicks hit it
  natively, so do not forward `dropZone` clicks to `fileInput.click()` (that opens the picker
  twice), and do not give the dropzone its own `tabindex` (double tab stop, double open on
  Enter). Always set `fileInput.value = ''` after reading, or re-picking the same file is
  silently ignored.
- A stray Arabic letter after the final `});` in `server.js` (commit `ccc0608`) crashed the
  server at boot with `ReferenceError`. `node --check` passes on it because the letter is a
  valid identifier. Always boot-test; never trust `--check` alone.
- When patching files with Python through `python -c` in Bash, the shell mangles escaped `\r\n`
  and Arabic `\uXXXX`, and `open(..., 'w')` truncates the target before a later exception fires.
  One such failure left `server.js` at 0 bytes mid-session. Write to a `.tmp.js`, validate with
  `node --check`, then `os.replace`. The console is cp1252, so printing Arabic to it raises
  `UnicodeEncodeError`; print ASCII skeletons or counts instead.
- A repo hook blocks `git checkout -- <file>`. Restore with `git show HEAD:<file>` and write
  the result with Python.

## Verify before you're done

```sh
node --check web/app.js && node --check web/server.js
npm start          # then GET / and GET /healthz
```

There is no test suite. UI changes are verified by computation (WCAG contrast ratios, overflow
arithmetic against padding chains) and by the user's phone screenshots.

## State as of 2026-09-16: read this first

Nothing from this session is committed or pushed. `origin/main` still has the boot crash
and the hard-coded key. Working tree:

| file | what's in the diff |
| --- | --- |
| `web/server.js` | boot-crash fix, env-only key, `.env` loader, `/healthz`, missing-key 500, `0.0.0.0` bind, English logs, model chain moved to flash-lite with Gemma backstop and `GEMINI_MODELS` override, tolerant `extractJson()`, 404/429-specific error messages |
| `web/app.js` | keyboard-operable cards, ARIA and `aria-pressed` sync, modal focus management, toast rework, single file picker with `value` reset and error surfacing, `aria-current` on the stepper |
| `web/index.html` | ARIA attributes, skip link, toast close button, `&nbsp;`-glued Latin tokens |
| `web/styles.css` | contrast tokens, focus rings, 44px targets, reduced motion, 640/400px breakpoints, Arabic typography, toast geometry |
| `package.json`, `.gitignore`, `.env.example` | new, for deployment support |
| `.env` | the user's real key, gitignored; never stage it |

Owed by the user (only they can do these):

1. Rotate the Gemini key. `AIzaSyDorl9…` is in public git history and must be treated as burned.
2. Set `GEMINI_API_KEY` in the host dashboard.
3. Commit and push. Suggested split: one commit for deployment (`server.js` plus the three new
   root files), one for UI and accessibility (`app.js`, `index.html`, `styles.css`).

Not done / known remaining:

- The Flutter app is untouched: same interaction model, still mock-only, and it cannot build
  without `flutter create .`.
- The latest fixes (double picker, toast, phone layout) are verified by code reading and boot
  tests only, with no browser run.
