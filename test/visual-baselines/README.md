# Visual snapshot baselines

`full-sprint/` contains one PNG per slide rendered from `samples/full-sprint.json`,
which covers every slide archetype. Generate or compare snapshots with:

```sh
make visual-update  # deliberately replace committed baselines
make visual         # compare and write review artifacts under dist/visual-snapshots/
```

The renderer requires LibreOffice Impress, Poppler (`pdftoppm`), ImageMagick
(`compare`), and Liberation/OpenSymbol fonts. LibreOffice output approximates
PowerPoint and is intended for human review of overflow, overlap, headers,
icons, and product identity; it is not a pixel-faithful PowerPoint oracle.

`make visual` fails when normalized RMSE exceeds 3.5%, which accommodates known
LibreOffice and font-rasterizer variation between supported Linux runners while
still surfacing material layout changes. A pinned environment can tighten the
gate by setting `VISUAL_RMSE_THRESHOLD`.
