# react-native-nitro-hinge

## 2.1.0

### Minor Changes

- [#7](https://github.com/Gautham495/react-native-nitro-hinge/pull/7) Thanks [@eduardoborges](https://github.com/eduardoborges)! - Add `hinge.addHingeAngleListener`. It calls back with the hinge angle in degrees on every change, or with `undefined` when an iOS window moves somewhere without a hinge. Angle changes don't fire `addChangeListener`, so layout listeners don't run while the hinge moves.

- [#8](https://github.com/Gautham495/react-native-nitro-hinge/pull/8) Thanks [@eduardoborges](https://github.com/eduardoborges)! - Add `react-native-nitro-hinge/reanimated` with `useAnimatedHinge()`, `useAnimatedHingeAngle()`, `addHingeWorkletListener` and `addHingeAngleWorkletListener`. The shared values update on the UI thread without going through JS. `react-native-reanimated` 4.4 or later and `react-native-worklets` 0.9 or later are optional peer dependencies, and the main entry doesn't import them.

### Patch Changes

- [#10](https://github.com/Gautham495/react-native-nitro-hinge/pull/10) Thanks [@eduardoborges](https://github.com/eduardoborges)! - Ship an agent skill for Claude Code and Codex. Install it with `npx skills add Gautham495/react-native-nitro-hinge`, or find it under `node_modules/react-native-nitro-hinge/skills`.

- [#7](https://github.com/Gautham495/react-native-nitro-hinge/pull/7) Thanks [@eduardoborges](https://github.com/eduardoborges)! - Android now reads the hinge angle sensor, so `hinge.hingeAngle` reports the angle there. It always returned `undefined` before.

- [#9](https://github.com/Gautham495/react-native-nitro-hinge/pull/9) Thanks [@eduardoborges](https://github.com/eduardoborges)! - Rewrite the README around four examples, each with a GIF and its code. The background material moved to `docs/foldables.md`.
