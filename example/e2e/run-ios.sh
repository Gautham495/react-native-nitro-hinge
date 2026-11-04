#!/usr/bin/env bash
# Runs the Maestro flows on the booted iOS simulator.
# Use a regular iPhone: on the iPhone Duo simulator, setOrientation leaves
# the app in portrait and rotate.yaml fails.
set -euo pipefail
cd "$(dirname "$0")/flows"

APP_ID="${APP_ID:-com.apolloshot}"

flow() {
  maestro --platform ios test -e APP_ID="$APP_ID" "$@"
}

trap 'xcrun simctl ui booted content_size large >/dev/null 2>&1 || true' EXIT

flow launch.yaml
flow rotate.yaml

# Dynamic Type sizes map to fontScale in ios/UIContentSizeCategory+fontScaleMultiplier.swift.
xcrun simctl ui booted content_size extra-extra-large
flow -e FONT_SCALE=1.24 font-scale.yaml

xcrun simctl ui booted content_size large
flow -e FONT_SCALE=1.00 font-scale.yaml
