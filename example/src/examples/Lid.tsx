import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useAnimatedHingeAngle } from 'react-native-nitro-hinge/reanimated';

export function Lid() {
  const angle = useAnimatedHingeAngle();

  // 180° lies flat, 90° stands up, 0° closes on the base.
  const lid = useAnimatedStyle(() => ({
    transform: [{ rotate: `${180 - (angle.value ?? 180)}deg` }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        <Animated.View
          style={[
            {
              width: 140,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#2563eb',
              transformOrigin: 'right',
            },
            lid,
          ]}
        />
        <View
          style={{
            width: 140,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#94a3b8',
          }}
        />
      </View>
    </View>
  );
}
