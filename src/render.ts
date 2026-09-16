import { mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import pptxgen from 'pptxgenjs';

import {
  addAdvisorySlide,
  addDeprecationSlide,
  addMetricDetailSlide,
  addMetricSelectedSlide,
  addMetricsOverviewSlide,
  addProjectStatusSlide,
  addReleaseSlide,
  addRoadmapSlide,
  addSprintSummarySlide,
  addThemesSlide,
  addTitleSlide,
} from './archetypes/index.js';
import { createContextForProduct } from './catalog/products.js';
import { resolveIcon } from './catalog/icons.js';
import { composePresentation } from './composition/index.js';
import type { SlideInstruction } from './composition/index.js';
import {
  addApplicationHeader,
  addBulletGroup,
  addMetric,
  addPhase,
  addPrimaryIcon,
  addProductIdentity,
  addProgressBar,
  addStatusIndicator,
} from './components/index.js';
import { STATUS_VALUES } from './schema/common.js';
import { Colors } from './theme/colors.js';
import { createDefaultContext } from './theme/context.js';
import type { ProductTheme, RenderContext } from './theme/context.js';
import { Layout } from './theme/layout.js';
import { Spacing } from './theme/spacing.js';
import { Typography } from './theme/typography.js';
import { validatePresentation } from './validation/validate-presentation.js';

function renderInstruction(pptx: pptxgen, productId: string, instruction: SlideInstruction): void {
  const instructionProduct =
    'product' in instruction.data && instruction.data.product !== undefined
      ? instruction.data.product
      : productId;
  const ctx = createContextForProduct(instructionProduct);

  switch (instruction.archetype) {
    case 'title':
      addTitleSlide(pptx, ctx, instruction.data);
      break;
    case 'themes':
      addThemesSlide(pptx, ctx, instruction.data);
      break;
    case 'metrics-overview':
      addMetricsOverviewSlide(pptx, ctx, instruction.data);
      break;
    case 'metric-selected':
      addMetricSelectedSlide(pptx, ctx, instruction.data);
      break;
    case 'metric-detail':
      addMetricDetailSlide(pptx, ctx, instruction.data);
      break;
    case 'project-status':
      addProjectStatusSlide(pptx, ctx, instruction.data);
      break;
    case 'release':
      addReleaseSlide(pptx, ctx, instruction.data);
      break;
    case 'deprecation':
      addDeprecationSlide(pptx, ctx, instruction.data);
      break;
    case 'advisory':
      addAdvisorySlide(pptx, ctx, instruction.data);
      break;
    case 'roadmap':
      addRoadmapSlide(pptx, ctx, instruction.data);
      break;
    case 'sprint-summary':
      addSprintSummarySlide(pptx, ctx, instruction.data);
      break;
  }
}

/** Validate and compile a Presentation JSON value into a render-ready deck. */
export function buildPresentationDeck(input: unknown): pptxgen {
  const { presentation } = validatePresentation(input);
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Presentation Generation System';
  pptx.title = presentation.title;
  pptx.subject = presentation.sprint;

  for (const instruction of composePresentation(presentation)) {
    renderInstruction(pptx, presentation.product, instruction);
  }

  return pptx;
}

/**
 * Load, validate, compose, and render a Presentation JSON file.
 *
 * Validation and deck construction finish before the output path is touched.
 * The completed package is written beside the destination and atomically
 * renamed, preventing callers from observing a partial `.pptx`.
 */
export async function renderPresentationFile(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as unknown;
  const pptx = buildPresentationDeck(input);
  const outputDirectory = dirname(outputPath);
  const temporaryPath = `${outputPath}.tmp-${process.pid}.pptx`;

  await mkdir(outputDirectory, { recursive: true });
  try {
    await pptx.writeFile({ fileName: temporaryPath });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }

  return outputPath;
}

/**
 * Builds the hello-world smoke-test deck: a single slide proving that the
 * TypeScript + PptxGenJS wiring works end to end.
 *
 * All coordinates and style values are read from theme constants so that
 * changing a single constant (e.g. Layout.header.height) visibly moves the
 * corresponding element.
 */
export function buildHelloWorldDeck(): pptxgen {
  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Presentation Generation System';
  pptx.title = 'Hello World';
  pptx.subject = 'PptxGenJS toolchain smoke test';

  const slide = pptx.addSlide();
  slide.background = { color: Colors.backgroundDark };

  // Header bar — height driven by Layout.header.height.
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: Layout.slide.width,
    h: Layout.header.height,
    fill: { color: Colors.backgroundMid },
    line: { type: 'none' },
  });

  // Header label — position driven by Layout.header.titleX / titleY.
  slide.addText('Hello World', {
    x: Layout.header.titleX,
    y: Layout.header.titleY,
    w: Layout.slide.width - Layout.header.titleX - Spacing.slideMargin,
    h: Layout.header.height - Layout.header.titleY * 2,
    fontFace: Typography.fontFamily,
    fontSize: Typography.scale.h4,
    bold: true,
    color: Colors.textPrimary,
    valign: 'middle',
  });

  // Content region — top derived from Layout.header.height via Layout.content.top.
  const contentW = Layout.content.right - Layout.content.left;
  const contentH = Layout.content.bottom - Layout.content.top;
  const titleH = 1.2;
  const subtitleH = 0.6;
  const blockH = titleH + Spacing.md + subtitleH;
  const titleY = Layout.content.top + (contentH - blockH) / 2;

  slide.addText('Hello, World!', {
    x: Layout.content.left,
    y: titleY,
    w: contentW,
    h: titleH,
    align: 'center',
    fontFace: Typography.fontFamily,
    fontSize: Typography.scale.display,
    bold: true,
    color: Colors.textPrimary,
  });

  slide.addText('TypeScript + PptxGenJS toolchain is wired up.', {
    x: Layout.content.left,
    y: titleY + titleH + Spacing.md,
    w: contentW,
    h: subtitleH,
    align: 'center',
    fontFace: Typography.fontFamily,
    fontSize: Typography.scale.h4,
    color: Colors.textSecondary,
  });

  return pptx;
}

