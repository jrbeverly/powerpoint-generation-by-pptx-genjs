# Vision: Programmatic Sprint Overview Presentation System

## 1. Vision

Build a deterministic, programmatically generated PowerPoint presentation system for producing short, highly visual sprint and product-status presentations from structured JSON data.

The system will generate complete `.pptx` presentations using **TypeScript and PptxGenJS**. Presentation content will always originate from structured, machine-generated JSON conforming to a known schema. Presentation structure, visual conventions, iconography, layout, branding, and archetypes will be deterministic.

The system is explicitly **not** intended to perform generative slide design.

It is a rendering system:

**Structured JSON → presentation model → deterministic archetype renderers → PowerPoint**

The objective is to make presentation generation predictable enough that the same semantic input always produces the same visual result.

Slides should feel deliberately designed rather than automatically assembled, while requiring no manual PowerPoint editing.

---

## 2. Core Philosophy

### 2.1 Slides Are Disposable Visual Moments

These presentations are designed primarily to accompany spoken narration.

A typical slide may remain visible for only **2–5 seconds**.

The presentation therefore does not attempt to place the complete narrative on the slide. Slides exist to provide:

* visual orientation;
* context;
* emphasis;
* progression;
* recognizable iconography;
* state;
* hierarchy;
* a visual anchor for narration.

The spoken presentation carries the detailed narrative.

The slide carries the **visual idea**.

This means the system should favor:

* large typography;
* strong hierarchy;
* icons;
* short labels;
* limited bullets;
* deliberate whitespace;
* progressive highlighting;
* repetition;
* visual continuity.

It should avoid:

* paragraphs;
* dense tables;
* tiny text;
* attempting to fit excessive information;
* arbitrary auto-layout;
* complicated visualizations;
* slide-specific design improvisation.

A presentation containing 30 simple slides is preferable to one containing 10 overloaded slides.

---

# 3. Determinism Is a Feature

The renderer should be intentionally boring.

Once the JSON presentation model has been generated, there should be no AI-driven visual decision making.

AI or other upstream systems may determine:

* which initiatives are relevant;
* summaries;
* status language;
* bullet content;
* which known metrics should appear;
* which projects belong in the presentation;
* which advisories, releases, or deprecations are relevant.

They should **not** determine:

* coordinates;
* fonts;
* font sizes;
* icon sizes;
* spacing;
* colors;
* slide composition;
* arbitrary imagery;
* placement of content;
* how a particular archetype should look.

Those decisions belong to the renderer.

---

# 4. Technology Direction

The preferred implementation is:

* **TypeScript**
* **PptxGenJS**
* JSON Schema or an equivalent TypeScript validation system
* SVG/PNG asset library
* deterministic archetype renderers

Conceptually:

```text
Data Sources
     │
     ▼
Upstream Generation / Business Logic
     │
     ▼
Presentation JSON
     │
     ▼
Schema Validation
     │
     ▼
Presentation Normalization
     │
     ▼
Archetype Renderers
     │
     ▼
PptxGenJS
     │
     ▼
Generated .pptx
     │
     ▼
Document Store
     │
     ▼
Downstream Distribution
```

PptxGenJS should be treated as the low-level rendering engine rather than as the presentation architecture itself.

---

# 5. Presentation JSON

Every presentation is generated from JSON.

The JSON represents **semantic presentation content**, not drawing instructions.

For example:

```json
{
  "presentation": {
    "title": "Sprint 42 Overview",
    "subtitle": "Platform Engineering",
    "sprint": "Sprint 42",
    "product": "product-alpha",
    "themes": [],
    "metrics": [],
    "projects": [],
    "releases": [],
    "deprecations": [],
    "advisories": [],
    "roadmap": []
  }
}
```

The exact schema will evolve, but it should remain strongly typed and versioned.

The JSON should describe:

> what the presentation says

rather than:

> how PowerPoint should draw it.

For example, this is appropriate:

```json
{
  "metric": "delivery-confidence",
  "value": "92%",
  "trend": "up",
  "status": "healthy"
}
```

This is inappropriate:

```json
{
  "iconX": 0.45,
  "iconY": 0.30,
  "fontSize": 24,
  "progressBarWidth": 5.7
}
```

Those visual decisions belong exclusively to the renderer.

