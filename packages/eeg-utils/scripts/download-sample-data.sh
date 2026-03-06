#!/usr/bin/env bash
# Download sample EDF files from PhysioNet's EEG Motor Movement/Imagery Dataset
# https://physionet.org/content/eegmmidb/1.0.0/
#
# S001R01: Baseline, eyes open (1 minute)
# S001R02: Baseline, eyes closed (1 minute)
# S001R03: Task 1 – open/close left or right fist (motor execution)
# S001R04: Task 2 – imagine opening/closing left or right fist (motor imagery)
# S001R05: Task 3 – open/close both fists or both feet (motor execution)

set -euo pipefail

BASE_URL="https://physionet.org/files/eegmmidb/1.0.0/S001"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/../test/fixtures"

mkdir -p "$OUTPUT_DIR"

FILES=(
  "S001R01.edf"
  "S001R02.edf"
  "S001R03.edf"
  "S001R04.edf"
  "S001R05.edf"
)

echo "Downloading sample EDF files to $OUTPUT_DIR ..."

for file in "${FILES[@]}"; do
  if [ -f "$OUTPUT_DIR/$file" ]; then
    echo "  [skip] $file (already exists)"
  else
    echo "  [download] $file"
    curl -fSL --progress-bar "$BASE_URL/$file" -o "$OUTPUT_DIR/$file"
  fi
done

echo "Done. Downloaded ${#FILES[@]} files."
