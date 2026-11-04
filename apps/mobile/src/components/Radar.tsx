import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** Pulsing rings shown while Setu looks for professionals near the customer. */
export function Radar({ title, body }: { title: string; body: string }) {
  const c = usePalette();
  const pulses = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = pulses.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 700),
          Animated.timing(v, {
            toValue: 1,
            duration: 2100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [pulses]);

  return (
    <View
      style={{
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[6],
        borderRadius: 24,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        {pulses.map((v, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 160,
              height: 160,
              borderRadius: 80,
              borderWidth: 2,
              borderColor: c.accent,
              opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
              transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
            }}
          />
        ))}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="location" size={26} color={c.accent} />
        </View>
      </View>
      <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>{title}</Text>
      <Text
        style={[
          typeScale.sm,
          {
            color: c.textMuted,
            fontFamily: font.body,
            textAlign: 'center',
            paddingHorizontal: spacing[5],
          },
        ]}
      >
        {body}
      </Text>
    </View>
  );
}
