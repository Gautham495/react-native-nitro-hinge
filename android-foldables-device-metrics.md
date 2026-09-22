# Android foldable device metrics

Measured dimensions for every book-style and clamshell foldable
that ships in meaningful volume. Use these to verify Hinge returns
the correct `widthClass` and `foldFeatures` on each pose.

**Rule for testing**: on every foldable below, verify that Hinge
reports the expected `widthClass` and `foldFeatures` in the tables.
If it doesn't, the `HingeStateProbe` classification thresholds or
the WindowMetricsCalculator plumbing is wrong.

## Book-style (unfolds like a book — one hinge, two panels)

The common shape: narrow cover screen, unfolds to nearly-square
inner display. Same pose model as iPhone Duo.

### Samsung Galaxy Z Fold family (7.6"–8.0" inner)

The best-selling Android foldable line. Test against Fold 6 and
Fold 7 as representative — earlier Folds have narrower cover
screens that behave more like a normal phone.

| Model | Cover (folded) | Inner (unfolded) | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Z Fold 6 (2024) | 6.3" @ 2376×968, ~410ppi → ~376×912dp | 7.6" @ 2160×1856, ~374ppi → ~656×564dp | **compact** | **medium** |
| Z Fold 7 (2025) | 6.5" @ 2520×1080, 422ppi → ~427×996dp | 8.0" @ 2184×1968, ~368ppi → ~758×684dp | **compact** | **medium** |
| Z Fold 8 (2026) | Same generation as Fold 7 (Samsung typically iterates on internals, not display) | | **compact** | **medium** |

Note: Fold 6 cover is 6.3" but the ~376dp width is right at the
compact/medium boundary (600dp cutoff). Verify that Samsung's
narrow 22:9 cover screen classifies as **compact**, not medium
— which is what you want (a phone-shape layout).

Also note: **inner-display width in dp is smaller than you'd
expect** because Fold devices use high pixel density. 7.6" at
374ppi is only ~656dp wide, which falls in the **medium** range
(600–839dp), NOT expanded. This matches Google's guidance:
foldable inner displays are medium size class, not expanded.

### Google Pixel Fold family

| Model | Cover (folded) | Inner (unfolded) | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Pixel Fold (2023) | 5.8" @ 2092×1080, ~408ppi → portrait → ~360×720dp | 7.6" @ 2208×1840, ~380ppi → landscape natural → ~841×701dp | **compact** | **expanded** |
| Pixel 9 Pro Fold (2024) | 6.3" @ 2424×1080, 422ppi → ~410×920dp | 8.0" @ 2152×2076, ~373ppi → ~728×702dp | **compact** | **medium** |
| Pixel 10 Pro Fold (2025) | Similar to 9 Pro Fold generation | | **compact** | **medium** |

**IMPORTANT — Pixel Fold anti-pattern trap**: The original Pixel
Fold opens in **landscape orientation** (rotation_0 = landscape),
not portrait. Any code that assumes portrait as the natural
orientation of the inner display will break on the original
Pixel Fold. Later Pixel Folds fold vertically like Samsung's,
but you'll still see original Pixel Folds in the wild.

### Honor Magic V family

| Model | Cover | Inner | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Magic V3 (2024) | 6.43" @ 2376×1060, ~404ppi → ~419×941dp | 7.92" @ 2344×2156, ~404ppi → ~726×668dp | **compact** | **medium** |
| Magic V5 (2025) | 6.43" @ 2376×1060 (same as V3 practically) | 7.95" (very close to V3) | **compact** | **medium** |

Not available in the US, but widely deployed in EU/Asia. If SHINE
AI or nitroai.dev has European or Asian customers, test on
these.

### Xiaomi Mix Fold family

| Model | Cover | Inner | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Mix Fold 3 (2023) | 6.56" @ 2520×1080, ~420ppi → ~411×960dp | 7.6" @ 2160×1916 | **compact** | **medium** |
| Mix Fold 4 (2024) | Similar to Mix Fold 3 | | **compact** | **medium** |

