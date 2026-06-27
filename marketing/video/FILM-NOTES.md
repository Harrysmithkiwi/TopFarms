# TopFarms Launch Film — Build Notes (handoff)

**Read this before authoring any shot.** It is the single source of truth for building the
TopFarms launch film consistently with the **locked reference shot** (Act 4). It assumes no
memory of prior sessions. Everything here is verified against the locked files in this folder.

The reference shot lives at `marketing/video/act4-hero/` (composition `index.html` + `audio-stem.wav`).
It is **locked** — match its language, don't redesign it. The film is vertical, 1080×1920, 30fps.

---

## 0. The brief in one line

TopFarms is NZ's agricultural job marketplace. The film's thesis: **chaos becoming clarity** —
the overwhelm of hiring resolves, through one match engine, into a short confident shortlist.
The "55-year-old Waikato dairy farmer" test applies to every frame: calm, grounded, legible,
never flashy. Tagline lineage: *Match · Train · Retain.*

---

## 1. Brand discipline (LOCKED — do not substitute)

One green. AI-purple for match only. Inter throughout. Deep green-black frame. Flat: no
gradients, no shadows. Ease-out only — calm and confident, never bouncy/elastic.

| Token | Value | Use |
|---|---|---|
| brand green | `#16A34A` | the one green: match badges, the "3", brand accents |
| brand-hover | `#15803D` | match-badge text on light |
| brand-900 | `#0F3D22` | dark surfaces |
| brand-50 | `#E8F5EC` | match-badge fill, subtle tints |
| **brand-bright** | `#6FCB92` | the one green made legible **on dark** (e.g. the "3" on the dark frame) |
| **--ai (match purple)** | `#8B5CF6` | match-score ring + match moments ONLY. Never decorative. |
| ai-bg | `#F5F3FF` | ring track on light |
| ai label on dark | `#C4B5FD` | legible purple label text on dark |
| bg | `#FAFBF9` | near-white page/text-on-dark |
| surface | `#FFFFFF` | cards (the "clarity") |
| surface-2 | `#F3F5F0` | chips/skill tags, input fills |
| border | `#E5E8E2` | card borders on light |
| text | `#0B1F10` | primary text on light cards |
| text-muted | `#5B6B5F` | secondary text |
| **dark frame** | `#0A2D19` | the film's canvas (dark-deep; deeper than brand-900) |
| on-dark text | `#FAFBF9` (white) | text/stats on the dark frame |

- **Fonts:** `Inter` (400/500/600/700) for everything; `JetBrains Mono` for numerals
  (`font-variant-numeric: tabular-nums`). HyperFrames embeds both automatically — just name them.
- **Shape:** radius 8/12/16; pills fully round (999px). 4-pt spacing grid.
- **Motion:** ease-out exponential curves only (`power2/3.out`, `expo.out`, `power1.out` for camera).
  The ONE inward move (the bubble drain) uses `power2.in` deliberately — it reads as draining/relief.
  No bounce, no elastic, no `repeat:-1`.
- **Contrast note:** dark text on the white cards is correct. HyperFrames `validate` will emit
  ~100 contrast "warnings" for that card text — they are **sampler artifacts** (the validator
  mis-samples card text against the dark frame, and flags faded/overlapping hidden elements).
  Verified against rendered frames: cards render solid white with near-black text. No genuine
  on-dark text (ring label, beats, stats) ever failed. Don't recolor dark-on-white text to "fix" these.

---

## 2. The LOCKED reference shot — Act 4 ("the ad": chaos → clarity), 10s

Vertical 1080×1920. Dark frame `#0A2D19`. The **match-score ring is the fixed hinge** dead-centre
(540, 960) — the convergence point everything else resolves through. Three internal beats:

### Timing map (verified against `act4-hero/index.html`)

