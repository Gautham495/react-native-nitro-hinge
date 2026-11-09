---
"react-native-nitro-hinge": patch
---

pr: #7
Android now reads the hinge angle sensor, so `hinge.hingeAngle` reports the angle there. It always returned `undefined` before.