---

# 6. Archetypes

Slides should be implemented as a deliberately small library of archetypes.

An archetype defines:

* layout;
* visual hierarchy;
* allowable content;
* icon positions;
* typography;
* branding behavior;
* overflow constraints;
* state indicators;
* transitions to related archetypes.

An archetype might expose an interface conceptually similar to:

```typescript
interface SlideArchetype<T> {
  validate(data: T): ValidationResult;
  render(
    presentation: pptxgen,
    data: T,
    context: RenderContext
  ): void;
}
```

The important principle is that rendering remains deterministic.

---

# 7. Visual Language

## 7.1 Iconography Is a Primary Information Channel

Icons are not decorative accessories.

They are one of the most important components of the presentation language.

The presentation should develop a recognizable visual vocabulary where recurring concepts have stable icons.

Examples include:

* project / initiative;
* advisory;
* deprecation;
* release;
* roadmap;
* metric types;
* status;
* risk;
* milestone;
* phase;
* epic;
* product;
* sprint;
* completed work;
* upcoming work.

Users should gradually be able to recognize the category of information from the icon before reading the text.

This consistency is intentional.

---

# 8. Asset Library

All major icons are known in advance.

The renderer should therefore maintain a controlled asset library rather than discovering or generating imagery dynamically.

Example:

```text
assets/
├── archetypes/
│   ├── advisory.svg
│   ├── deprecation.svg
│   ├── release.svg
│   ├── roadmap.svg
│   ├── project.svg
│   ├── sprint.svg
│   └── summary.svg
│
├── metrics/
│   ├── delivery-confidence.svg
│   ├── throughput.svg
│   ├── reliability.svg
│   ├── quality.svg
│   ├── adoption.svg
│   └── velocity.svg
│
├── status/
│   ├── healthy.svg
│   ├── attention.svg
│   ├── blocked.svg
│   ├── complete.svg
│   └── upcoming.svg
│
├── products/
│   ├── product-alpha.svg
│   ├── product-beta.svg
│   ├── product-gamma.svg
│   └── mock-product.svg
│
└── common/
    ├── epic.svg
    ├── milestone.svg
    ├── phase.svg
    └── arrow.svg
```

SVG should be preferred where practical so that icons remain crisp at arbitrary PowerPoint sizes.

Base64-encoded assets may also be supported when useful for packaging or deployment.

---

# 9. Product-Specific Visual Identity

Product identity is separate from slide archetype.

A presentation may concern one of several internally developed products.

Each known product may provide:

* product icon;
* product logo;
* accent treatment;
* optional background treatment;
* optional secondary visual treatment.

For initial development, mock product assets should be supplied so the system can demonstrate this behavior without relying on production branding.

For example:

```typescript
interface ProductTheme {
  id: string;
  logo: Asset;
  icon: Asset;
  accent: string;
  secondaryAccent?: string;
  backgroundTreatment?: BackgroundTreatment;
}
```

This prevents product and archetype from becoming coupled.

There should not be separate implementations such as:

```text
ProductAlphaAdvisorySlide
ProductBetaAdvisorySlide
ProductAlphaProjectSlide
ProductBetaProjectSlide
```

Instead:

```text
Advisory Archetype + Product Theme
Project Archetype  + Product Theme
```

---

# 10. Application-Like Header

A recurring visual motif throughout the presentation is an application-like title bar.

The top of a slide should often resemble the header of a software interface.

Conceptually:

```text
┌──────────────────────────────────────────────────────────────┐
│ [PRIMARY ICON]  TITLE / LOCATION              [STATE ICONS] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                      SLIDE CONTENT                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The **top-left** communicates:

> Where am I?

It generally contains:

* a primary icon;
* category or initiative;
* title.

The **top-right** communicates:

> What should I know about its state?

It may contain:

* product identity;
* status;
* risk;
* lifecycle state;
* another relevant contextual icon.

This convention should recur sufficiently often that viewers learn how to read it instinctively.

---

# 11. Presentation Narrative

A typical generated presentation follows a predictable narrative.

```text
SPRINT OVERVIEW
      ↓
THEMES
      ↓
METRICS OVERVIEW
      ↓
METRIC 1 SELECTED
      ↓
METRIC 1 DETAIL
      ↓
