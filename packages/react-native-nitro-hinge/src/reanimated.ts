import { useEffect } from 'react';
import { NitroModules } from 'react-native-nitro-modules';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { isWorkletFunction, scheduleOnUI } from 'react-native-worklets';

import type { ChangeSubscription, HingeState } from './Hinge.nitro';
import { hinge } from './index';

type Listener<T> = (value: T) => void;

type UIRuntimeGlobal = typeof globalThis & {
  __nitroHingeSubscriptions?: Record<string, ChangeSubscription>;
};

const boxedHinge = NitroModules.box(hinge);

// A JS reload may keep the UI runtime alive, so each bundle prefixes its keys.
const keyPrefix = Math.random().toString(36).slice(2);
let nextKey = 0;

function subscriptions(): Record<string, ChangeSubscription> {
  'worklet';
  const runtime = globalThis as UIRuntimeGlobal;
  runtime.__nitroHingeSubscriptions ??= {};
  return runtime.__nitroHingeSubscriptions;
}

function subscribeToStateOnUI(key: string, worklet: Listener<HingeState>) {
  'worklet';
  const native = boxedHinge.unbox();
  subscriptions()[key] = native.addChangeListener(worklet);
  worklet(native.getState());
}

function subscribeToAngleOnUI(
  key: string,
  worklet: Listener<number | undefined>
) {
  'worklet';
  const native = boxedHinge.unbox();
  subscriptions()[key] = native.addHingeAngleListener(worklet);
  worklet(native.hingeAngle);
}

function unsubscribeOnUI(key: string) {
  'worklet';
  const all = subscriptions();
  all[key]?.remove();
  delete all[key];
}

function addWorkletListener<T>(
  worklet: Listener<T>,
  subscribeOnUI: (key: string, worklet: Listener<T>) => void
): ChangeSubscription {
  if (!isWorkletFunction(worklet)) {
    throw new Error(
      "The hinge listener needs to be a worklet. Make 'worklet' the first statement of the function."
    );
  }
  const key = `${keyPrefix}:${nextKey++}`;
  scheduleOnUI(subscribeOnUI, key, worklet);

  let removed = false;
  return {
    remove: () => {
      if (removed) return;
      removed = true;
      scheduleOnUI(unsubscribeOnUI, key);
    },
  };
}

/**
 * Subscribes a worklet to hinge state changes. The worklet runs on the UI
 * thread and keeps running while the JS thread is busy. It also runs once
 * with the current state right after subscribing, which
 * `hinge.addChangeListener` doesn't do. Throws if `worklet` isn't a worklet.
 */
export function addHingeWorkletListener(
  worklet: (state: HingeState) => void
): ChangeSubscription {
  return addWorkletListener(worklet, subscribeToStateOnUI);
}

/**
 * Like `addHingeWorkletListener`, but for the hinge angle in degrees. The
 * angle is undefined when the device has no hinge sensor or the window has
 * no hinge.
 */
export function addHingeAngleWorkletListener(
  worklet: (angle: number | undefined) => void
): ChangeSubscription {
  return addWorkletListener(worklet, subscribeToAngleOnUI);
}

/**
 * Shared value with the current hinge state. The UI thread updates it
 * without going through the JS thread, so animations that read it follow
 * folds, rotation and resizes even while JS is busy.
 *
 *   const state = useAnimatedHinge();
 *   const style = useAnimatedStyle(() => ({
 *     width: state.value.windowWidth / 2,
 *   }));
 */
export function useAnimatedHinge(): SharedValue<HingeState> {
  const state = useSharedValue(() => hinge.getState());

  useEffect(() => {
    const subscription = addHingeWorkletListener((next) => {
      'worklet';
      state.set(next);
    });
    return () => subscription.remove();
  }, [state]);

  return state;
}

/**
 * Shared value with the hinge angle in degrees. The UI thread updates it as
 * the hinge moves. It's undefined when there's no hinge. Use it for
 * animations only; layout should follow `foldFeatures`.
 *
 *   const angle = useAnimatedHingeAngle();
 *   const style = useAnimatedStyle(() => ({
 *     transform: [{ rotate: `${180 - (angle.value ?? 180)}deg` }],
 *   }));
 */
export function useAnimatedHingeAngle(): SharedValue<number | undefined> {
  const angle = useSharedValue<number | undefined>(() => hinge.hingeAngle);

  useEffect(() => {
    const subscription = addHingeAngleWorkletListener((next) => {
      'worklet';
      angle.set(next);
    });
    return () => subscription.remove();
  }, [angle]);

  return angle;
}
