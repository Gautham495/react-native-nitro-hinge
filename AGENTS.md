# AGENTS.md

## Commands

- Run `pnpm typecheck`, `pnpm lint` and `pnpm test` yourself before pushing. CI only builds the library and the example app and runs none of them.
- Install pods with `cd apps/example && bundle exec pod install --project-directory=ios`. A global `pod` can be a different CocoaPods version from the one the Gemfile resolves (1.15.2), and then it rewrites `Podfile.lock` and `project.pbxproj`.

## Dependencies

- The root `package.json` holds tooling only. In pnpm 12, every direct dependency of the root becomes a hoisting border under `hoistingLimits: workspaces`. That leaves extra copies of React at the root and breaks Jest with invalid hook calls. Add react, react-native and libraries to the workspace that uses them.
- A new workspace goes in `pnpm-workspace.yaml` and in the `workspaces` list of `apps/example/metro.config.js`.
- A new native source folder in the library needs an entry in the `turbo.json` inputs, or CI reuses a cached native build without it.

## Library API

- `src/index.ts` must not import `react-native-reanimated` or `react-native-worklets`. They are optional peers, used only by `src/reanimated.ts` (the `react-native-nitro-hinge/reanimated` entry).
- Keep the hinge angle out of `HingeState`. Android sends angle readings at `SENSOR_DELAY_GAME`, and they must not fire `addChangeListener` or re-render layouts.

## Docs

- `README.md`, `LICENSE` and `skills/` live at the root, and `prepack` copies them into the package. The copies under `packages/react-native-nitro-hinge/` are gitignored, so don't edit them.
- The README examples are pasted verbatim from `apps/example/src/examples/*.tsx`, and `skills/react-native-nitro-hinge/` repeats the API and the examples. When the API or an example changes, update all three.

## iOS

- If a Debug build fails to link Reanimated with missing `facebook::react::DebugStringConvertible` symbols, the Pods hold the Release flavor of the prebuilt React core and `Pods/React-Core-prebuilt/.last_build_configuration` is missing. Write `Release` into that file and rebuild, and the build script switches to the Debug flavor.
