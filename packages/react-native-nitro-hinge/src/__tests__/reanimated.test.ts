import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import type { HingeState } from '../Hinge.nitro';
import {
  addHingeAngleWorkletListener,
  addHingeWorkletListener,
  useAnimatedHinge,
  useAnimatedHingeAngle,
} from '../reanimated';

const mockStateListeners = new Set<(state: HingeState) => void>();
const mockAngleListeners = new Set<(angle: number | undefined) => void>();
const mockPlainFunctions = new WeakSet<object>();
let mockState: HingeState;
let mockAngle: number | undefined;

jest.mock('react-native-nitro-modules', () => {
  const native = {
    getState: () => mockState,
    get hingeAngle() {
      return mockAngle;
    },
    addChangeListener: (callback: (state: HingeState) => void) => {
      mockStateListeners.add(callback);
      return { remove: () => mockStateListeners.delete(callback) };
    },
    addHingeAngleListener: (callback: (angle: number | undefined) => void) => {
      mockAngleListeners.add(callback);
      return { remove: () => mockAngleListeners.delete(callback) };
    },
  };
  return {
    NitroModules: {
      createHybridObject: () => native,
      box: (object: unknown) => ({ unbox: () => object }),
    },
  };
});

// The worklets Babel plugin doesn't run in Jest, so every function counts as
// a worklet unless a test marks it as plain.
jest.mock('react-native-worklets', () => ({
  scheduleOnUI: (
    worklet: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ) => worklet(...args),
  isWorkletFunction: (value: unknown) =>
    typeof value === 'function' && !mockPlainFunctions.has(value),
}));

jest.mock('react-native-reanimated', () => {
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    useSharedValue: <T>(initial: T | (() => T)) => {
      const ref = useRef<{ value: T; set: (next: T) => void } | null>(null);
      if (ref.current === null) {
        const shared = {
          value: initial instanceof Function ? initial() : initial,
          set: (next: T) => {
            shared.value = next;
          },
        };
        ref.current = shared;
      }
      return ref.current;
    },
  };
});

function makeState(overrides: Partial<HingeState> = {}): HingeState {
  return {
    widthClass: 'compact',
    heightClass: 'medium',
    windowWidth: 390,
    windowHeight: 844,
    safeInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    foldFeatures: [],
    fontScale: 1,
    ...overrides,
  };
}

function emitState(state: HingeState) {
  mockState = state;
  mockStateListeners.forEach((listener) => listener(state));
}

function emitAngle(angle: number | undefined) {
  mockAngle = angle;
  mockAngleListeners.forEach((listener) => listener(angle));
}

beforeEach(() => {
  mockState = makeState();
  mockAngle = 180;
  mockStateListeners.clear();
  mockAngleListeners.clear();
});

describe('addHingeWorkletListener', () => {
  it('runs with the current state, then on every change', () => {
    const seen: number[] = [];
    addHingeWorkletListener((state) => seen.push(state.windowWidth));

    emitState(makeState({ windowWidth: 673 }));

    expect(seen).toEqual([390, 673]);
  });

  it('stops after remove, and a second remove does nothing', () => {
    const seen: number[] = [];
    const subscription = addHingeWorkletListener((state) =>
      seen.push(state.windowWidth)
    );

    subscription.remove();
    subscription.remove();
    emitState(makeState({ windowWidth: 673 }));

    expect(mockStateListeners.size).toBe(0);
    expect(seen).toEqual([390]);
  });

  it('throws for a function that is not a worklet', () => {
    const plain = () => {};
    mockPlainFunctions.add(plain);

    expect(() => addHingeWorkletListener(plain)).toThrow(/worklet/);
    expect(mockStateListeners.size).toBe(0);
  });
});

describe('addHingeAngleWorkletListener', () => {
  it('runs with the current angle, then on every change', () => {
    const seen: (number | undefined)[] = [];
    const subscription = addHingeAngleWorkletListener((angle) =>
      seen.push(angle)
    );

    emitAngle(92);
    emitAngle(undefined);
    subscription.remove();
    emitAngle(45);

    expect(seen).toEqual([180, 92, undefined]);
  });
});

describe('useAnimatedHinge', () => {
  it('starts from the current state and follows changes', async () => {
    const { result, unmount } = await renderHook(() => useAnimatedHinge());
    expect(result.current.value).toEqual(makeState());

    const unfolded = makeState({ widthClass: 'medium', windowWidth: 673 });
    await act(() => emitState(unfolded));
    expect(result.current.value).toEqual(unfolded);

    await unmount();
    expect(mockStateListeners.size).toBe(0);
  });
});

describe('useAnimatedHingeAngle', () => {
  it('starts from the current angle and follows changes', async () => {
    mockAngle = 134;
    const { result, unmount } = await renderHook(() => useAnimatedHingeAngle());
    expect(result.current.value).toBe(134);

    await act(() => emitAngle(90));
    expect(result.current.value).toBe(90);

    await act(() => emitAngle(undefined));
    expect(result.current.value).toBeUndefined();

    await unmount();
    expect(mockAngleListeners.size).toBe(0);
  });
});
