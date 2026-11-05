#!/usr/bin/env bash
# Runs the Maestro flows on the connected Android device or emulator.
# Fold steps need a foldable emulator (e.g. Pixel 10 Pro Fold) and are skipped otherwise.
set -euo pipefail
cd "$(dirname "$0")/flows"

APP_ID="${APP_ID:-nitrohinge.example}"

flow() {
  maestro --platform android test -e APP_ID="$APP_ID" "$@"
}

is_foldable_emulator() {
  adb emu sensor get hinge-angle0 2>/dev/null | grep '^hinge-angle0 =' >/dev/null
}

reset_device() {
  adb shell settings put system font_scale 1.0 >/dev/null 2>&1 || true
  if is_foldable_emulator; then
    adb emu unfold >/dev/null 2>&1 || true
    adb emu sensor set hinge-angle0 180 >/dev/null 2>&1 || true
  fi
}
trap reset_device EXIT

# Android 15+ forces edge-to-edge at this targetSdk, so the content sits
# under the bars and gets a bottom inset. Older versions lay it out inside
# the bars, where every inset is 0.
if [ "$(adb shell getprop ro.build.version.sdk | tr -d '\r')" -ge 35 ]; then
  INSETS='t\d+ r\d+ b[1-9]\d* l\d+'
else
  INSETS='t0 r0 b0 l0'
fi
flow -e INSETS="$INSETS" launch.yaml
flow rotate.yaml

# Android recreates the Activity on a font scale change while JS keeps
# running, so the fold steps below also check that the module follows
# the new Activity.
adb shell settings put system font_scale 1.3
flow -e FONT_SCALE=1.30 font-scale.yaml

if is_foldable_emulator; then
  adb emu sensor set hinge-angle0 90 >/dev/null
  flow fold-half-open.yaml
  adb emu fold >/dev/null
  flow fold-closed.yaml
  adb emu unfold >/dev/null
  adb emu sensor set hinge-angle0 180 >/dev/null
  flow fold-open.yaml
else
  echo "Skipping fold flows: not a foldable emulator"
fi

adb shell settings put system font_scale 1.0
flow -e FONT_SCALE=1.00 font-scale.yaml
