---
"react-native-nitro-hinge": minor
---

Add `hinge.addHingeAngleListener`. It calls back with the hinge angle in degrees on every change, or with `undefined` when an iOS window moves somewhere without a hinge. Angle changes don't fire `addChangeListener`, so layout listeners don't run while the hinge moves.
