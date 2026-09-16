#!/usr/bin/env bash
set -euo pipefail

mode=${1:-check}
rmse_threshold=${VISUAL_RMSE_THRESHOLD:-0.035}
case "$mode" in
    check|update) ;;
    *) echo "Usage: $0 [check|update]" >&2; exit 2 ;;
esac

for command in soffice pdftoppm compare; do
    command -v "$command" >/dev/null || {
        echo "Missing visual snapshot dependency: $command" >&2
        exit 2
    }
done

repo_root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
baseline_dir="$repo_root/test/visual-baselines/full-sprint"
artifact_dir="$repo_root/dist/visual-snapshots"
actual_dir="$artifact_dir/actual"
diff_dir="$artifact_dir/diff"
profile_dir=$(mktemp -d)
trap 'rm -rf "$profile_dir"' EXIT

rm -rf "$artifact_dir"
mkdir -p "$actual_dir" "$diff_dir"
npm run build
node "$repo_root/dist/cli.js" \
    "$repo_root/samples/full-sprint.json" "$artifact_dir/full-sprint.pptx"
soffice --headless --nologo --nodefault --nolockcheck --nofirststartwizard \
    "-env:UserInstallation=file://$profile_dir" --convert-to pdf \
    --outdir "$artifact_dir" "$artifact_dir/full-sprint.pptx" >/dev/null
pdftoppm -png -r 144 "$artifact_dir/full-sprint.pdf" "$actual_dir/slide" >/dev/null

index=1
for source in "$actual_dir"/slide-*.png; do
    target=$(printf '%s/slide-%02d.png' "$actual_dir" "$index")
    if [ "$source" != "$target" ]; then mv "$source" "$target"; fi
    index=$((index + 1))
done

if [ "$mode" = update ]; then
    rm -rf "$baseline_dir"
    mkdir -p "$baseline_dir"
    cp "$actual_dir"/*.png "$baseline_dir"/
    echo "Updated $((index - 1)) visual baselines in $baseline_dir"
    exit 0
fi

expected_count=$(find "$baseline_dir" -maxdepth 1 -name 'slide-*.png' | wc -l)
actual_count=$((index - 1))
if [ "$actual_count" -ne "$expected_count" ]; then
    echo "Visual slide count changed: expected $expected_count, received $actual_count" >&2
    exit 1
fi

changed=0
for actual in "$actual_dir"/*.png; do
    name=${actual##*/}
    baseline="$baseline_dir/$name"
    diff="$diff_dir/$name"
    set +e
    metric=$(compare -metric RMSE "$baseline" "$actual" "$diff" 2>&1)
    compare_status=$?
    set -e
    if [ "$compare_status" -gt 1 ]; then
        echo "Unable to compare $name: $metric" >&2
        exit 1
    fi
    normalized=${metric##*\(}
    normalized=${normalized%\)}
    if awk "BEGIN { exit !($normalized > $rmse_threshold) }"; then
        echo "$name differs from its baseline (normalized RMSE $normalized; threshold $rmse_threshold)" >&2
        changed=1
    else
        rm -f "$diff"
    fi
done

if [ "$changed" -ne 0 ]; then
    echo "Review actual and diff images in $artifact_dir" >&2
    exit 1
fi
echo "Visual snapshots match the committed baselines ($actual_count slides; RMSE threshold $rmse_threshold)."
