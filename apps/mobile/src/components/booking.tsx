import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

/** ADD button that turns into a − n + stepper once the service is in the cart. */
export function QtyStepper({
  qty,
  onChange,
  label,
}: {
  qty: number;
  onChange: (delta: number) => void;
  label: string;
}) {
  const { t } = useI18n();
  const c = usePalette();
  const box = {
    height: 36,
    minWidth: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.accent,
    backgroundColor: qty ? c.accent : c.surface,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  };
  if (!qty)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Add {name}', { name: label })}
        onPress={() => onChange(1)}
        style={[shadow, box, { justifyContent: 'center' }]}
      >
        <Text style={[typeScale.sm, { color: c.accent, fontFamily: font.heading }]}>
          {t('ADD')}
        </Text>
      </Pressable>
    );
  return (
    <View style={box}>
      {(
        [
          ['remove', -1, t('Remove one {name}', { name: label })],
          [null, 0, ''],
          ['add', 1, t('Add one more {name}', { name: label })],
        ] as const
      ).map(([icon, delta, a11y]) =>
        icon ? (
          <Pressable
            key={icon}
            accessibilityRole="button"
            accessibilityLabel={a11y}
            hitSlop={6}
            onPress={() => onChange(delta)}
            style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center' }}
          >
            <Ionicons name={icon} size={16} color={c.onAccent} />
          </Pressable>
        ) : (
          <Text
            key="n"
            accessibilityLiveRegion="polite"
            style={[typeScale.sm, { color: c.onAccent, fontFamily: font.heading }]}
          >
            {qty}
          </Text>
        ),
      )}
    </View>
  );
}

/** The sticky bar at the bottom of the menu and checkout: count, total and the next step. */
export function CartBar({
  count,
  totalPaise,
  action,
  onPress,
  loading,
  disabled,
  testID,
}: {
  count: number;
  totalPaise: number;
  action: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { t } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const off = disabled || loading;
  return (
    <View
      style={[
        shadow,
        {
          paddingHorizontal: spacing[4],
          paddingTop: spacing[3],
          paddingBottom: Math.max(insets.bottom, spacing[3]),
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
        },
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: off, busy: loading }}
        disabled={off}
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: c.primary,
          borderRadius: 16,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          opacity: off ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <View>
          <Text
            style={[typeScale.xs, { color: 'rgba(255,255,255,0.75)', fontFamily: font.medium }]}
          >
            {count === 1 ? t('1 item') : t('{n} items', { n: count })}
          </Text>
          <Text style={[typeScale.lg, { color: '#fff', fontFamily: font.headingHeavy }]}>
            {rupees(totalPaise)}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text style={[typeScale.base, { color: '#fff', fontFamily: font.heading }]}>
            {loading ? t('Booking…') : action}
          </Text>
          <Ionicons name="arrow-forward" size={18} color={c.highlight} />
        </View>
      </Pressable>
    </View>
  );
}