China-only for the most part. Include in test matrix if you have
Chinese users; skip otherwise.

### Huawei foldable family

Dominant in China (57% of Chinese foldable market H1 2026).
Available globally in limited markets due to trade restrictions.
Run HarmonyOS Next rather than stock Android; RN support depends
on the RN-for-HarmonyOS project. Where standard Android runs,
`WindowInfoTracker` behaves normally.

| Model | Form factor | Approx inner dp width | Notes |
|---|---|---|---|
| Mate X6 (2024) | Book | ~672dp | Standard Fold-like |
| Mate X7 (2025) | Book | ~672dp | |
| Pura X (2025) | Book, passport-style (wider than tall) | ~810dp | Landscape-natural inner display |
| Pura X Max (May 2026) | Book | ~672dp | Highest-share single device in 2026 |
| Mate XT (2024) | Tri-fold | ~1080dp (fully unfolded) | First-shipping tri-fold, China-only until Mate XT2 |
| Mate XT2 (Sept 2026) | Tri-fold | ~1080dp (fully unfolded) | Global expansion, launched day before Apple iPhone Duo event |

### Motorola Razr family (book-style variants)

Most Razr devices are clamshells; a few book-style models exist.

| Model | Form factor | Approx inner dp | Notes |
|---|---|---|---|
| Razr 70 series (2026) | Clamshell (compact both poses) | ~410×880dp | Best-selling US foldable Q2 2026 |
| Razr Ultra 2026 | Clamshell | ~410×880dp | Slightly larger cover screen |

### Vivo X Fold family

| Model | Form factor | Approx inner dp | Notes |
|---|---|---|---|
| X Fold 3 (2024) | Book | ~700dp | Similar to Samsung Fold generation |
| X Fold 3 Pro (2024) | Book | ~700dp | Global launch (India, Indonesia) |
| X Fold 5 (2025) | Book | ~700dp | China-focused |

### Xiaomi Mix Fold family

| Model | Form factor | Approx inner dp | Notes |
|---|---|---|---|
| Mix Fold 3 (2023) | Book | ~700dp | China-only |
| Mix Fold 4 (2024) | Book | ~700dp | China-only |
| Xiaomi 18 Fold (Sept 2026) | Book, passport-style | ~830dp | Announced day before Apple iPhone Duo |
| Mix Flip series | Clamshell | ~410×880dp | Clamshell variant |

## Tri-fold (two hinges, three panels)

Two tri-folds now ship in the market. Google explicitly mentions
tri-folds in its foldable guidance, and Apple is rumored to enter
this form factor with a foldable iPad in 2028.

### Samsung Galaxy Z TriFold (Dec 2025)

First widely-available tri-fold in Western markets.

| Pose | Display | Size | ppi | Width dp approx | widthClass |
|---|---|---|---|---|---|
| Cover | 6.5" @ 2520×1080 | 422 | ~427×996dp | **compact** |
| Half-open (one hinge folded) | ~6.6" × 2 | 269 | ~793dp | **medium** |
| Fully unfolded | 10" @ 2160×1584 | 269 | ~1055×773dp | **expanded** |

### Huawei Mate XT / Mate XT2 (2024 / Sept 2026)

First tri-fold to ship (Mate XT, 2024, China-only). Mate XT2
expanded globally in Sept 2026. Runs HarmonyOS Next; RN support
via the community RN-for-HarmonyOS project.

| Pose | Approx width dp | widthClass |
|---|---|---|
| Fully folded (one panel) | ~410dp | **compact** |
| One hinge folded (two panels) | ~800dp | **medium** |
| Fully unfolded (three panels) | ~1080dp | **expanded** |

**This is where the abstraction pays off**. A tri-fold has three
possible poses instead of two. Hinge doesn't need to know "is this a
tri-fold" — it exposes `foldFeatures: FoldFeature[]` which naturally
returns 0, 1, or 2 entries depending on pose. Same API on a Duo
(which only ever returns 0 or 1) — the code that consumes Hinge
handles any current or future N-fold device without changes.

