import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { craft, font, spacing, stamp, typeScale, usePalette } from '@/lib/theme';

/**
 * The apps' signature texture: a jaali (carved lattice) of small rangoli flowers, drawn
 * as thin lines so it sits quietly behind headers and banners.
 */
export function Jaali({
  color = craft.saffron[500],
  opacity = 0.16,
  size = 44,
  style,
}: {
  color?: string;
  opacity?: number;
  size?: number;
  style?: ViewStyle;
}) {
  const h = size / 2;
  const petal = size * 0.22;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="jaali" width={size} height={size} patternUnits="userSpaceOnUse">
            <G stroke={color} strokeWidth={1.2} fill="none" opacity={opacity}>
              {/* Four-petal flower in the centre of each tile. */}
              <Path
                d={`M${h} ${h - petal} Q${h + petal * 0.7} ${h} ${h} ${h + petal} Q${h - petal * 0.7} ${h} ${h} ${h - petal} Z`}
              />
              <Path
                d={`M${h - petal} ${h} Q${h} ${h - petal * 0.7} ${h + petal} ${h} Q${h} ${h + petal * 0.7} ${h - petal} ${h} Z`}
              />
              {/* Lattice diamonds joining the tiles. */}
              <Path d={`M0 ${h} L${h} 0 L${size} ${h} L${h} ${size} Z`} />
            </G>
            <Circle cx={h} cy={h} r={1.6} fill={color} opacity={opacity * 2} />
            <Circle cx={0} cy={0} r={1.4} fill={color} opacity={opacity * 2} />
            <Circle cx={size} cy={size} r={1.4} fill={color} opacity={opacity * 2} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#jaali)" />
      </Svg>
    </View>
  );
}

/** A kolam-style divider: a line of dots with a small flower in the middle. */
export function Kolam({ color }: { color?: string }) {
  const c = usePalette();
  const ink = color ?? c.accent;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      <Svg width={180} height={16} viewBox="0 0 180 16">
        {[10, 26, 42, 58, 122, 138, 154, 170].map((x) => (
          <Circle key={x} cx={x} cy={8} r={1.8} fill={ink} opacity={0.55} />
        ))}
        <G stroke={ink} strokeWidth={1.5} fill="none">
          <Path d="M90 1 Q96 8 90 15 Q84 8 90 1 Z" />
          <Path d="M83 8 Q90 2 97 8 Q90 14 83 8 Z" />
        </G>
        <Circle cx={90} cy={8} r={1.8} fill={c.highlight} />
      </Svg>
    </View>
  );
}

/** A torana-like scalloped edge, used under the home header. */
export function Scallop({ color, height = 14 }: { color: string; height?: number }) {
  const w = 24;
  const n = 16;
  const d = Array.from(
    { length: n },
    (_, i) => `Q${i * w + w / 2} ${height * 2} ${(i + 1) * w} 0`,
  ).join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${n * w} ${height}`} preserveAspectRatio="none">
      <Path d={`M0 0 ${d} Z`} fill={color} />
    </Svg>
  );
}

/** An indigo hero card with the jaali texture: dashboards and profile headers. */
export function CraftHeader({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <View
      style={[
        stamp,
        {
          borderRadius: 26,
          backgroundColor: craft.indigo[800],
          padding: spacing[5],
          gap: spacing[2],
          overflow: 'hidden',
        },
      ]}
    >
      <View
        style={{
          position: 'absolute',
          right: -40,
          top: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: craft.saffron[500],
          opacity: 0.22,
        }}
      />
      {eyebrow ? (
        <Text
          style={[
            typeScale.xs,
            { color: craft.saffron[300], fontFamily: font.semibold, letterSpacing: 1.4 },
          ]}
        >
          {eyebrow.toUpperCase()}
        </Text>
      ) : null}
      <Text style={[typeScale['2xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
        {title}
      </Text>
      {body ? (
        <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}>
          {body}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const STEPS = ['hired', 'scheduled', 'in_progress', 'completed', 'closed'] as const;
const STEP_ICON = {
  hired: 'people',
  scheduled: 'calendar',
  in_progress: 'construct',
  completed: 'checkmark-done',
  closed: 'ribbon',
} as const;

/**
 * Where a job is, as five beads on a thread: done steps filled in terracotta, the current
 * one ringed in saffron. Cancelled and disputed jobs show their state instead.
 */
export function JobProgress({
  state,
  labels,
}: {
  state: string;
  labels: Record<(typeof STEPS)[number], string>;
}) {
  const c = usePalette();
  const at = STEPS.indexOf(state as (typeof STEPS)[number]);
  if (at < 0) return null;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={labels[STEPS[at]!]}
      accessibilityValue={{ min: 1, max: STEPS.length, now: at + 1 }}
      style={{ flexDirection: 'row', alignItems: 'flex-start', paddingTop: spacing[1] }}
    >
      {STEPS.map((s, i) => {
        const done = i < at || state === 'closed';
        const current = i === at && state !== 'closed';
        return (
          <View key={s} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: i === 0 ? 'transparent' : i <= at ? c.accent : c.border,
                }}
              />
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: done || current ? c.accent : c.surfaceMuted,
                  borderWidth: current ? 3 : 0,
                  borderColor: c.highlight,
                }}
              >
                <Ionicons
                  name={done ? 'checkmark' : (STEP_ICON[s] as 'calendar')}
                  size={15}
                  color={done || current ? '#fff' : c.textMuted}
                />
              </View>
              <View
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor:
                    i === STEPS.length - 1 ? 'transparent' : i < at ? c.accent : c.border,
                }}
              />
            </View>
            <Text
              numberOfLines={2}
              style={[
                typeScale.xs,
                {
                  textAlign: 'center',
                  color: current ? c.text : c.textMuted,
                  fontFamily: current ? font.semibold : font.body,
                },
              ]}
            >
              {labels[s]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