/**
 * Renders the hello-world deck and writes it to `outputPath` as a `.pptx`
 * file. Creates missing parent directories.
 *
 * @returns the file name written
 */
export async function renderHelloWorld(outputPath: string): Promise<string> {
  const pptx = buildHelloWorldDeck();
  await mkdir(dirname(outputPath), { recursive: true });
  return pptx.writeFile({ fileName: outputPath });
}

// ---------------------------------------------------------------------------
// Product theme smoke-test deck
// ---------------------------------------------------------------------------

/**
 * Adds one Advisory-archetype-style slide using a specific product theme,
 * demonstrating that the same archetype layout works with any product identity
 * by reading accent and assets exclusively from `ctx.productTheme` (VISION §9).
 *
 * No per-product rendering code: this single function is called for both
 * Atlas and Beacon (and would work for Nimbus and Orbit equally).
 */
function addProductDemoSlide(
  pptx: pptxgen,
  ctx: RenderContext,
  productTheme: ProductTheme,
  content: { title: string; action: string; bullets: readonly string[] },
): void {
  const { layout: L, typography: T, spacing: S, colors: C } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };

  // Header bar — accent color from the product theme (not hard-coded)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: L.slide.width,
    h: L.header.height,
    fill: { color: productTheme.accent },
    line: { type: 'none' },
  });

  // Archetype icon (advisory) top-left — same for every product
  const advisoryIcon = resolveIcon('advisory');
  slide.addImage({
    data: advisoryIcon.data,
    x: L.header.primaryIconX,
    y: L.header.primaryIconY,
    w: L.header.primaryIconSize,
    h: L.header.primaryIconSize,
  });

  // Slide title in header
  slide.addText(content.title, {
    x: L.header.titleX,
    y: L.header.titleY,
    w: L.slide.width - L.header.titleX - 2.8,
    h: L.header.height - L.header.titleY * 2,
    fontFace: T.fontFamily,
    fontSize: T.scale.h4,
    bold: true,
    color: C.textPrimary,
    valign: 'middle',
  });

  // Product logo — right zone of the header, before the status icon
  const logoW = 1.6;
  const logoH = 0.7;
  const logoX = L.header.stateRight - logoW - L.header.stateIconSize - S.md;
  const logoY = (L.header.height - logoH) / 2;
  slide.addImage({
    data: productTheme.logo.data,
    x: logoX,
    y: logoY,
    w: logoW,
    h: logoH,
  });

  // Status icon (healthy) far right
  const healthyIcon = resolveIcon('healthy');
  slide.addImage({
    data: healthyIcon.data,
    x: L.header.stateRight,
    y: L.header.stateIconY,
    w: L.header.stateIconSize,
    h: L.header.stateIconSize,
  });

  // Content divider
  slide.addShape(pptx.ShapeType.line, {
    x: L.content.left,
    y: L.content.top,
    w: L.content.right - L.content.left,
    h: 0,
    line: { color: productTheme.accent, width: 1.5 },
  });

  // Action text
  let y = L.content.top + S.lg;
  slide.addText(content.action, {
    x: L.content.left,
    y,
    w: L.content.right - L.content.left,
    h: 0.55,
    fontFace: T.fontFamily,
    fontSize: T.scale.h3,
    bold: true,
    color: C.textSecondary,
  });
  y += 0.55 + S.md;

  // Bullets
  for (const bullet of content.bullets) {
    slide.addText(`• ${bullet}`, {
      x: L.content.left + S.lg,
      y,
      w: L.content.right - L.content.left - S.lg,
      h: 0.4,
      fontFace: T.fontFamily,
      fontSize: T.scale.body,
      color: C.textSecondary,
    });
    y += 0.4 + S.sm;
  }

  // Product identity label at bottom right — accent-colored
  slide.addText(`PRODUCT: ${productTheme.id.toUpperCase()}`, {
    x: L.content.left,
    y: L.content.bottom - 0.35,
    w: L.content.right - L.content.left,
    h: 0.35,
    fontFace: T.fontFamily,
    fontSize: T.scale.label,
    bold: true,
    color: productTheme.accent,
    align: 'right',
  });
}

