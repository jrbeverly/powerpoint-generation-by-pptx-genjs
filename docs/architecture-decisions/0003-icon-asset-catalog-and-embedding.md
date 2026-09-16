# 0003: Icon Asset Catalog and Embedding Strategy — SVG-first base64 data URIs

- Status: accepted
- Date: 2026-08-22

## Context

Icons are a primary information channel (VISION §7), and the same semantic id
must resolve to the same asset everywhere so slides remain recognizable during
rapid transitions (VISION §40). VISION §8 requires a controlled asset library —
the renderer never discovers or generates imagery dynamically — and prefers SVG
so icons stay crisp at arbitrary PowerPoint sizes, with base64 embedding
allowed "when useful for packaging or deployment".

Two questions had to be settled before archetypes could consume icons: how the
catalog delivers the SVG bytes to the renderer, and how those bytes reach the
`.pptx`.

## Decision

**SVG-first, embedded as base64 data URIs at build time.**

- `assets/` (`archetypes/`, `metrics/`, `status/`, `products/`, `common/`) is
  the controlled, committed source of truth for mock assets (VISION §8, §32).
  All mock assets are hand-authored SVGs; icon artwork carries its final
  colors (semantic status colors, product accents).
- `scripts/generate-assets.mjs` reads that fixed tree and emits
  `src/catalog/assets.generated.ts`, mapping each `<category>/<name>` to an
  `image/svg+xml;base64,` data URI. The generator is deterministic — the same
  tree always produces byte-identical output (no timestamps, sorted keys) —
  and runs as part of `npm run build`, so the compiled catalog cannot drift
  from the tree.
- `src/catalog/icons.ts` is a static, hand-written mapping of semantic icon
  ids to asset keys (VISION §39). Metric and status ids are derived from the
  schema vocabularies (`METRIC_IDS`, `STATUS_VALUES`), so the schema and the
  catalog cannot drift. `resolveIcon(id)` returns the render-ready data URI;
  an unknown id throws with a descriptive error — never a silent placeholder
  (VISION §31).
- Renderers pass the data URI to PptxGenJS `addImage({ data })`. PptxGenJS
  stores the SVG as a media part referenced through the PowerPoint 2016+
  `asvg:svgBlip` extension element, plus a PNG fallback part for older
  clients.

## Consequences

- The compiled `dist/` is self-contained: no filesystem reads or asset
  copying at render time, in tests, or at deployment.
- The PNG fallback used by PowerPoint < 2016 is a placeholder: PptxGenJS
  cannot rasterize SVG under Node (gitbrent/PptxGenJS#401), so the fallback
  part is a broken image while the SVG itself renders crisply in PowerPoint
  2016+. Accepted for the mock milestone; if pre-2016 clients matter, a later
  milestone should add a PNG build pipeline and have the catalog carry both
  formats.
- A runtime recolor/tint strategy for icons is deferred; mock artwork ships
  in its final colors.
- `test/icons.test.ts` pins the contract: the id vocabulary is closed over the
  vision's asset tree, the catalog embeds the committed assets byte-for-byte,
  unknown ids fail loudly, and a slide smoke test asserts the generated
  `.pptx` contains the SVG media parts and blip references.
