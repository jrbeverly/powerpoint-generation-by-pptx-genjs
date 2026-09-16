# 0005: Visual Validation of Generated .pptx Files

- Status: accepted
- Date: 2026-08-23

## Context

VISION §36 defines success in visual terms — the deck opens correctly, has no
overflowing text, no overlapping elements, consistent typography, and "looks
intentionally designed". Structural assertions on the OPC package (part
names, XML fragments) can prove the package is well-formed and contains the
expected icons and slides, but they cannot judge layout quality. The tracker
asks how slides should be rasterized for snapshot review. Candidates:

- **LibreOffice headless conversion** (`soffice --headless --convert-to png`)
  — free, runs on Linux CI runners, produces per-slide PNGs for human or
  golden-image review. Rendering differs from PowerPoint (font metrics and
  fallbacks), so it is a proxy, not a pixel oracle. It is not currently
  installed in the development environment or CI runner.
- **PowerPoint COM automation** — pixel-faithful, but Windows-only and
  unusable in a Linux development or CI environment.
- **Structural assertions only** — deterministic and tool-free, but blind to
  the visual criteria of VISION §36.

## Decision

Two-tier validation, with the automated tier gated in CI today and the visual
tier performed by humans with a documented rasterization command.

1. **Automated (CI, always on): structural assertions.** Tests assert the
   `.pptx` is a valid ZIP/OPC package, contains the core PowerPoint parts and
   exactly the expected slides, and embeds the catalog SVG media with correct
   `asvg:svgBlip` references (`test/render.test.ts`, `test/icons.test.ts`).
   No extra tooling is required, so `make validate` stays dependency-free.
2. **Human review (generated and compared in CI): LibreOffice rasterization.**
   Generated decks are converted through PDF to per-slide PNGs with
   `scripts/visual-snapshots.sh` for visual sign-off
   against the VISION §36 checklist. Snapshot comparison is a CI gate, while
   LibreOffice output remains a review proxy and must not be mistaken for
   PowerPoint ground truth.

## Consequences

- The all-archetype full-sprint deck has committed PNG baselines. `make visual`
  compares them with a 3.5% normalized-RMSE tolerance for cross-runner font and
  LibreOffice variation, and writes actual/diff images to `dist/visual-snapshots`;
  CI uploads that directory even when comparison fails. Pinned environments can
  tighten `VISUAL_RMSE_THRESHOLD`. Intentional changes are accepted with
  `make visual-update` after review.
- Visual tooling is installed explicitly by CI and remains optional in the
  development container. LibreOffice is a review proxy, not PowerPoint ground truth.
