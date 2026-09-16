# 0002: Validation Library and Schema Versioning — zod

- Status: accepted
- Date: 2026-08-22

## Context

The Presentation JSON document is the sole input to the system. It must be
"strongly typed and versioned" (VISION §5), and invalid input must fail loudly
rather than produce a broken deck (VISION §31). VISION §4 permits "JSON Schema
or an equivalent TypeScript validation system". Candidates:

- **zod** — TypeScript-first: one schema definition produces both the
  compile-time type and the runtime validator, so they cannot drift.
- **JSON Schema + Ajv** — language-neutral schema documents, but the
  TypeScript types must be generated or maintained separately, an extra
  toolchain step with no other consumer in a TypeScript-only pipeline.
- **TypeScript-only** — no runtime validation; machine-generated input would
  be trusted blindly, violating VISION §31.

## Decision

Use **zod** in `src/schema/*.ts`. Each schema module exports the zod schema,
the inferred TypeScript type, and (for the document root) a parse entry point.

- `z.strictObject` rejects unknown keys, so stray visual data (coordinates,
  fonts, colors — VISION §5) or mistyped field names fail loudly instead of
  being silently ignored.
- Catalog references are typed as ids, never as free-form visual data
  (VISION §14): metric ids are a closed enum of the §14 catalog, while icon and
  product ids are id strings resolved by the asset and product catalogs at
  render time (VISION §8, §9).

## Schema versioning

The document root carries a `version` field, currently the literal `"1.0"`
(`PRESENTATION_SCHEMA_VERSION` in `src/schema/presentation.ts`). A schema
evolution that changes the accepted shape must bump this literal and adapt the
schemas; input carrying any other version is rejected at parse time, so a
version mismatch can never silently misrender. Version `"1.0"` accepts the
VISION §37 example document verbatim (the `version` wrapper is the one
deliberate evolution beyond the §5 sketch).

## Consequences

- Later milestones consume `parsePresentation` (validation) and the exported
  types (composition, renderers).
- Adding a metric to the catalog requires a schema change (and version bump);
  the catalog module defined by a later milestone should derive its ids from
  the schema union or drive a new schema version.
- Round-trip is lossless: strict schemas never drop fields, so a valid document
  serializes and re-parses to an equal object (asserted in
  `test/schema.test.ts`).
