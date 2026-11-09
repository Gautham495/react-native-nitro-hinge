import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { font, radius, space } from 'react-native-nitro-hinge';
import {
  useAnimatedHinge,
  useAnimatedHingeAngle,
} from 'react-native-nitro-hinge/reanimated';

const MAP_SIZE = 120;

export function AnimatedDemo() {
  const angle = useAnimatedHingeAngle();
  const state = useAnimatedHinge();
  const [blocked, setBlocked] = useState(false);

  // These follow the hinge on the UI thread, even while JS is blocked.
  const lid = useAnimatedStyle(() => ({
    transform: [{ rotate: `${180 - (angle.value ?? 180)}deg` }],
  }));
  const meter = useAnimatedStyle(() => ({
    width: `${((angle.value ?? 180) / 180) * 100}%`,
  }));
  const map = useAnimatedStyle(() => {
    const { windowWidth, windowHeight } = state.value;
    const scale = MAP_SIZE / Math.max(windowWidth, windowHeight, 1);
    return {
      width: withTiming(windowWidth * scale),
      height: withTiming(windowHeight * scale),
    };
  });
  const crease = useAnimatedStyle(() => {
    const { windowWidth, windowHeight, foldFeatures } = state.value;
    const fold = foldFeatures[0];
    if (!fold) return { opacity: 0 };
    const scale = MAP_SIZE / Math.max(windowWidth, windowHeight, 1);
    return {
      opacity: 1,
      left: fold.bounds.x * scale,
      top: fold.bounds.y * scale,
      width: Math.max(fold.bounds.width * scale, 2),
      height: Math.max(fold.bounds.height * scale, 2),
    };
  });

  // Blocks the JS thread, to show the animations don't depend on it.
  const blockJs = () => {
    setBlocked(true);
    setTimeout(() => {
      const end = Date.now() + 5000;
      while (Date.now() < end) {
        // busy wait
      }
      setBlocked(false);
    }, 50);
  };

  return (
    <View
      testID="animated-demo"
      style={{
        marginTop: space(24),
        padding: space(12),
        gap: space(12),
        borderRadius: radius(8),
        backgroundColor: 'white',
      }}
    >
      <Text style={{ fontSize: font(16), fontWeight: '600' }}>Reanimated</Text>

      <View style={{ height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' }}>
        <Animated.View
          style={[
            { height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
            meter,
          ]}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: space(16) }}>
        <View
          style={{
            width: MAP_SIZE,
            height: MAP_SIZE,
            justifyContent: 'center',
          }}
        >
          <View style={{ flexDirection: 'row' }}>
            <Animated.View
              style={[
                {
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#1e293b',
                  transformOrigin: 'right',
                },
                lid,
              ]}
            />
            <View
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#94a3b8',
              }}
            />
          </View>
        </View>

        <View
          style={{
            width: MAP_SIZE,
            height: MAP_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View
            style={[
              { borderWidth: 1, borderColor: '#334155', borderRadius: 4 },
              map,
            ]}
          >
            <Animated.View
              style={[
                { position: 'absolute', backgroundColor: '#f59e0b' },
                crease,
              ]}
            />
          </Animated.View>
        </View>
      </View>

      <Pressable
        testID="block-js"
        onPress={blockJs}
        style={{
          padding: space(10),
          borderRadius: radius(6),
          backgroundColor: blocked ? '#dc2626' : '#0f172a',
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          {blocked
            ? 'JS thread blocked for 5 s'
            : 'Block the JS thread for 5 s'}
        </Text>
      </Pressable>
    </View>
  );
}