| t (s) | Beat | What happens |
|---|---|---|
| 0.0–10.0 | camera | `#camera` scale 1.0 → **1.075**, `power1.out`, whole shot (slow push-in). Wrapper only, never content. |
| 0.15 | ring in | `#ring` opacity0/scale0.9 → 1, 0.7s, `power3.out`. **Holds at 92%** (it does NOT fill from 0 in this shot). |
| 0.45 | seeker in | seeker job card (above ring) in, y40, 0.6s, `power3.out` |
| 1.3 | swap | seeker card out (opacity0, y-26) — context changes, **ring never moves** |
| 1.5 | employer in | employer stat band (below ring: 14 Applicants / 3 Shortlisted / 92% Top match) in |
| 2.0 | flood begins | 64 bubbles in: opacity0/scale0.5 → 1, 0.5s, `power2.out`, stagger each 0.013 from `edges` |
| 2.0–6.0 | orbit | `#bubbles` rotation -2.4 → 1.6, x -10 → 12, 4s, `sine.inOut` (slow orbit of the chaos) |
| 2.2 | handoff | ring fades to 0 over 0.8s, `power2.in` — stays the convergence point, hands off to chaos |
| 2.25 | band out | employer band recedes as chaos floods |
| **4.02–4.7** | **the drain** | per-bubble `to {x:dx, y:dy, scale:0.06, opacity:0}`, 0.62s, **`power2.in`**, converging to centre (540,960). Tiny stagger `4.02 + (i%8)*0.006`. This is the relief. |
| **4.78** | **the settle** | audio low-thud hits exactly as 64 → 3 (see §3). The emotional centre of the film. |
| 4.8 | rows land | 3 shortlist rows: opacity0/scale**1.06** → 1, 0.5s, `power3.out`, stagger 0.12 — land with weight, settle, **no slide, no bounce** |
| 6.05 / 6.8 / 7.6 | beats | "Post once." → "Skip the sorting." → "3 worth calling." (the "3" in `#6FCB92`). One at a time. |
| 8.55 | line clears | "3 worth calling." fades (0.55s, `power2.in`) — it has done its job |
| **9.1–10.0** | **the held breath** | three clean cards **alone** on the dark, near-silence. Nothing else. Let it sit. |

### Why each beat works (preserve this intent)
- **The hinge.** The ring never moving while the context swaps (seeker → employer) tells the eye
  "one system connects both sides." Lock the ring; change what's around it. Never morph screens.
- **The drain as relief.** The overwhelm must be genuinely too-much *first* (64 dense, bright
  bubbles) — the relief only hits as hard as the overwhelm it relieves. The `power2.in` inward
  drain + the audio cutting to a single low settle = the chaos draining out.
- **Weight, not slide.** Rows arrive scale 1.06 → 1.0 (settling *down into* place), never sliding
  in, never bouncing. Confident arrival.
- **The literal held ending.** End on the three cards alone, text gone, near-silence, ~0.9s. The
  confident close is the clean result by itself. Give the breath room to breathe.

### The bubble field (deterministic — must be reproducible)
- Seeded PRNG `mulberry32(0x70f4a3)` — **no `Math.random()`, no `Date.now()`** (HyperFrames is
  deterministic; non-deterministic logic breaks the capture engine).
- `N = 64` bubbles, generated in-script at load, scattered x∈[90, 990-w], y∈[360, 1560-h],
  w 84–180, h 48–74, 1–2 inner grey bars. Desaturated white-on-dark (fill `rgba(255,255,255,0.14)`,
  border `0.22`, bars `0.34`) — pushed past tasteful on purpose.
- Each bubble stores its centre; the drain tweens compute `dx = 540 - cx`, `dy = 960 - cy`.

---

## 3. Audio language (LOCKED): tension → settle → near-silence

Half the shot. Deterministic, synthesized with **FFmpeg** (reproducible — no sourced music). The
envelope is the signature; carry it across the film.

- **Approach:** layers built as `lavfi` sources, shaped with time-varying `volume='...':eval=frame`
  envelopes, mixed `amix=...:normalize=0` then `alimiter=limit=0.95`, stereo 48kHz. The filtergraph
  is in `act4-hero/audio.filtergraph` (commas inside expressions escaped as `\,`; run via
  `-filter_complex_script`). Duration = shot length (Act 4 = 10s).
- **The layers / shape:**
  - low **drone** (sine 55 + 110, lowpassed, ~0.07) — presence 0–6s, fades by ~7s
  - **clutter/tension wash** (pink noise → bandpass 1500 → tremolo 13Hz) ramps in 1.8→4.72s, then
    **hard-cuts at 4.72** (silence is the setup for the settle)
  - **the settle** at **4.78s**: low sine 78 + sub 39, exponential-decay thud, + a short hi-noise
    transient tick. This is "the audible payoff of the compression" — it lands the instant N→3.
  - **breath pad** (faint sine 210) 6.0s onward, fading to silence — the near-silent held ending.
