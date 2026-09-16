import type pptxgen from 'pptxgenjs';

import type { RenderContext } from '../theme/context.js';

/**
 * Shared slide-archetype contract (VISION §6, §27, §28).
 *
 * An archetype is a deterministic renderer that expands one semantic content
 * object into the slide(s) that present it (VISION §26): it adds its own
 * slide(s) to the deck, reads every coordinate and style from the
 * `RenderContext` theme constants (VISION §29), and fails loudly rather than
 * shrinking or overflowing when content exceeds its limits (VISION §30, §31).
 *
 * The composition layer calls an archetype once per content item — e.g. one
 * project-status slide per initiative (VISION §19) — so the archetype owns
 * slide creation, not just slide decoration.
 */
export interface ArchetypeRenderer<Content> {
  (pptx: pptxgen, ctx: RenderContext, content: Content): void;
}