METRIC 2 SELECTED
      ↓
METRIC 2 DETAIL
      ↓
...
      ↓
PROJECT STATUS
      ↓
PROJECT STATUS
      ↓
PROJECT STATUS
      ↓
RELEASES
      ↓
DEPRECATIONS
      ↓
ADVISORIES
      ↓
ROADMAP
      ↓
SPRINT SUMMARY
```

Sections may be omitted when there is no relevant data.

---

# 12. Archetype: Sprint Overview

The first slide establishes the presentation.

Its purpose is orientation rather than information density.

Typical content:

* sprint name;
* team/product context;
* date or sprint range;
* optional generated timestamp;
* primary sprint/product iconography.

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                 [SPRINT / PRODUCT ICON]                      │
│                                                              │
│                 SPRINT 42 OVERVIEW                           │
│                                                              │
│                 Platform Engineering                         │
│                 August 10–21                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

This slide should be extremely simple.

---

# 13. Archetype: Themes

The themes slide communicates the **two or three things that characterize the sprint**.

Normally there will be approximately three themes.

Each theme consists of:

* large icon;
* prominent heading;
* at most 2–3 short bullets.

Conceptually:

```text
SPRINT THEMES

[ICON]                     [ICON]                     [ICON]

FOUNDATION                  ADOPTION                   RELIABILITY

• Complete migration       • Begin rollout            • Reduce failures
• Remove legacy path       • Validate adoption        • Improve telemetry
```

Themes should read almost instantaneously.

They are not project descriptions.

They provide a high-level mental model for the sprint.

---

# 14. Metrics Model

Metrics come from a **known metric catalog**.

The exact metrics shown in a presentation are flexible.

For example, the organization might maintain:

```text
delivery-confidence
throughput
quality
reliability
adoption
velocity
operational-health
customer-impact
```

Each metric has predefined metadata:

```typescript
interface MetricDefinition {
  id: string;
  label: string;
  shortLabel: string;
  icon: Asset;
  description: string;
  formatting: MetricFormatting;
}
```

The JSON selects relevant metrics and supplies their values.

It does not supply arbitrary icons.

For example:

```json
{
  "metrics": [
    {
      "metric": "delivery-confidence",
      "value": 92,
      "status": "healthy"
    },
    {
      "metric": "quality",
      "value": 87,
      "status": "healthy"
    },
    {
      "metric": "adoption",
      "value": 64,
      "status": "attention"
    },
    {
      "metric": "operational-health",
      "value": 96,
      "status": "healthy"
    }
  ]
}
```

---

# 15. Archetype: Metrics Overview

A typical metrics overview contains approximately four selected metrics.

The layout contains:

* a narrow explanatory/context column;
* a larger metric visualization region;
* metric icons;
* metric labels;
* metric values;
* optional lightweight state indicators.

Conceptually:

```text
┌─────────────────────┬────────────────────────────────────────┐
│                     │                                        │
│ SPRINT HEALTH       │  [ICON] 92%     [ICON] 87%            │
│                     │  Delivery       Quality                │
│ A quick view of     │                                        │
│ current delivery    │  [ICON] 64%     [ICON] 96%            │
│ and operational     │  Adoption       Operational Health     │
│ health.             │                                        │
│                     │                                        │
└─────────────────────┴────────────────────────────────────────┘
```

This establishes the metric landscape before individual metrics are discussed.

---

# 16. Archetype: Metric Selection

The presentation should exploit progressive highlighting.

Before diving into a metric, the metrics overview is shown again, but with one metric strongly emphasized and the others visually de-emphasized.

For example:

```text
          Delivery        Quality

             92%            87%
           muted          muted


          ADOPTION       Operational

            64%             96%
         ████████          muted
         SELECTED
```

This slide may exist for only a few seconds.

Its job is not to communicate new data.

Its job is to communicate:

> We are moving our attention here.

This technique should be used intentionally throughout the presentation where useful.

---

# 17. Archetype: Metric Detail

Each selected metric receives a dedicated slide.

The slide should strongly feature:

* metric icon;
* metric name;
* metric value;
* state/trend;
* concise explanation;
* limited supporting information.

Example:

```text
┌──────────────────────────────────────────────────────────────┐
│ [METRIC ICON]  ADOPTION                       [HEALTHY ICON] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                         64%                                  │
│                                                              │
│                    ↑ 12% from prior sprint                   │
│                                                              │
│        • Pilot group expanded                                │
│        • Weekly active usage continues to increase           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The metric slide should prioritize recognition and emphasis over analytical density.

