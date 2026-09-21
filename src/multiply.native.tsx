import { NitroModules } from 'react-native-nitro-modules';
import type { NitroHinge } from './NitroHinge.nitro';

const NitroHingeHybridObject =
  NitroModules.createHybridObject<NitroHinge>('NitroHinge');

export function multiply(a: number, b: number): number {
  return NitroHingeHybridObject.multiply(a, b);
}
