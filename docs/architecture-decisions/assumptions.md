# Assumptions

Living list of the assumptions the system is built on. Review before the
composition and archetype-renderer milestones; if one no longer holds, update
this file and the ADRs that depend on it in the same change.

1. **Presentation JSON is machine-generated and conforms to a known, versioned
   schema** (VISION §1, §3, §5). Hand-authored JSON is tolerated but not the
   design target. Enforced at parse time by zod (ADR-0002); the renderer never
   trusts input blindly.
2. **Slides are 16:9, 13.333 × 7.5 inches** (VISION §29), centralized in
   `Layout.slide` (`src/theme/layout.ts`) with `LAYOUT_WIDE` set on every
   deck. All coordinates and sizes derive from layout/theme constants — no
   magic numbers in archetype code.
3. **No AI-driven visual decisions after the JSON is produced** (VISION §3).
   Coordinates, fonts, sizes, spacing, colors, and composition belong
   exclusively to the renderer; the JSON carries semantic content only.
4. **Overflow is an input-validation problem, not a typography problem**
   (VISION §30, §31). Content that exceeds an archetype's limits fails loudly
   before rendering; the renderer never shrinks fonts to fit.
5. **PowerPoint 2016+ is the rendering target for SVG icons** (ADR-0003). The
   PNG fallback part for older clients is a placeholder until a PNG pipeline
   is justified.
6. **Distribution is out of scope** (VISION §4). Publishing to a document
   store sits downstream of the generated `.pptx` and is a separate system's
   concern.
7. **The runtime is Node ≥ 20.19 with npm** as package manager (ADR-0001),
   locally and on CI runners.
8. **The renderer is self-contained at render time** (ADR-0003): all assets
   are compiled into the bundle, and no filesystem reads or network calls
   happen while rendering.
