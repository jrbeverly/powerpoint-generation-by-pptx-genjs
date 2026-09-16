# Programmatic Sprint Review Generation

> [!WARNING]
> **AI-authored:** This change was autonomously planned and implemented by an AI software factory from a human-authored specification, with possible subsequent human review or modification.

An experiment in generating PowerPoint sprint reviews entirely programmatically.

The broader idea is automated project reporting: take structured project state, changes, metrics, implementation activity, etc. and generate a useful presentation without someone manually assembling slides. PowerPoint is mostly the output format being explored here rather than the interesting part itself.

The starting point was a small `VISION.md` describing the intended system, leaving much of the implementation open. Presentation is located within [docs](./docs/full-sprint.pptx)

```sh
make install
make build
make run
make test
```

## Notes

- Substantive generated implementation. Not a toy amount of code.
- Generally adheres to expected repository / implementation standards. Surface-level structure surprisingly reasonable.
- Still mostly a paper prototype. Demonstrates the idea; would not use this implementation as the foundation for a real system.
- Problems become more apparent under composition. Individual components plausible; assumptions start conflicting once the system is connected to anything outside its own boundary.
- Several incongruencies subtle enough to survive normal code review. Mostly appear when trying to move the system somewhere it was not explicitly designed to go.
- Open-bounded specification produced substantially more implementation interpretation. Useful for testing autonomy; makes evaluation harder because architecture becomes part of the generated result.
- Programmatic PowerPoint seems viable as an output mechanism. The more interesting question is what canonical reporting model should exist _before_ PowerPoint.
- Probably wrong to make PPTX, HTML, or video the primary abstraction. They look increasingly like render targets over the same underlying reporting state.
- Automated sprint review remains interesting. Project state → reporting model → presentation appears more reusable than project state → generated deck directly.
- Visual gate is RMSE-based and fairly forgiving. It tolerates small text changes, so it catches layout regressions rather than content changes.
