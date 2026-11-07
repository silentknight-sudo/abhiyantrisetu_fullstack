import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { craft, usePalette } from '@/lib/theme';

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
