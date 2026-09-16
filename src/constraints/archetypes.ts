/**
 * Per-archetype content constraints (VISION §30).
 *
 * This is the single source of truth for slide layout limits. Archetype
 * renderers and the composition layer must read from here instead of
 * embedding literal numbers. Changing a value here automatically propagates
 * to both validation and rendering.
 *
 * Values are tunable as slide designs solidify; the rationale comments
 * explain the current choices so reviewers can judge whether a proposed
 * change is reasonable.
 */

/**
 * Limits for the Themes archetype (VISION §13, §30).
 */
export const THEMES_CONSTRAINTS = {
  /**
   * A themes slide fills a two-or-three-column layout (VISION §13).
   * Fewer than two columns looks unbalanced; more than three columns cannot
   * fit at readable icon + heading + bullet size on a 13.333 × 7.5 slide.
   */
  count: { min: 2, max: 3 },

  /**
   * Three bullets sit comfortably below the icon and heading without crowding
   * the column. A fourth bullet approaches paragraph density, which contradicts
   * the "slides are visual anchors" principle (VISION §2.1).
   */
  bulletsPerTheme: { max: 3 },

  /**
   * Theme headings render at h2/h3 scale. Beyond 40 characters a heading
   * wraps onto a second line and disrupts column alignment across the slide.
   */
  headingLength: { max: 40 },

  /**
   * Bullets render at body scale (~16 pt) across a column roughly 4 inches
   * wide. 100 characters is approximately two wrapped lines; longer bullets
   * read as paragraphs rather than visual anchors.
   */
  bulletLength: { max: 100 },
} as const;

/**
 * Limits for the Metric Detail archetype (VISION §17, §30).
 *
 * Note: the composition layer generates one Metric Detail slide per metric
 * entry, so each archetype instance always receives exactly one metric. That
 * 1:1 relationship is enforced by composition, not by input validation.
 */
export const METRIC_DETAIL_CONSTRAINTS = {
  /**
   * Supporting bullets sit below the large metric value. Three bullets is
   * enough supporting context for a 2–5 second slide; more would require the
   * audience to read rather than absorb.
   */
  bullets: { max: 3 },
} as const;

/**
 * Limits for the Project Status archetype (VISION §18, §30).
 */
export const PROJECT_STATUS_CONSTRAINTS = {
  /**
   * Four phases fit vertically at readable phase-heading + epic-bullet size
   * without reducing font size below the minimum. If an initiative has more
   * than four phases the composition layer should split it across continuation
   * slides ("Phase (continued)") rather than shrinking content (VISION §31).
   */
  phases: { max: 4 },

  /**
   * Five epics per phase keeps bullet density at a level a viewer can absorb
   * during a 2–5 second slide transition. More epics should be split or
   * summarised at the epic level, not crammed onto the slide.
   */
  epicsPerPhase: { max: 5 },

  /**
   * Epic titles render at body/small scale (~14–16 pt). 90 characters is
   * approximately one line at the content column width; wrapping disrupts the
   * visual rhythm of the phase-epic hierarchy.
   */
  epicTitleLength: { max: 90 },
} as const;

/**
 * Limits applied uniformly to Release, Deprecation, and Advisory notice
 * archetypes (VISION §20–§22).
 *
 * Each notice item receives its own slide (enforced by composition), so these
 * constraints are per-item limits.
 */
export const NOTICE_CONSTRAINTS = {
  /**
   * Supporting bullets per notice item. Three bullets fit comfortably below
   * the status or action line at readable body size.
   */
  bullets: { max: 3 },

  /**
   * The notice title renders in the application-like header at h3/h4 scale.
   * Beyond 80 characters the title risks overflowing into the state icon zone
   * on the right side of the header (VISION §10).
   */
  titleLength: { max: 80 },
} as const;

/**
 * Limits for the Roadmap archetype (VISION §23).
 */
export const ROADMAP_CONSTRAINTS = {
  /**
   * Six items fill the roadmap slide at readable size across the three
   * horizon groups (now / next / later). More items should be summarised
   * rather than listed individually — the roadmap is not a Gantt chart.
   */
  items: { max: 6 },

  /**
   * Roadmap item titles render at body scale in a single-line layout.
   * 80 characters is approximately one line at the content column width.
   */
  itemTitleLength: { max: 80 },
} as const;

/** Limits for the closing Sprint Summary archetype (VISION §24, §30). */
export const SPRINT_SUMMARY_CONSTRAINTS = {
  /** Summary statements must remain single, quickly scannable lines. */
  itemTextLength: { max: 100 },
} as const;
