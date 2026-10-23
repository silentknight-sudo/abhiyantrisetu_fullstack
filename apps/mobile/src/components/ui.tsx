import type { ReactNode } from 'react';
import {
  ActivityIndicator,
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
import { radius, serif, spacing, typeScale, usePalette } from '@/lib/theme';

export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ['bottom'],
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
}) {
  const c = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={edges}>
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[12] }}
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

export function Heading({
  children,
  size = '3xl',
}: {
  children: ReactNode;
  size?: '2xl' | '3xl' | '4xl';
}) {
  const c = usePalette();
  return (
    <Text
      style={[serif, typeScale[size], { color: c.text, fontWeight: '600' }]}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
}

export function Title({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={[typeScale.lg, { color: c.text, fontWeight: '600' }]}>{children}</Text>;
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
    <Text style={[typeScale.base, { color: muted ? c.textMuted : c.text }, style]}>{children}</Text>
  );
}

export function Small({ children, muted = true }: { children: ReactNode; muted?: boolean }) {
  const c = usePalette();
  return <Text style={[typeScale.sm, { color: muted ? c.textMuted : c.text }]}>{children}</Text>;
}

type ButtonKind = 'primary' | 'accent' | 'outline' | 'danger';

export function Button({
  title,
  onPress,
  kind = 'primary',
  loading,
  disabled,
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const c = usePalette();
  const bg = { primary: c.primary, accent: c.accent, outline: 'transparent', danger: c.danger }[
    kind
  ];
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
        { opacity: off ? 0.55 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
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
    <View style={{ gap: spacing[1] }}>
      <Text style={[typeScale.sm, { color: c.text, fontWeight: '600' }]}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textMuted}
        accessibilityLabel={label}
        {...input}
        style={[
          styles.input,
          { color: c.text, backgroundColor: c.surface, borderColor: error ? c.danger : c.border },
          input.multiline && { minHeight: 96, textAlignVertical: 'top' },
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
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const c = usePalette();
  const box = [styles.card, { backgroundColor: c.surface, borderColor: c.border }, style];
  if (!onPress) return <View style={box}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [box, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
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
      <Text style={[typeScale.sm, { color: selected ? c.onPrimary : c.text, fontWeight: '500' }]}>
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
      <Text style={[typeScale.xs, { color: fg, fontWeight: '600' }]}>{label}</Text>
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
  const [bg, fg] = {
    danger: [c.dangerBg, c.danger],
    info: [c.infoBg, c.info],
    success: [c.successBg, c.success],
  }[tone];
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={[typeScale.sm, { color: fg }]}>{children}</Text>
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
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
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
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  buttonText: { ...typeScale.base, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...typeScale.base,
  },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: spacing[4], gap: spacing[2] },
  chip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 40,
    justifyContent: 'center',
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  notice: { borderRadius: radius.md, padding: spacing[3] },
});
