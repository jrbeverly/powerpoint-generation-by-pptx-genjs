# 0006: Determinism Guarantees — Structural Equality of the OPC Package

- Status: accepted
- Date: 2026-08-23

## Context

Determinism is a core feature, not an implementation detail: "the same
semantic input always produces the same visual result" (VISION §1), no
AI-driven visual decisions happen after the JSON is produced (VISION §3), and
VISION §36.14 requires the deck to "be reproducible from the same input". The
tracker asks how that guarantee is asserted, given that PptxGenJS may embed
timestamps or random ids. Verified against the vendored PptxGenJS 4.0.1 and
JSZip sources:

- `docProps/core.xml` always carries wall-clock timestamps: PptxGenJS writes
  `dcterms:created` and `dcterms:modified` from `new Date().toISOString()`.
- JSZip defaults every zip entry's header date to `new Date()`, so even the
  container bytes differ between runs.
- PptxGenJS uses `Math.random()`-derived ids (`getUuid`) only for charts and
  PowerPoint sections (`p14:section`). The system's archetypes use neither —
  charting is a VISION §35 non-goal — so no random ids appear in our output
  today.

Whole-file byte equality is therefore unattainable without patching the
libraries, and pointless: it would fail on metadata no reviewer reads.

## Decision

**"Same input → same output" is defined as structural equality of the OPC
package** — the same set of part names with byte-identical part contents —
after normalizing exactly two values: the `dcterms:created` and
`dcterms:modified` timestamps in `docProps/core.xml`. Whole-zip byte equality
is explicitly a non-goal.

To make that guarantee hold:

- Render, composition, and catalog code must never call `Math.random()` or
  `new Date()`, and must not iterate maps/sets in insertion-dependent order.
  Any future clock or randomness must be injected from the input document
  (e.g. a `now` field) so the render path stays pure.
- The assertion lives with the deck tests: render the same presentation
  document twice and diff the unzipped parts, expecting zero differences
  outside the two normalized core-properties timestamps. The smoke tests
  (`test/render.test.ts`) already pin part presence; the full structural
  comparison lands with the composition milestone, when real decks exist.
- The asset codegen path is already byte-deterministic end to end
  (ADR-0003): the same asset tree emits a byte-identical generated catalog.

## Consequences

- Determinism failures surface as test diffs, not visual drift; future
  golden-file tests for decks become feasible because only one part needs
  normalization.
- Any later feature using charts or PowerPoint sections must revisit this
  decision: those PptxGenJS paths emit random ids and would need pinning or
  normalization of their own.
- The optional sprint-overview timestamp (VISION §12) must come from the
  presentation JSON, never from the renderer clock (see open-questions).