The Android `FoldingFeature` API returns a **list** of folding
features. On a tri-fold, `windowLayoutInfo.displayFeatures` can
contain:

- Fully folded (cover screen): 0 features
- One hinge partially open: 1 feature
- Both hinges partially open: 2 features
- Fully flat: 0 features (or 2 with `state = FLAT`; Google's docs
  are ambiguous — Hinge filters to `isSeparating` so flat folds
  don't appear in the array)

## Clamshell (folds horizontally — hinge across the middle)

The Flip family. Behaves like a normal phone in most cases
because the outer screen is small and the inner unfolds to a
regular phone shape, not a tablet shape.

### Samsung Galaxy Z Flip family

| Model | Cover | Inner (unfolded) | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Z Flip 6 (2024) | 3.4" @ 720×748 | 6.7" @ 2640×1080, ~426ppi | **compact** (very narrow) | **compact** |
| Z Flip 7 (2025) | 4.1" @ 1048×948 | 6.9" | **compact** | **compact** |
| Z Flip 7 FE (2025) | 4.1" @ 1048×948 | 6.7" | **compact** | **compact** |

### Motorola Razr family

Top-selling clamshell family in the US in 2026.

| Model | Cover | Inner | Cover widthClass | Inner widthClass |
|---|---|---|---|---|
| Razr 50 (2024) | 3.6" | 6.9" | **compact** | **compact** |
| Razr 70 (2025) | 4.0" | 6.9" | **compact** | **compact** |
| Razr Ultra 2026 | 4.0" | 7.0" | **compact** | **compact** |

### Other clamshells

Same shape as above. All report `compact` in all poses.

- OPPO Find N Flip series (China)
- Honor Magic Flip series (China)
- Xiaomi Mix Flip series (China)
- Vivo X Flip series (China)

**Layout implication**: Clamshell devices are basically always
`compact` regardless of pose. They don't switch to tablet-style
layouts because they never get wide. The interesting thing is
**tabletop posture** (flex mode) when half-open with the hinge
horizontal — the top half becomes the content area, the bottom
half becomes the controls area. Detect via
`isTabletopPosture()` in Hinge's JS API.

## Summary table for testing Hinge

| Device | Cover / Folded | Inner (flat) | Inner (half-open) |
|---|---|---|---|
| iPhone Duo (outer) | compact | — | — |
| iPhone Duo (inner) | — | expanded | expanded + 1 fold |
| Samsung Z Fold 6/7/8 | compact | medium | medium + 1 fold |
| Samsung Z TriFold (cover) | compact | — | — |
| Samsung Z TriFold (one hinge) | — | medium | medium + 1 fold |
| Samsung Z TriFold (fully open) | — | expanded | expanded + 2 folds |
| Samsung Z Flip 6/7 (cover) | compact | — | — |
| Samsung Z Flip 6/7 (inner) | — | compact | compact + 1 horizontal fold |
| Google Pixel Fold (original) | compact | expanded (landscape natural) | expanded + 1 fold |
| Google Pixel 9/10 Pro Fold | compact | medium | medium + 1 fold |
| Huawei Mate X6/X7 | compact | medium | medium + 1 fold |
| Huawei Pura X / Pura X Max | compact | expanded (passport-wide) | expanded + 1 fold |
| Huawei Mate XT / XT2 (fully open) | — | expanded | expanded + 2 folds |
| Honor Magic V3/V5/V6 | compact | medium | medium + 1 fold |
| Xiaomi Mix Fold 3/4 | compact | medium | medium + 1 fold |
| Xiaomi 18 Fold | compact | expanded (passport-wide) | expanded + 1 fold |
| Vivo X Fold 3/5 | compact | medium | medium + 1 fold |
| Motorola Razr 70 / Ultra | compact | compact | compact + 1 horizontal fold |
| OPPO / OnePlus Find N series | compact | medium | medium + 1 fold |

## Test emulators / simulators

Android Studio ships virtual devices for:
- Foldable (generic 7.6" — behaves like Z Fold)
- Pixel Fold (original)
- Pixel 9 Pro Fold
- 7.6" Fold-In (Samsung reference)

For devices not in AVD Manager (Honor, Xiaomi), use the generic
Foldable AVD with size overrides matching the tables above.

Samsung Galaxy Z TriFold is not yet in AVD Manager as of writing.
Test tri-fold behavior on generic Foldable AVD with manual
window resize, or wait for Samsung's remote test lab availability.

## Anti-pattern list — Android foldable specific

Merge with iPhone Duo skill's anti-pattern table for the
complete cross-platform picture:

| Pattern | Why it breaks | Instead |
|---|---|---|
| `Configuration.orientation == LANDSCAPE` for layout | Pixel Fold opens landscape-natural, so this is true for the *inner* display too | Size class + measured window |
| `Display.getRealSize()` | Doesn't reflect multi-window state | `WindowMetricsCalculator.computeCurrentWindowMetrics(activity)` |
| Assuming `rotation_0 = portrait` | False on original Pixel Fold | Query `WindowInfoTracker` for actual layout |
| One `FoldingFeature` assumption | Tri-folds report multiple | Handle `displayFeatures.filterIsInstance<FoldingFeature>()` as a list |
| Model check via `Build.MODEL` for foldable detection | Fragile across Chinese vendors, tri-folds; misses future devices | `Sensor.TYPE_HINGE_ANGLE` presence + `WindowInfoTracker` feature emission |
| Reading `Configuration.screenWidthDp` and caching | Doesn't reflect fold state changes | Subscribe to `WindowInfoTracker` flow |
| Compose `LocalConfiguration.current.screenWidthDp` in an object outside a composable | Same problem — cached at composition time only in the composable scope | Use `currentWindowAdaptiveInfoV2()` or the WindowInfoTracker directly |
| Placing controls across `FoldingFeature.bounds` when `isSeparating` is true | Hard to reach; on Duo would sit under the vertical bar | Route content around; use fold as natural separator |
| Ignoring `occlusionType.FULL` when drawing full-bleed content | Content vanishes into the hinge | Query `occlusionType`; draw around FULL, draw through NONE |

## References

- [Google: WindowSizeClass reference](https://developer.android.com/reference/kotlin/androidx/window/core/layout/WindowSizeClass)
- [Google: Make your app fold-aware](https://developer.android.com/develop/adaptive-apps/guides/foldables/make-your-app-fold-aware)
- [Google: Support tri-folds and landscape foldables](https://developer.android.com/develop/adaptive-apps/guides/foldables/trifolds-and-landscape-foldables)
- [Samsung Foldable developer docs](https://developer.samsung.com/galaxy-z/foldable-experience)
- [Samsung Z TriFold specs](https://www.samsung.com/us/smartphones/galaxy-z-trifold/)

## Verification script for AVD testing

```bash
# List all foldable AVDs
$ANDROID_HOME/emulator/emulator -list-avds | grep -i fold

# Boot Pixel 9 Pro Fold
$ANDROID_HOME/emulator/emulator -avd Pixel_9_Pro_Fold

# Change fold state via ADB:
adb emu fold                # trigger fold
adb emu unfold              # trigger unfold

# Check window state
adb shell dumpsys window displays | head -30

# Check current WindowLayoutInfo (requires app running with WindowInfoTracker)
adb logcat -s WindowInfoTracker HingeObserver
```

Test matrix: each device × {folded, unfolded, half-open (where
supported), rotated 90°, split-screen}. That's 3-5 poses per
device × ~10 devices in the wild = 30-50 test cases. Not all
need to be tested manually — pick 3-4 representative devices
per family and verify Hinge reports the values in the table
above.