/**
 * Builds the product-theme smoke-test deck: two slides demonstrating that the
 * same Advisory-archetype layout composes correctly with different product
 * themes (Atlas and Beacon) — no per-product archetype code (VISION §9).
 *
 * Slide 1: Advisory + Atlas (indigo accent)
 * Slide 2: Advisory + Beacon (amber accent)
 */
export function buildProductThemeDeck(): pptxgen {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Presentation Generation System';
  pptx.title = 'Product Theme Demo';
  pptx.subject = 'Advisory archetype composed with Atlas and Beacon product themes (VISION §9)';

  const content = {
    title: 'Authentication Change',
    action: 'Action required before September 15',
    bullets: [
      'Existing tokens continue to function',
      'New integrations must use the updated authentication flow',
    ] as const,
  };

  for (const productId of ['atlas', 'beacon'] as const) {
    const ctx = createContextForProduct(productId);
    // productTheme is guaranteed non-null: createContextForProduct always sets it
    addProductDemoSlide(pptx, ctx, ctx.productTheme!, content);
  }

  return pptx;
}

/**
 * Renders the product-theme demo deck and writes it to `outputPath`.
 * Creates missing parent directories.
 *
 * @returns the file name written
 */
export async function renderProductThemeDemo(outputPath: string): Promise<string> {
  const pptx = buildProductThemeDeck();
  await mkdir(dirname(outputPath), { recursive: true });
  return pptx.writeFile({ fileName: outputPath });
}

// ---------------------------------------------------------------------------
// Component showcase deck (VISION §28)
// ---------------------------------------------------------------------------

