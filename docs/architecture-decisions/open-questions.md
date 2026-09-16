# Open Questions

Living list of open questions and explicit deferrals. Deferred items name the
milestone or issue that will resolve them; reopen an item here if that
milestone lands without answering it.

## 1. Final vs mock assets

- Status: **open** — initial delivery uses mock assets only (VISION §32).

All iconography, logos, and accents ship as committed mock SVGs; the asset
tree (`assets/`) is structured so final artwork can replace mocks without
code changes (ADR-0003). Unresolved: when final assets arrive, and whether
they are delivered as a drop-in tree replacement or a new catalog version.

## 2. Distribution integration

- Status: **open** — treated as out of scope (VISION §4).

VISION §4 shows a document store and downstream distribution after the
generated `.pptx`. No upload/publish feature is planned for this system. Unresolved:
confirm that no distribution feature is expected of this repo, or file a
separate system/milestone for it.

## 3. Overflow handling: fail-loud vs slide-splitting

- Status: **resolved** — adopted by the composition milestone.

Input beyond the explicit content constraints still fails loudly through
`validatePresentation`. Valid project content that exceeds the fixed slide
height is greedily split at phase boundaries by the composition engine, with
later project titles suffixed by ` (continued)`. The split uses the same fixed
layout, spacing, and typography values as the project renderer, so it remains
deterministic.

## 4. PNG fallback for pre-2016 PowerPoint clients

- Status: **deferred** — resolved by the asset-handoff milestone (or earlier
  if pre-2016 clients are confirmed).

PptxGenJS cannot rasterize SVG under Node (gitbrent/PptxGenJS#401), so the
fallback media part is a placeholder while the SVG renders crisply in
PowerPoint 2016+ (ADR-0003). If pre-2016 clients matter, add a PNG build
pipeline and have the catalog carry both formats.

## 5. Runtime icon recolor/tint

- Status: **deferred** — resolved by the asset-handoff milestone.

Mock artwork ships in its final colors; a runtime recolor/tint strategy for
icons is not implemented (ADR-0003). Revisit if themes must recolor shared
icon artwork.

## 6. Automated rasterized snapshot review

- Status: **deferred** — resolved by a later visual-review milestone.

Human review via LibreOffice headless rasterization is documented (ADR-0005);
automated golden-image diffing needs a pinned LibreOffice in the development
environment and CI runner, plus acceptance that LO rendering is only a proxy for
PowerPoint.

## 7. Generated timestamp on the sprint overview slide

- Status: **open** — resolved by the sprint-overview archetype milestone.

VISION §12 lists an "optional generated timestamp" as typical content. If
included, the value must come from the presentation JSON, never the renderer
clock (ADR-0006). Unresolved: whether the sprint overview carries a date at
all, and whether it is a presentation date or a generation timestamp.
