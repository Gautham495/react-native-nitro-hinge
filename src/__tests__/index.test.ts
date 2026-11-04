import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { PixelRatio } from 'react-native';
import type { FoldFeature, HingeState, WidthSizeClass } from '../Hinge.nitro';
import {
  configureHinge,
  contentHeight,
  contentWidth,
  font,
  hairline,
  hasActiveFold,
  icon,
  isBookPosture,
  isCompactWidth,
  isSeparating,
  isTabletopPosture,
  isTriFold,
  isWide,
  radius,
  responsive,
  size,
  space,
  useHinge,
} from '../index';

const mockListeners = new Set<(state: HingeState) => void>();
let mockState: HingeState;

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: () => ({
      get widthClass() {
        return mockState.widthClass;
      },
      get heightClass() {
        return mockState.heightClass;
      },
      get windowWidth() {
        return mockState.windowWidth;
      },
      get windowHeight() {
        return mockState.windowHeight;
      },
      get safeInsets() {
        return mockState.safeInsets;
      },
      get foldFeatures() {
        return mockState.foldFeatures;
      },
      get fontScale() {
        return mockState.fontScale;
      },
      getState: () => mockState,
      addChangeListener: (callback: (state: HingeState) => void) => {
        mockListeners.add(callback);
        return { remove: () => mockListeners.delete(callback) };
      },
    }),
  },
}));

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

function makeFold(overrides: Partial<FoldFeature> = {}): FoldFeature {
  return {
    bounds: { x: 0, y: 0, width: 0, height: 0 },
    orientation: 'vertical',
    state: 'flat',
    occlusionType: 'none',
    isSeparating: false,
    ...overrides,
  };
}

function emit(state: HingeState) {
  mockState = state;
  mockListeners.forEach((listener) => listener(state));
}

beforeEach(() => {
  mockState = makeState();
  mockListeners.clear();
  jest.spyOn(PixelRatio, 'get').mockReturnValue(1);
});

afterEach(() => {
  configureHinge({ baselineWidth: 390 });
  jest.restoreAllMocks();
});

describe('width helpers', () => {
  it.each<[WidthSizeClass, boolean, boolean]>([
    ['compact', true, false],
    ['medium', false, true],
    ['expanded', false, true],
  ])('%s: isCompactWidth=%s isWide=%s', (widthClass, compact, wide) => {
    mockState = makeState({ widthClass });
    expect(isCompactWidth()).toBe(compact);
    expect(isWide()).toBe(wide);
  });
});

describe('fold helpers', () => {
  it('reports no fold on a regular phone', () => {
    expect(hasActiveFold()).toBe(false);
    expect(isSeparating()).toBe(false);
    expect(isTriFold()).toBe(false);
    expect(isBookPosture()).toBe(false);
    expect(isTabletopPosture()).toBe(false);
  });

  it('detects book posture from a half-open vertical fold', () => {
    mockState = makeState({
      foldFeatures: [
        makeFold({ state: 'halfOpened', orientation: 'vertical' }),
      ],
    });
    expect(hasActiveFold()).toBe(true);
    expect(isBookPosture()).toBe(true);
    expect(isTabletopPosture()).toBe(false);
  });

  it('detects tabletop posture from a half-open horizontal fold', () => {
    mockState = makeState({
      foldFeatures: [
        makeFold({ state: 'halfOpened', orientation: 'horizontal' }),
      ],
    });
    expect(isTabletopPosture()).toBe(true);
    expect(isBookPosture()).toBe(false);
  });

  it('ignores posture for a flat fold', () => {
    mockState = makeState({ foldFeatures: [makeFold({ state: 'flat' })] });
    expect(hasActiveFold()).toBe(true);
    expect(isBookPosture()).toBe(false);
    expect(isTabletopPosture()).toBe(false);
  });

  it('is separating when any fold separates', () => {
    mockState = makeState({
      foldFeatures: [makeFold(), makeFold({ isSeparating: true })],
    });
    expect(isSeparating()).toBe(true);
    expect(isTriFold()).toBe(true);
  });
});

describe('content size', () => {
  it('subtracts each inset on its own', () => {
    mockState = makeState({
      windowWidth: 400,
      windowHeight: 800,
      safeInsets: { top: 20, right: 84, bottom: 10, left: 12 },
    });
    expect(contentWidth()).toBe(304);
    expect(contentHeight()).toBe(770);
  });
});

describe('sizing', () => {
  it.each<[WidthSizeClass, number, number, number]>([
    ['compact', 20, 48, 12],
    ['medium', 22, 51, 13],
    ['expanded', 23, 54, 13],
  ])('%s bumps font, size and radius', (widthClass, f, s, r) => {
    mockState = makeState({ widthClass });
    expect(font(20)).toBe(f);
    expect(size(48)).toBe(s);
    expect(icon(48)).toBe(s);
    expect(radius(12)).toBe(r);
  });

  it.each([
    [390, 16],
    [200, 14],
    [1200, 22],
  ])('space(16) at %dpt is %d', (windowWidth, expected) => {
    mockState = makeState({ windowWidth });
    expect(space(16)).toBe(expected);
  });

  it('scales space against the configured baseline', () => {
    configureHinge({ baselineWidth: 300 });
    expect(space(16)).toBe(21);
  });

  it('draws a hairline one physical pixel wide', () => {
    jest.spyOn(PixelRatio, 'get').mockReturnValue(3);
    expect(hairline()).toBeCloseTo(1 / 3);
    expect(hairline(2)).toBeCloseTo(2 / 3);
  });
});

describe('responsive', () => {
  it('picks the value for the current class', () => {
    mockState = makeState({ widthClass: 'medium' });
    expect(responsive({ compact: 1, medium: 2, expanded: 3 })).toBe(2);
  });

  it('falls back to smaller classes', () => {
    mockState = makeState({ widthClass: 'expanded' });
    expect(responsive({ compact: 1, medium: 2 })).toBe(2);
    expect(responsive({ compact: 1 })).toBe(1);
  });

  it('never falls back to larger classes', () => {
    expect(responsive({ medium: 2, expanded: 3 })).toBeUndefined();
  });
});

describe('useHinge', () => {
  it('starts from the current snapshot', async () => {
    const { result } = await renderHook(() => useHinge());
    expect(result.current).toEqual(makeState());
  });

  it('re-renders when native reports a change', async () => {
    const { result } = await renderHook(() => useHinge());
    const unfolded = makeState({ widthClass: 'medium', windowWidth: 673 });

    await act(() => emit(unfolded));

    expect(result.current).toEqual(unfolded);
  });

  it('removes its listener on unmount', async () => {
    const { unmount } = await renderHook(() => useHinge());
    expect(mockListeners.size).toBe(1);

    await unmount();

    expect(mockListeners.size).toBe(0);
  });
});