/**
 * Builds the component showcase deck: each core layout component rendered in
 * isolation on its own test slide (definition of done for the components
 * milestone).
 *
 * Slide 1 — `addApplicationHeader` alone (project icon + title/location left,
 *           Atlas product identity + healthy status right, VISION §10).
 * Slide 2 — `addPrimaryIcon` alone (release icon in the header slot).
 * Slide 3 — `addProductIdentity` alone (Beacon logo + icon variants).
 * Slide 4 — `addStatusIndicator` alone (all five status icons in a row).
 * Slide 5 — `addBulletGroup` alone (three supporting bullets, VISION §17).
 * Slide 6 — `addMetric` alone (cards with and without trend / state,
 *           VISION §15).
 * Slide 7 — `addProgressBar` alone (one selected bar, three muted bars,
 *           VISION §16).
 * Slide 8 — `addPhase` / `addEpic` alone (a two-phase project hierarchy,
 *           VISION §18).
 */
export function buildComponentShowcaseDeck(): pptxgen {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Presentation Generation System';
  pptx.title = 'Component Showcase';
  pptx.subject = 'Core layout components rendered in isolation (VISION §10, §28)';

  // Slide 1 — application header in isolation.
  {
    const ctx = createContextForProduct('atlas');
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    addApplicationHeader(pptx, slide, ctx, {
      icon: 'project',
      title: 'Workspace Assistant Rollout',
      location: 'Platform Engineering',
      status: 'healthy',
    });
  }

  // Slide 2 — primary icon in isolation.
  {
    const ctx = createDefaultContext();
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    addPrimaryIcon(slide, ctx, 'release');
  }

  // Slide 3 — product identity in isolation (logo and icon variants).
  {
    const ctx = createContextForProduct('beacon');
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    addProductIdentity(slide, ctx);
    addProductIdentity(slide, ctx, { variant: 'icon' });
  }

  // Slide 4 — status indicators in isolation, one per semantic state.
  {
    const ctx = createDefaultContext();
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    const { layout: L, spacing: S } = ctx;
    const size = L.header.stateIconSize;
    STATUS_VALUES.forEach((status, index) => {
      addStatusIndicator(slide, ctx, status, {
        x: L.content.left + index * (size + S.md),
        y: L.content.top + S.md,
        size,
      });
    });
  }

  // Slide 5 — bullet group in isolation (VISION §17).
  {
    const ctx = createDefaultContext();
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    const { layout: L, spacing: S } = ctx;
    addBulletGroup(
      slide,
      ctx,
      [
        'Pilot group expanded',
        'Weekly active usage continues to increase',
        'Adoption NPS trending up',
      ],
      {
        x: L.content.left,
        y: L.content.top + S.md,
        width: L.content.right - L.content.left,
      },
    );
  }

  // Slide 6 — metric cards in isolation: one with trend + state, one without
  // (VISION §15).
  {
    const ctx = createDefaultContext();
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    const { layout: L, spacing: S } = ctx;
    const cardW = (L.content.right - L.content.left - S.md) / 2;
    const y = L.content.top + S.md;
    addMetric(
      slide,
      ctx,
      { metric: 'adoption', value: 64, trend: 'up', status: 'attention' },
      { x: L.content.left, y, width: cardW },
    );
    addMetric(
      slide,
      ctx,
      { metric: 'throughput', value: 38 },
      { x: L.content.left + cardW + S.md, y, width: cardW },
    );
  }

  // Slide 7 — progress bars in isolation: one selected bar (Atlas accent) and
  // three muted bars, mirroring the metric-selected archetype (VISION §16).
  {
    const ctx = createContextForProduct('atlas');
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    const { layout: L, spacing: S } = ctx;
    const barW = L.content.right - L.content.left - S.xl;
    const barStep = 0.55;
    const bars: Array<{ value: number; emphasis: 'selected' | 'muted' }> = [
      { value: 92, emphasis: 'muted' },
      { value: 87, emphasis: 'muted' },
      { value: 64, emphasis: 'selected' },
      { value: 96, emphasis: 'muted' },
    ];
    bars.forEach((bar, index) => {
      addProgressBar(
        pptx,
        slide,
        ctx,
        { x: L.content.left, y: L.content.top + S.md + index * barStep, width: barW },
        bar,
      );
    });
  }

  // Slide 8 — phase/epic hierarchy in isolation (VISION §18).
  {
    const ctx = createDefaultContext();
    const slide = pptx.addSlide();
    slide.background = { color: ctx.colors.backgroundDark };
    const { layout: L, spacing: S } = ctx;
    const width = L.content.right - L.content.left;
    let y = L.content.top + S.md;
    y += addPhase(
      slide,
      ctx,
      {
        title: 'Pilot Expansion',
        icon: 'phase',
        epics: [{ title: 'Expand pilot population' }, { title: 'Establish usage telemetry' }],
      },
      { x: L.content.left, y, width },
    );
    y += S.lg;
    addPhase(
      slide,
      ctx,
      {
        title: 'Production Readiness',
        icon: 'phase',
        epics: [{ title: 'Finalize support model' }, { title: 'Publish user guidance' }],
      },
      { x: L.content.left, y, width },
    );
  }

  return pptx;
}