---

# 18. Archetype: Project / Initiative Status

Project status slides communicate the structure and current state of an initiative.

Example initiative:

**Workspace Assistant Rollout**

The slide has a hierarchy.

### Level 1 — Initiative

Large primary icon and initiative title.

### Level 2 — Phase / Workstream

Smaller icon and heading representing a logical phase of the initiative.

### Level 3 — Epics

Individual epics underneath the phase.

This is deliberately more expressive than displaying raw issue-tracker epic titles.

Conceptually:

```text
┌──────────────────────────────────────────────────────────────┐
│ [PROJECT]  WORKSPACE ASSISTANT ROLLOUT             [STATUS]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ [PHASE ICON]  PILOT EXPANSION                                │
│                                                              │
│      [EPIC] Expand pilot population                          │
│      [EPIC] Establish telemetry                              │
│      [EPIC] Complete governance review                       │
│                                                              │
│ [PHASE ICON]  PRODUCTION READINESS                           │
│                                                              │
│      [EPIC] Finalize support model                           │
│      [EPIC] Publish user guidance                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The icons and grouping make the work comprehensible even when individual epic names are terse or implementation-oriented.

---

# 19. Project Volume

A typical presentation may contain approximately **2–3 active project/initiative updates**.

The exact count is data-driven.

Each initiative should normally receive its own slide rather than compressing several projects onto one slide.

Again:

> more simple slides are preferable to fewer dense slides.

---

# 20. Releases

Releases represent newly delivered capabilities or features currently being released.

Release slides should use the same overall visual grammar:

* release icon;
* application-like title bar;
* product identity;
* feature/release title;
* concise status;
* limited supporting bullets;
* optional state indicator.

Example:

```text
[RELEASE]  NEW ANALYTICS EXPERIENCE               [PRODUCT]

Available this sprint

• New dashboard experience released
• Existing users migrated automatically
• Documentation published
```

---

# 21. Deprecations

Deprecations require immediately recognizable iconography.

A deprecation slide should communicate:

* what is being deprecated;
* which product/component is affected;
* lifecycle state;
* important date if relevant;
* expected action.

Example:

```text
[DEPRECATION]  LEGACY REPORT EXPORT              [PRODUCT]

Retirement: October 31

• New exports should use Reporting API v2
• Existing integrations remain functional until retirement
```

The deprecation icon should be globally consistent.

A viewer should recognize a deprecation slide before reading the title.

---

# 22. Advisories

Advisories represent important information that does not necessarily correspond to a project or release.

Examples could include:

* operational advisories;
* behavior changes;
* policy changes;
* important limitations;
* upcoming required action;
* temporary constraints.

Again, advisories should have stable iconography.

```text
[ADVISORY]  AUTHENTICATION CHANGE                [PRODUCT]

Action required before September 15

• Existing tokens continue to function
• New integrations must use the updated authentication flow
```

---

# 23. Roadmap

Roadmap slides communicate relevant future work.

They should not attempt to become full Gantt charts.

The purpose is simply:

> What should viewers expect next?

For example:

```text
[ROADMAP]  COMING NEXT                           [PRODUCT]

NOW
Improve pilot telemetry

NEXT
Expand availability

LATER
Introduce automated governance controls
```

Roadmap visualizations should remain simple enough to understand almost instantly.

---

# 24. Closing Sprint Summary

There should be no obligatory "Questions?" slide.

The final slide should instead provide a concise visual summary of the sprint.

It might communicate:

* sprint identity;
* key accomplishment;
* current overall state;
* major upcoming item;
* relevant icons.

For example:

```text
SPRINT 42

[✓] Pilot expanded
[↑] Adoption improving
[SHIP] Analytics experience released
[NEXT] Production rollout begins next sprint
```

This provides a useful visual endpoint while narration concludes.

---

# 25. Progressive Visual Storytelling

The system should deliberately permit slides whose primary purpose is **transition or emphasis**.

For example:

```text
Metrics Overview
      ↓
Adoption Selected
      ↓
