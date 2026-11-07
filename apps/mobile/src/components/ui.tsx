import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { font, radius, shadow, spacing, stamp, typeScale, usePalette } from '@/lib/theme';
import { Jaali } from './craft';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/** Explicit fill size: absoluteFill alone leaves a web Image at its natural height. */
export const fill = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
} as const;

export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ['bottom'],
  padded = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
  /** false lets a full-bleed banner touch the screen edges; wrap the rest in <Padded>. */
  padded?: boolean;
}) {
  const c = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={edges}>
      <ScrollView
        contentContainerStyle={{
          padding: padded ? spacing[4] : 0,
          gap: spacing[4],
          paddingBottom: spacing[12],
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Padded({ children }: { children: ReactNode }) {
  return <View style={{ paddingHorizontal: spacing[4], gap: spacing[4] }}>{children}</View>;
}

export function Heading({
  children,
  size = '3xl',
  color,
}: {
  children: ReactNode;
  size?: '2xl' | '3xl' | '4xl';
  color?: string;
}) {
  const c = usePalette();
  return (
    <Text
      style={[
        typeScale[size],
        { color: color ?? c.text, fontFamily: font.headingHeavy, letterSpacing: -0.6 },
      ]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

export function Title({ children, color }: { children: ReactNode; color?: string }) {
  const c = usePalette();
  return (
    <Text style={[typeScale.lg, { color: color ?? c.text, fontFamily: font.heading }]}>
      {children}
    </Text>
  );
}

/** A small uppercase label above a section or inside a banner. */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const c = usePalette();
  return (
    <Text
      style={[
        typeScale.xs,
        { color: color ?? c.accentHover, fontFamily: font.semibold, letterSpacing: 1.6 },
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: object;
}) {
  const c = usePalette();
  return (
    <Text
      style={[
        typeScale.base,
        { color: muted ? c.textMuted : c.text, fontFamily: font.body },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Small({ children, muted = true }: { children: ReactNode; muted?: boolean }) {
  const c = usePalette();
  return (
    <Text style={[typeScale.sm, { color: muted ? c.textMuted : c.text, fontFamily: font.body }]}>
      {children}
    </Text>
  );
}

type ButtonKind = 'primary' | 'accent' | 'outline' | 'danger';

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  testID,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: IconName;
}) {
  const c = usePalette();
  const bg = { primary: c.primary, accent: c.accent, outline: c.surface, danger: c.danger }[kind];
  const fg = { primary: c.onPrimary, accent: c.onAccent, outline: c.text, danger: '#fff' }[kind];
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'outline' ? c.border : bg },
        kind === 'accent' || kind === 'primary' ? stamp : null,
        { opacity: off ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; error?: string | null; hint?: string }) {
  const c = usePalette();
  return (
    <View style={{ gap: spacing[1] + 2 }}>
      <Text style={[typeScale.sm, { color: c.text, fontFamily: font.semibold }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textMuted}
        accessibilityLabel={label}
        {...input}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
          input.multiline && { minHeight: 104, textAlignVertical: 'top' },
        ]}
      />
      {error ? <Text style={[typeScale.sm, { color: c.danger }]}>{error}</Text> : null}
      {!error && hint ? <Small>{hint}</Small> : null}
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  accent,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Colour of a thin status stripe down the card's left edge. */
  accent?: string;
}) {
  const c = usePalette();
  const box = [
    styles.card,
    shadow,
    { backgroundColor: c.surface, borderColor: c.border },
    accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
    style,
  ];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [box, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {children}
    </Pressable>
  );
}

/** A round tinted icon, used on tiles, list rows and empty states. */
export function IconBadge({
  name,
  size = 44,
  tone = 'navy',
}: {
  name: IconName;
  size?: number;
  tone?: 'navy' | 'orange' | 'light';
}) {
  const c = usePalette();
  const [bg, fg] = {
    navy: [c.primary, c.onPrimary],
    orange: [c.accent, c.onAccent],
    light: [c.surfaceMuted, c.primary],
  }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size * 0.5} color={fg} />
    </View>
  );
}

/** A square service tile for 2-column grids. */
export function Tile({
  icon,
  title,
  caption,
  onPress,
  tone = 'navy',
  testID,
}: {
  icon: IconName;
  title: string;
  caption?: string;
  onPress: () => void;
  tone?: 'navy' | 'orange';
  testID?: string;
}) {
  const c = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        shadow,
        { backgroundColor: c.surface, borderColor: c.border },
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <IconBadge name={icon} tone={tone} />
      <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>{title}</Text>
      {caption ? (
        <Text
          numberOfLines={2}
          style={[typeScale.xs, { color: c.textMuted, fontFamily: font.body }]}
        >
          {caption}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>{children}</View>
  );
}

/** A section heading with an optional link on the right. */
export function Section({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const c = usePalette();
  return (
    <Row style={{ marginTop: spacing[2] }}>
      <Text style={[typeScale.xl, { color: c.text, fontFamily: font.heading }]}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8}>
          <Text style={[typeScale.sm, { color: c.accentHover, fontFamily: font.semibold }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </Row>
  );
}

/**
 * A photo banner with a navy gradient for legible text, an eyebrow, a title and an
 * optional call to action.
 */
export function Banner({
  image,
  eyebrow,
  title,
  body,
  cta,
  onPress,
  height = 190,
  rounded = true,
}: {
  image: ImageSourcePropType;
  eyebrow?: string;
  title: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
  height?: number;
  rounded?: boolean;
}) {
  const c = usePalette();
  const inner = (
    <View style={{ height, borderRadius: rounded ? 24 : 0, overflow: 'hidden' }}>
      <Image source={image} resizeMode="cover" style={fill} />
      <LinearGradient
        colors={['rgba(20,18,58,0.94)', 'rgba(20,18,58,0.6)', 'rgba(20,18,58,0.05)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Jaali opacity={0.12} style={{ right: '45%' }} />
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: spacing[5], gap: spacing[1] }}>
        {eyebrow ? <Eyebrow color={c.accent}>{eyebrow}</Eyebrow> : null}
        <Text
          style={[
            typeScale['2xl'],
            { color: '#fff', fontFamily: font.headingHeavy, maxWidth: '75%', letterSpacing: -0.4 },
          ]}
        >
          {title}
        </Text>
        {body ? (
          <Text
            style={[typeScale.sm, { color: 'rgba(255,255,255,0.85)', maxWidth: '70%' }]}
            numberOfLines={2}
          >
            {body}
          </Text>
        ) : null}
        {cta ? (
          <View style={[styles.bannerCta, { backgroundColor: c.accent }]}>
            <Text style={[typeScale.sm, { color: c.onAccent, fontFamily: font.semibold }]}>
              {cta}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={c.onAccent} />
          </View>
        ) : null}
      </View>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {inner}
    </Pressable>
  );
}

/** A row of small reassurance points with icons. */
export function TrustRow({ items }: { items: [IconName, string][] }) {
  const c = usePalette();
  return (
    <View style={[styles.trust, { backgroundColor: c.surfaceMuted }]}>
      {items.map(([icon, label]) => (
        <View key={label} style={{ flex: 1, alignItems: 'center', gap: spacing[1] }}>
          <Ionicons name={icon} size={20} color={c.primary} />
          <Text
            style={[typeScale.xs, { color: c.text, fontFamily: font.medium, textAlign: 'center' }]}
          >
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Initials in a circle, for people and businesses. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const c = usePalette();
  const initials = name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.accent,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials ? (
        <Text style={{ color: c.onAccent, fontFamily: font.headingHeavy, fontSize: size * 0.38 }}>
          {initials}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={c.onAccent} />
      )}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(selected) }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? c.primary : c.surface,
        },
      ]}
    >
      <Text
        style={[typeScale.sm, { color: selected ? c.onPrimary : c.text, fontFamily: font.medium }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>{children}</View>
  );
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function toneColor(tone: Tone, c: ReturnType<typeof usePalette>) {
  return {
    neutral: c.textMuted,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    info: c.info,
  }[tone];
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const c = usePalette();
  const map = {
    neutral: [c.surfaceMuted, c.text],
    success: [c.successBg, c.success],
    warning: [c.warningBg, c.text],
    danger: [c.dangerBg, c.danger],
    info: [c.infoBg, c.info],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: toneColor(tone, c) }} />
      <Text style={[typeScale.xs, { color: fg, fontFamily: font.semibold }]}>{label}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[2],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Notice({
  children,
  tone = 'danger',
}: {
  children: ReactNode;
  tone?: 'danger' | 'info' | 'success';
}) {
  const c = usePalette();
  const [bg, fg, icon] = {
    danger: [c.dangerBg, c.danger, 'alert-circle'],
    info: [c.infoBg, c.info, 'information-circle'],
    success: [c.successBg, c.success, 'checkmark-circle'],
  }[tone] as [string, string, IconName];
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={[typeScale.sm, { color: fg, flex: 1, fontFamily: font.medium }]}>
        {children}
      </Text>
    </View>
  );
}

export function Loading() {
  const c = usePalette();
  return (
    <View style={{ padding: spacing[8], alignItems: 'center' }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

export function Empty({
  title,
  body,
  action,
  icon = 'sparkles-outline',
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing[8], gap: spacing[3] }}>
      <IconBadge name={icon} size={56} tone="light" />
      <Title>{title}</Title>
      {body ? (
        <Body muted style={{ textAlign: 'center' }}>
          {body}
        </Body>
      ) : null}
      {action ? (
        <View style={{ marginTop: spacing[2], alignSelf: 'stretch' }}>{action}</View>
      ) : null}
    </Card>
  );
}

export function Divider() {
  const c = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
  buttonText: { ...typeScale.base, fontFamily: font.semibold },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontFamily: font.body,
    ...typeScale.base,
  },
  card: { borderWidth: 1.5, borderRadius: 22, padding: spacing[4], gap: spacing[2] },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 22,
    padding: spacing[4],
    gap: spacing[2],
    minHeight: 150,
  },
  bannerCta: {
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  trust: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    gap: spacing[2],
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 40,
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    borderRadius: 14,
    padding: spacing[3],
  },
});

/** A small figure with a label, for dashboard rows. */
export function Stat({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: IconName;
  onPress?: () => void;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        shadow,
        {
          flex: 1,
          gap: 4,
          borderRadius: 18,
          padding: spacing[3],
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={c.accentHover} />
      <Text style={[typeScale.lg, { color: c.text, fontFamily: font.headingHeavy }]}>{value}</Text>
      <Text style={[typeScale.xs, { color: c.textMuted, fontFamily: font.medium }]}>{label}</Text>
    </Pressable>
  );
}

/** A tappable settings-style row with an icon and a chevron. */
export function MenuRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[3],
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <IconBadge name={icon} size={36} tone="light" />
      <Text style={[typeScale.base, { flex: 1, color: c.text, fontFamily: font.medium }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}