/**
 * Renders the component showcase deck and writes it to `outputPath`.
 * Creates missing parent directories.
 *
 * @returns the file name written
 */
export async function renderComponentShowcase(outputPath: string): Promise<string> {
  const pptx = buildComponentShowcaseDeck();
  await mkdir(dirname(outputPath), { recursive: true });
  return pptx.writeFile({ fileName: outputPath });
}

// ---------------------------------------------------------------------------
// Project-status archetype demo deck (VISION §18)
// ---------------------------------------------------------------------------

/**
 * Builds the project-status archetype demo deck: the VISION §18 example
 * initiatives rendered through `addProjectStatusSlide` — one slide per
 * initiative (VISION §19).
 *
 * Slide 1 — "Workspace Assistant Rollout" from samples/full-sprint.json
 *           (Atlas product theme, matching the sample's presentation product).
 * Slide 2 — "Mobile App Refresh" from samples/projects-only.json (Beacon
 *           product theme), demonstrating the same archetype with a different
 *           product identity and an at-risk status (VISION §9).
 */
export function buildProjectStatusDeck(): pptxgen {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Presentation Generation System';
  pptx.title = 'Project Status Demo';
  pptx.subject =
    'Project-status archetype rendering the VISION §18 example initiatives (VISION §18, §19)';

  // Slide 1 — the VISION §18 example initiative (samples/full-sprint.json).
  addProjectStatusSlide(pptx, createContextForProduct('atlas'), {
    id: 'workspace-assistant',
    title: 'Workspace Assistant Rollout',
    icon: 'project',
    status: 'on-track',
    phases: [
      {
        title: 'Pilot Expansion',
        icon: 'phase',
        epics: [{ title: 'Expand pilot population' }, { title: 'Establish usage telemetry' }],
      },
      {
        title: 'Production Readiness',
        icon: 'phase',
        epics: [{ title: 'Finalize support model' }, { title: 'Publish user guidance' }],
      },
    ],
  });

  // Slide 2 — an at-risk initiative (samples/projects-only.json).
  addProjectStatusSlide(pptx, createContextForProduct('beacon'), {
    id: 'mobile-refresh',
    title: 'Mobile App Refresh',
    icon: 'release',
    status: 'at-risk',
    phases: [
      {
        title: 'Design',
        icon: 'phase',
        epics: [{ title: 'Complete UX review' }, { title: 'Finalise design system tokens' }],
      },
    ],
  });

  return pptx;
}

/**
 * Renders the project-status archetype demo deck and writes it to `outputPath`.
 * Creates missing parent directories.
 *
 * @returns the file name written
 */
export async function renderProjectStatusDemo(outputPath: string): Promise<string> {
  const pptx = buildProjectStatusDeck();
  await mkdir(dirname(outputPath), { recursive: true });
  return pptx.writeFile({ fileName: outputPath });
}
