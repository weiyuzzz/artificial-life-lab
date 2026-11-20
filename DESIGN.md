# Design Brief

## Direction

Specimen Observatory — a dark, precise instrument console where a living world fills the viewport and data reads like lab telemetry.

## Tone

Industrial-scientific restraint: blue-black graphite surfaces, hairline rules, mono readouts; color is reserved for living things.

## Differentiation

Species colors are the only saturated hues on screen, so the simulation itself is the brightest, most alive element; UI chrome stays quiet.

## Color Palette

| Token             | OKLCH            | Role                                         |
| ----------------- | ---------------- | -------------------------------------------- |
| background        | 0.155 0.014 250  | app shell, deep blue-black                   |
| foreground        | 0.93 0.008 240   | primary text                                 |
| card / sidebar    | 0.19 / 0.175     | sidebar + header surfaces                    |
| primary           | 0.87 0.17 128    | phosphor lime — active states, primary CTA   |
| accent            | 0.8 0.11 200     | cyan — secondary highlights, links           |
| muted-foreground  | 0.66 0.018 245   | labels, axis text                            |
| destructive       | 0.66 0.19 25     | reset/delete, extinction events              |
| warning / success | 0.8 0.14 75 / 0.76 0.15 152 | catastrophes / approvals          |
| species-herbivore | 0.8 0.11 200     | herbivores (= chart-1)                       |
| species-predator  | 0.7 0.17 28      | predators (= chart-2)                        |
| species-plant     | 0.82 0.16 132    | plants (= chart-3)                           |
| species-corpse    | 0.6 0.06 65      | corpses; chart-4 energy 0.74 0.1 75          |
| zone-fertile/arid/water | 0.24 0.04 150 / 0.25 0.035 70 / 0.24 0.045 225 | low-chroma terrain |
| world-bg / grid   | 0.13 0.012 250 / 0.22 0.014 250 | canvas backdrop + measurement grid |

Canvas code reads `--species-*`, `--zone-*`, `--world-*` via getComputedStyle and builds `oklch(L C H)` strings.

## Typography

- Display: Space Grotesk — wordmark, page titles, panel titles (CJK falls back to PingFang SC / Noto Sans SC)
- Body: General Sans — UI labels, descriptions, buttons
- Mono: JetBrains Mono — all numbers, cycle counter, gene values, section labels (`.readout`, `.section-label`)
- Scale: page title `text-2xl md:text-3xl font-display font-semibold tracking-tight`, panel title `text-sm font-display font-medium`, label `.section-label` (11px mono uppercase tracking 0.14em), body `text-sm`, big stat `text-2xl readout`

## Elevation & Depth

Flat layered graphite: background < sidebar < popover; separation by 1px hairline borders, `shadow-elevated` only for floating canvas overlays and dialogs.

## Structural Zones

| Zone            | Background                       | Border     | Notes                                                       |
| --------------- | -------------------------------- | ---------- | ----------------------------------------------------------- |
| Header (48px)   | bg-card                          | border-b   | wordmark, live cycle readout, nav, 中文/EN toggle, sign-in  |
| Simulation canvas | world-bg + `.lab-grid`, `.canvas-vignette` | —  | fills remaining width/height; edge ruler ticks; minimap corner |
| Time-control strip | `.instrument-glass` docked bottom-center of canvas | hairline | pause/step/speed segmented/fast-forward progress/overlay toggles |
| Sidebar (360–400px) | bg-sidebar                    | border-l   | Tabs (Inspector/Population/Timeline/Environment/Experiment); sections divided by border-t, not cards |
| Library / Compare / Admin pages | bg-background, tables on bg-card rows | border-b rows | dense data tables and overlaid charts, no card grids |
| Footer          | bg-background                    | border-t   | single 32px status line: seed, FPS, entity counts, caffeine.ai credit |

## Spacing & Rhythm

Dense instrument spacing: 4/8/12px micro gaps, sidebar section padding px-4 py-3, sections separated by hairlines rather than gaps.

## Component Patterns

- Buttons: rounded-sm (2–4px); primary = lime bg dark text; secondary = bg-secondary hairline; icon buttons 32px square ghost
- Speed control: segmented group, active segment bg-primary text-primary-foreground
- Panels: no cards — sections with `.section-label` header + border-t; values in `.readout`
- Badges: rounded-sm mono 10–11px, tinted species color at 15% bg with full-color text
- Charts: recharts, 1.5px strokes, no fill or 8% area fill, grid stroke = border, axis text muted-foreground mono 10px
- Sliders: thin 2px track, lime thumb; value readout right-aligned mono
- Neural net diagram: nodes as small circles, edge color cyan(+) / coral(−), opacity = weight magnitude

## Motion

- Entrance: sidebar tab content `animate-fade-in` 280ms; dialogs fade + scale 0.98→1
- Hover: 150–300ms `transition-smooth` color/border shifts only, no lifts
- Live: `animate-pulse-dot` on running indicator; `animate-value-flash` on changed stats; `animate-scan` on fast-forward progress bar
- Selection on canvas: crosshair brackets + dashed vision ring around selected organism

## Constraints

- Dark-only; no light theme toggle
- Saturated color only for species, zones, charts, and primary active state; chrome stays neutral
- No card stacks, no gradients on surfaces, no glow/neon shadows, no cartoon shapes or emoji
- Organisms are geometric: herbivore = triangle/teardrop with heading, predator = sharper chevron, plant = dot, corpse = hollow small square
- Mobile: sidebar becomes bottom sheet / tabs below canvas; canvas keeps ≥ 55vh

## Signature Detail

Telemetry-grade readouts — mono tabular numbers, measurement grid with edge ruler ticks, and crosshair selection brackets make it feel like observing specimens through an instrument.