Adoption Detail
      ↓
Metrics Overview — Quality Selected
      ↓
Quality Detail
```

The repeated overview is intentional.

It prevents viewers from losing their place.

It also makes the presentation feel animated and directed even though the implementation consists entirely of ordinary PowerPoint slides.

Because slides are cheap and programmatically generated, the system should exploit this.

---

# 26. Presentation Composition

The final presentation should not necessarily correspond one-to-one with JSON objects.

Instead, presentation composition logic expands semantic objects into a sequence of slides.

For example:

```text
JSON:

metrics:
  - adoption
  - quality
  - reliability
  - delivery-confidence
```

may become:

```text
Slide 04 — Metrics Overview
Slide 05 — Adoption Selected
Slide 06 — Adoption Detail
Slide 07 — Quality Selected
Slide 08 — Quality Detail
Slide 09 — Reliability Selected
Slide 10 — Reliability Detail
Slide 11 — Delivery Confidence Selected
Slide 12 — Delivery Confidence Detail
```

Thus the renderer is not simply:

> one JSON object = one slide.

It is a **presentation compiler**.

---

# 27. Suggested Internal Architecture

```text
src/
├── schema/
│   ├── presentation.ts
│   ├── metrics.ts
│   ├── projects.ts
│   └── common.ts
│
├── catalog/
│   ├── metrics.ts
│   ├── icons.ts
│   └── products.ts
│
├── assets/
│   ├── archetypes/
│   ├── metrics/
│   ├── products/
│   └── status/
│
├── theme/
│   ├── typography.ts
│   ├── spacing.ts
│   ├── colors.ts
│   └── layout.ts
│
├── archetypes/
│   ├── title.ts
│   ├── themes.ts
│   ├── metrics-overview.ts
│   ├── metric-selected.ts
│   ├── metric-detail.ts
│   ├── project-status.ts
│   ├── release.ts
│   ├── deprecation.ts
│   ├── advisory.ts
│   ├── roadmap.ts
│   └── sprint-summary.ts
│
├── components/
│   ├── application-header.ts
│   ├── icon.ts
│   ├── status-icon.ts
│   ├── bullet-group.ts
│   ├── progress-bar.ts
│   ├── metric.ts
│   └── epic.ts
│
├── composition/
│   └── compose-presentation.ts
│
├── validation/
│   └── validate-presentation.ts
│
└── render.ts
```

---

# 28. Reusable Components

Archetypes should themselves be assembled from reusable visual primitives.

For example:

```typescript
addApplicationHeader(...)
addPrimaryIcon(...)
addProductIdentity(...)
addStatusIndicator(...)
addMetric(...)
addBulletGroup(...)
addEpic(...)
addPhase(...)
addProgressBar(...)
```

This creates consistency across archetypes.

Changing the application's title-bar convention should require changing one component rather than every slide implementation.

---

# 29. Layout Constants

Coordinates should be centralized.

For example:

```typescript
const Layout = {
  slide: {
    width: 13.333,
    height: 7.5
  },

  header: {
    height: 1.0,
    primaryIconX: 0.5,
    primaryIconY: 0.28,
    primaryIconSize: 0.45,
    titleX: 1.15,
    titleY: 0.30,
    stateRight: 12.75
  },

  content: {
    left: 0.6,
    right: 12.73,
    top: 1.35,
    bottom: 6.8
  }
};
```

Arbitrary magic coordinates scattered throughout archetype code should be avoided.

---

# 30. Content Constraints

Each archetype must define explicit content limits.

For example:

```text
Theme Slide
-----------
themes             2–3
bullets/theme       ≤ 3
heading length      ≤ 40 characters
bullet length       ≤ 100 characters


Metric Detail
-------------
primary metric      exactly 1
supporting bullets  ≤ 3
metric label        known catalog value


Project Status
--------------
phases              ≤ 4
epics/phase         ≤ 5
epic title          ≤ 90 characters
```

The exact values should be tuned during implementation.

The important principle is that overflow is considered an **input validation problem**, not a typography problem.

The renderer should not respond to excessive content by shrinking fonts indefinitely.

---

# 31. Validation

Generation should fail loudly when input violates a slide contract.

Example:

```text
ERROR

Slide archetype: project-status
Initiative: Workspace Assistant Rollout
Phase: Production Readiness