- **Rule:** the settle hit time = the visual N→3 settle time. If a shot's collapse lands at a
  different t, move the `4.78` constants to match. Keep clutter-cut just *before* the settle.
- **Deliverable:** master = MP4 with audio muxed (via the `<audio>` element); stem = the WAV
  delivered alongside. Regenerate the stem at the shot's exact duration.

---

## 4. `data-anim` asset vocabulary (the targeting contract)

Every animatable element across the framework-free assets carries a stable `data-anim` hook (same
names in the React app, PR #3). Use these exact names in new shots so the film speaks one language:

| Selector | Element | Animate |
|---|---|---|
| `[data-anim="match-ring"]` (+ `data-variant="score"\|"badge"`) | the ring | container scale/opacity |
| `[data-anim="ring-fill"]` | the ring arc | `--ring-offset` / `stroke-dashoffset`: **540.35 = 0%, 43.23 = 92%** (r=86, C≈540.35). Tween down to fill on. Badge arc: r=22, C≈138.23, 94%=8.29. |
| `[data-anim="match-badge"]` | the % pill | pop/fade |
| `[data-anim="shortlist-row"]` (+ `data-top`) | candidate row | settle (scale 1.06→1) |
| `[data-anim="skill-bar"]` / `[data-anim="skill-fill"]` | profile skill bar / its fill | width fill |
| `[data-anim="chip"]` / `[data-anim="chip-tick"]` | filter pill / its ✓ | default UNCHECKED; flip `data-state` + draw tick (`pathLength=1`, offset 1→0) |
| `[data-anim="job-card"]` | job listing card | card + stagger its chips |
| `[data-anim="logo-leaf"]` / `logo-leaf-stroke` / `logo-vein` / `logo-word` / `logo-lockup` | logo | leaf fillable + strokeable; vein draw-on; wordmark in |
| `[data-anim="establishing-scroll"]` | landing snapshot body | slow wide auto-scroll + push-in |

---

## 5. Asset inventory (paths relative to `marketing/`)

Framework-free, self-contained HTML (tokens inlined, fonts via CDN, no build/router/auth/external
images). Source assets live in `marketing/source-assets/`; the locked composition is in
`marketing/video/act4-hero/`. Source these for markup/CSS/values when authoring shots;
**`source-assets/manifest.md` is the index** and lists every file's dimensions and key selectors.

| Path | What it is | Use in film |
|---|---|---|
| `source-assets/manifest.md` | the asset index + selector map + dimensions | read first when picking assets |
| `source-assets/components/match-score-ring.html` | hero ring; fill = single settable `--ring-offset` (preset 92%) | the connective motif / Act 4 hinge |
| `source-assets/components/job-card.html` | job card, chip row (Dairy·Rotary shed·Accommodation·AEWV), 94% badge | seeker-side beats |
| `source-assets/components/shortlist-row.html` | one ranked row + match badge (×3 = the payoff) | the "3 worth calling" clarity |
| `source-assets/components/chip.html` | pill, unchecked→checked with strokeable ✓ | filter / criteria moments |
| `source-assets/components/logo-lockup.html` | leaf (fill + strokeable) + wordmark, draw-on | open/close brand sting |
| `source-assets/screens/seeker-job-feed.html` | assembled seeker mobile screen (390px) | establishing/wide shots |
| `source-assets/screens/employer-shortlist.html` | assembled employer mobile screen (390px) | establishing/wide shots |
| `source-assets/landing-establishing.html` | flattened static snapshot of the live launch page, **1440×6204**, `establishing-scroll` | slow wide auto-scroll + gentle push-in (establishing, NOT a walkthrough) |
| `video/act4-hero/` | **the LOCKED reference composition** (HyperFrames project) | copy its patterns for every act |
| `video/act4-hero/audio.filtergraph` | the audio envelope source | adapt per-shot duration/settle |

The three shortlist data sets (reuse verbatim): Alex R. · Dairy Farm Manager · Waikato — Herd
Management / Rotary shed / 5 yrs — **92%**; Jordan M. · Herd Manager · Bay of Plenty — Pasture /
Herringbone / 3 yrs — **85%**; Sam T. · Relief Milker · Waikato — Milking / AMS / 2 yrs — **81%**.

---

## 6. HyperFrames build & render pattern

Toolchain (verified): **hyperframes 0.7.4** (run via `npx --yes hyperframes@0.7.4 ...`), Node 22,
FFmpeg, Chrome headless-shell (auto-cached). `doctor` flags low RAM (8GB) — keep compositions lean
(no shaders, modest element counts; 64 bubbles + 10s @ 1080×1920 renders fine in <30s).

### Scaffold
```
cd marketing/video
npx --yes hyperframes@0.7.4 init <act-name>        # creates <act-name>/index.html + config
```

### Composition conventions (standalone single shot)
- **Standalone root** goes directly in `<body>` (NO `<template>` wrapper):
  `<div id="root" data-composition-id="main" data-start="0" data-duration="<sec>" data-width="1080" data-height="1920">`.
- GSAP from CDN: `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`.
- ONE paused timeline, registered: `window.__timelines["main"] = gsap.timeline({ paused: true });`
  built **synchronously** at load (no async/setTimeout/Promise). Player owns playback.
- **Continuous single-shot pattern:** elements are always in the DOM; animate with `fromTo` for
  determinism. They are NOT timed "clips" — only timed/media elements need `class="clip"` +
  `data-start`/`data-duration`/`data-track-index`.
- **Audio** = separate `<audio class="clip" data-start="0" data-duration="<sec>" data-track-index="0" src="audio-stem.wav" data-volume="1">`. Muxed into the master on render.
- **Camera** = a wrapper div (`#camera`, `transform-origin: 540px 960px`); animate scale/rotation on
  it, never on content.
- **Determinism:** seeded `mulberry32` only. No `Math.random()` / `Date.now()` / `new Date()` / network.

### Two gotchas that WILL bite (both hit Act 4, both solved here)
1. **`gsap_css_transform_conflict`** — if GSAP animates x/y/scale on an element that ALSO has CSS
   `transform: translate(-50%,-50%)` for centering, GSAP clobbers the centering. **Fix:** put the
   centering transform on a positioning *wrapper* (`#ringPos`, `#seekerPos`, `#empPos`), animate the
   inner element. (`fromTo` is technically exempt, but wrappers are the clean pattern.)
2. **`content_overlap` inspect warnings** — elements that share a screen zone at *different times*
   (e.g. the faded ring and the later rows both at centre) get flagged. They're intentional
   cross-time layering. **Fix:** mark the shared-zone containers with `data-layout-allow-overlap`.

### Check + render
```
cd <act-name>
npx --yes hyperframes@0.7.4 lint        # must be 0/0
npx --yes hyperframes@0.7.4 inspect --at <hero times>   # 0 layout issues (contrast warnings = artifacts, see §1)
# audio: synth the stem at the shot's exact duration, e.g.
ffmpeg -y -f lavfi -i "sine=f=55:d=<sec>" ... -filter_complex_script audio.filtergraph -map "[out]" -t <sec> -ar 48000 audio-stem.wav
npx --yes hyperframes@0.7.4 render --output <act-name>.mp4     # master (video + AAC audio)
# verify by eye: extract frames and LOOK at them
ffmpeg -y -ss <t> -i <act-name>.mp4 -frames:v 1 frame.png
```
Deliver: the MP4 (master) + the WAV (stem). Always eyeball rendered frames at the hero beats; the
screenshot path is the only real proof a shot lands.

---

## 7. Remaining acts (build around Act 4)

Act 4 is the reference. For Acts 1, 2, 3, 5, 6 keep: the dark frame, one-green + match-purple,
Inter, ease-out, the `data-anim` vocabulary, the match-score ring as the connective motif, and the
audio language (tension → settle → near-silence) shaped per beat. Carry mock data verbatim (§5).
Reuse the camera/wrapper, deterministic-seed, and check/render patterns above.

**Next task on deck:** a **20-second product cut** assembled against these notes. It will likely
chain establishing (`landing-establishing.html` slow scroll) → the ring/match explainer → the
Act-4 collapse-to-three as the climax → a logo-lockup close, with one continuous audio envelope
that lands its settle on the collapse. Build it as its own HyperFrames project under `marketing/video/`.

---
_Last locked: Act 4 v2 (10s) — held-alone ending + pushed chaos. This doc is the carrier; if it and
a rendered frame disagree, trust the frame and update this doc._