Maximum epics: 5
Received: 9
```

This is preferable to producing an ugly slide.

Where appropriate, composition logic may also split excessive content into additional slides.

For example:

```text
Project Status — Production Readiness
Project Status — Production Readiness (continued)
```

But this behavior should itself be deterministic.

---

# 32. Mock Assets

The initial implementation should include a complete mock visual vocabulary so development is not blocked by final production assets.

Mock products might include:

```text
Atlas
Beacon
Nimbus
Orbit
```

Each should have:

* simple vector icon;
* mock logo;
* accent identity.

Likewise, mock metric icons should exist for the initial metric catalog.

These assets should be deliberately simple but structurally representative of the final asset system.

---

# 33. Existing Presentations as Design Input

Existing manually created PowerPoints and screenshots should be treated as reference material for extracting the visual grammar.

They can be used to identify:

* slide dimensions;
* margins;
* icon sizes;
* title placement;
* font hierarchy;
* spacing;
* background treatments;
* product-brand placement;
* status-icon placement;
* bullet styles;
* line spacing;
* progress-bar conventions;
* column proportions.

The objective is **not** to recreate screenshots dynamically.

Instead:

```text
Existing Slide
      ↓
Analyze Once
      ↓
Extract Design Rules
      ↓
Encode Rules
      ↓
Deterministic Renderer
```

Once a convention is encoded, the original screenshot is no longer needed during generation.

---

# 34. Narration Compatibility

The system is expected to coexist with AI-assisted presentation/narration tooling, including voice-based presentation workflows.

Slides should therefore remain useful without attempting to duplicate narration.

The renderer should assume that:

* detailed explanation occurs verbally;
* slides provide visual anchors;
* slide transitions may happen quickly;
* visual changes should reinforce narration;
* highlighting can indicate where the narrator's attention has moved.

This further reinforces the principle:

> One visual thought per slide.

---

# 35. Non-Goals

The system is not intended to become:

* a general-purpose presentation designer;
* a PowerPoint clone;
* a Canva replacement;
* an AI layout engine;
* a free-form slide authoring environment;
* a dashboarding system;
* a sophisticated charting framework;
* a mechanism for arbitrary user-defined templates;
* a system that accepts arbitrary HTML and attempts to fit it onto slides.

The system should remain intentionally constrained.

Constraints create reliability.

---

# 36. Success Criteria

The system succeeds when a caller can provide valid presentation JSON and reliably receive a PowerPoint requiring **zero manual cleanup**.

A successful generated presentation should:

1. open correctly in PowerPoint;
2. preserve expected layout;
3. contain correct icons;
4. apply correct product identity;
5. contain no overflowing text;
6. contain no overlapping elements;
7. maintain consistent typography;
8. maintain consistent application-header conventions;
9. communicate category through iconography;
10. expand semantic content into the correct slide sequence;
11. look intentionally designed;
12. remain visually comprehensible during rapid presentation;
13. require no manual repositioning;
14. be reproducible from the same input.

---

# 37. Example End-to-End Input

A simplified presentation might eventually resemble:

```json
{
  "version": "1.0",
  "presentation": {
    "title": "Sprint 42 Overview",
    "sprint": "Sprint 42",
    "dateRange": "2026-08-10/2026-08-21",
    "product": "atlas",

    "themes": [
      {
        "icon": "foundation",
        "title": "Foundation",
        "bullets": [
          "Complete migration",
          "Remove remaining legacy paths"
        ]
      },
      {
        "icon": "adoption",
        "title": "Adoption",
        "bullets": [
          "Expand pilot population",
          "Validate engagement"
        ]
      },
      {
        "icon": "reliability",
        "title": "Reliability",
        "bullets": [
          "Improve telemetry",
          "Reduce recurring failures"
        ]
      }
    ],

    "metrics": [
      {
        "metric": "delivery-confidence",
        "value": 92,
        "trend": "up",
        "status": "healthy"
      },
      {
        "metric": "quality",
        "value": 87,
        "trend": "flat",
        "status": "healthy"
      },
      {
        "metric": "adoption",
        "value": 64,
        "trend": "up",
        "status": "attention"
      },
      {
        "metric": "operational-health",
        "value": 96,
        "trend": "up",
        "status": "healthy"
      }
    ],

    "projects": [
      {
        "id": "workspace-assistant",
        "title": "Workspace Assistant Rollout",
        "icon": "initiative",
        "status": "on-track",
        "phases": [
          {
            "title": "Pilot Expansion",
            "icon": "pilot",
            "epics": [
              {
                "title": "Expand pilot population"
              },
              {
                "title": "Establish usage telemetry"
              }
            ]
          },
          {
            "title": "Production Readiness",
            "icon": "production",
            "epics": [
              {
                "title": "Finalize support model"
              },
              {
                "title": "Publish user guidance"
              }
            ]
          }
        ]
      }
    ],

    "releases": [],
    "deprecations": [],
    "advisories": [],
    "roadmap": []
  }
}
```

---

# 38. Example Expansion

The preceding JSON could compile to:

```text
01  Sprint Overview

02  Sprint Themes

03  Metrics Overview

04  Metrics — Delivery Confidence Selected
05  Delivery Confidence Detail

06  Metrics — Quality Selected
07  Quality Detail

08  Metrics — Adoption Selected
09  Adoption Detail

10  Metrics — Operational Health Selected
11  Operational Health Detail

12  Project — Workspace Assistant Rollout

13  Releases

14  Deprecations

15  Advisories

16  Roadmap

17  Sprint Summary
```

Sections containing no relevant information may be omitted according to deterministic composition rules.

---

# 39. Design Principle: Semantic Iconography

A particularly important requirement is that icons form a **semantic vocabulary**, not merely decoration.

If a viewer repeatedly sees:

```text
[DEPRECATION ICON]
```

they should eventually understand "something is going away" without reading anything.

Likewise:

```text
[RELEASE ICON]       → something newly available

[ADVISORY ICON]      → something requiring awareness

[ROADMAP ICON]       → something coming later

[PROJECT ICON]       → active initiative

[METRIC ICON]        → known measurement category
```

Product icons then answer a different question:

> What is this about?

Status icons answer:

> What state is it in?

The combination creates a compact visual grammar:

```text
[CONTENT TYPE] + TITLE + [PRODUCT] + [STATE]
```

For example:

```text
[DEPRECATION] Legacy Export API       [ATLAS] [ATTENTION]
```

A viewer can understand much of the slide before processing the body.

That behavior is central to the vision.

---

# 40. Design Principle: Visual Continuity

The same semantic object should look recognizably similar wherever it appears.

A metric icon shown on the overview slide should be the same icon shown on:

* the selected-metric transition slide;
* the metric detail slide;
* the sprint summary, if referenced there.

Similarly, a product icon should remain consistent throughout the deck.

This visual continuity allows extremely rapid slide transitions without disorienting the audience.

---

# 41. Design Principle: Slides Are Cheap

Traditional presentation design tends to treat slides as expensive.

This system should treat slides as **nearly free**.

If a visual transition deserves a slide, generate the slide.

If highlighting a metric for two seconds improves orientation, generate the slide.

If splitting an overloaded concept into two slides improves comprehension, generate two slides.

Programmatic generation eliminates the manual cost traditionally associated with slide count.

Therefore:

> optimize for presentation clarity, not minimum slide count.

---

# 42. Ultimate Product

The finished system should behave less like an automated PowerPoint author and more like a **compiler for a visual presentation language**.

The source language is structured JSON.

The visual vocabulary consists of:

* known icons;
* known products;
* known metrics;
* known states;
* known archetypes;
* known typography;
* known spacing;
* known narrative patterns.

The compiler transforms that semantic structure into a polished PowerPoint.

```text
              PRESENTATION JSON
                      │
                      ▼
              ┌───────────────┐
              │   VALIDATE    │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   COMPOSE     │
              │ slide sequence│
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │    RENDER     │
              │  archetypes   │
              └───────┬───────┘
                      │
              ┌───────┴────────┐
              │                │
          ICON CATALOG     PRODUCT THEMES
              │                │
              └───────┬────────┘
                      │
                      ▼
                 PptxGenJS
                      │
                      ▼
              Sprint-42.pptx
```

The PowerPoint itself is the output artifact.

The system's actual product is the **visual grammar and deterministic compiler that creates it**.

That distinction should guide implementation decisions throughout the project.
