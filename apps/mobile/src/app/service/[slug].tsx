import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { cardImage } from '@/lib/cardImages';
import { useI18n } from '@/lib/i18n';
import { SERVICES } from '@/lib/services';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
type Supplies = 'customer' | 'setu' | 'unsure';

/** Service details (design S1) with the option sheet (S2), then on to the requirement. */
export default function ServiceDetail() {
  const { t } = useI18n();
  const c = usePalette();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const s = SERVICES[slug ?? ''];
  const [sheet, setSheet] = useState(false);
  const [opt, setOpt] = useState(0);
  const [area, setArea] = useState('');
  const [supplies, setSupplies] = useState<Supplies>('customer');
  if (!s) {
    return (
      <Screen>
        <Small>{t('This service is not available.')}</Small>
      </Screen>
    );
  }
  const tr = (k: string) => t(k as never);
  const perSqft = s.unit === 'sqft';
  const priced = s.options.find((o) => o.rate != null)?.rate ?? null;
  const unitLabel = perSqft ? t('/ sq ft') : '';
  const chosen = s.options[opt]!;
  const sqft = Number(area) || 0;
  const estimate = chosen.rate != null ? (perSqft ? sqft * chosen.rate : chosen.rate) : null;
  const img = cardImage(s.slug);

  const next = () => {
    setSheet(false);
    router.push({
      pathname: '/requirement/new',
      params: {
        type: 'renovation',
        title: tr(s.title),
        option: tr(chosen.name),
        scope: s.scope.join(','),
        supplies,
        ...(sqft ? { area: String(sqft) } : {}),
        ...(s.category ? { category: s.category } : {}),
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: tr(s.title) }} />
      <Screen padded={false}>
        {img ? (
          <Image
            source={img}
            accessibilityIgnoresInvertColors
            style={{ width: '100%', height: 220 }}
          />
        ) : null}
        <View style={{ backgroundColor: c.surface, padding: spacing[4], gap: spacing[2] }}>
          <Text style={[typeScale['2xl'], { color: c.text, fontFamily: font.headingHeavy }]}>
            {tr(s.title)}
          </Text>
          <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
            {priced != null
              ? t('Starts at {price}', { price: `${inr(priced)} ${unitLabel}` })
              : t('Price after the site visit')}
            {` · ${t('{days} days', { days: s.days })}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Badge label={t('Free measurement')} tone="success" />
            <Badge label={t('Milestone payments')} tone="info" />
          </View>
        </View>
        <View style={{ padding: spacing[4], gap: spacing[3], paddingBottom: 120 }}>
          <Card>
            <Title>{t("What's included")}</Title>
            {s.included.map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Ionicons name="checkmark" size={18} color={c.success} />
                <Text style={[typeScale.sm, { flex: 1, color: c.text, fontFamily: font.body }]}>
                  {tr(x)}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Title>{t('Not included')}</Title>
            {s.excluded.map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Ionicons name="close" size={18} color={c.danger} />
                <Text style={[typeScale.sm, { flex: 1, color: c.text, fontFamily: font.body }]}>
                  {tr(x)}
                </Text>
              </View>
            ))}
          </Card>
          <Card>
            <Title>{t('Choose an option')}</Title>
            {s.options.map((o) => (
              <Row key={o.name}>
                <View style={{ flex: 1 }}>
                  <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
                    {tr(o.name)}
                  </Text>
                  <Small>{tr(o.note)}</Small>
                </View>
                <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                  {o.rate != null ? `${inr(o.rate)} ${unitLabel}` : t('After visit')}
                </Text>
              </Row>
            ))}
          </Card>
          <Card>
            <Title>{t('How it works')}</Title>
            {(
              [
                'Book a free measurement visit',
                'Get 2+ itemised quotes within 24 hours',
                'Pick a contractor, pay the advance to Setu',
                'Approve each milestone, money is released',
              ] as const
            ).map((x, i) => (
              <View key={x} style={{ flexDirection: 'row', gap: spacing[3] }}>
                <Text
                  style={[typeScale.base, { color: c.accent, fontFamily: font.heading, width: 18 }]}
                >
                  {i + 1}
                </Text>
                <Text style={[typeScale.sm, { flex: 1, color: c.text, fontFamily: font.body }]}>
                  {t(x)}
                </Text>
              </View>
            ))}
          </Card>
          <Small>
            {t(
              'Rates are indicative for labour. You pay the written quote you accept after the visit.',
            )}
          </Small>
        </View>
      </Screen>

      {/* Sticky bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          padding: spacing[4],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        <View>
          <Small>{t('Starts at')}</Small>
          <Text style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}>
            {priced != null ? `${inr(priced)} ${unitLabel}` : t('After visit')}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            testID="choose-option"
            title={t('Add · choose option')}
            onPress={() => setSheet(true)}
          />
        </View>
      </View>

      {/* Option sheet */}
      <Modal
        visible={sheet}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(false)}
      >
        <Pressable
          accessibilityLabel={t('Close')}
          onPress={() => setSheet(false)}
          style={{ flex: 1, backgroundColor: 'rgba(10,18,36,0.55)' }}
        />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            padding: spacing[4],
            paddingBottom: spacing[6],
            gap: spacing[3],
          }}
        >
          <Title>{tr(s.title)}</Title>
          <Small>{t('Option')}</Small>
          {s.options.map((o, i) => (
            <Pressable
              key={o.name}
              accessibilityRole="radio"
              accessibilityState={{ checked: opt === i }}
              testID={`opt-${i}`}
              onPress={() => setOpt(i)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                borderWidth: 1.5,
                borderColor: opt === i ? c.accent : c.border,
                backgroundColor: opt === i ? c.highlightBg : c.surface,
                borderRadius: 14,
                padding: spacing[3],
              }}
            >
              <Ionicons
                name={opt === i ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={opt === i ? c.accent : c.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
                  {tr(o.name)}
                </Text>
                <Small>{tr(o.note)}</Small>
              </View>
              <Text style={[typeScale.sm, { color: c.text, fontFamily: font.heading }]}>
                {o.rate != null ? inr(o.rate) : t('After visit')}
              </Text>
            </Pressable>
          ))}
          {perSqft ? (
            <Field
              label={t('Approximate area (sq ft)')}
              value={area}
              onChangeText={setArea}
              keyboardType="number-pad"
              testID="opt-area"
            />
          ) : null}
          {s.material ? (
            <>
              <Small>{t('Who supplies the material?')}</Small>
              <Chips>
                {(
                  [
                    ['customer', 'I have it'],
                    ['setu', 'Include in the quote'],
                    ['unsure', 'Not sure'],
                  ] as const
                ).map(([k, l]) => (
                  <Chip
                    key={k}
                    label={t(l)}
                    selected={supplies === k}
                    onPress={() => setSupplies(k)}
                  />
                ))}
              </Chips>
            </>
          ) : null}
          <View
            style={{ backgroundColor: c.background, borderRadius: 12, padding: spacing[3], gap: 2 }}
          >
            <Row>
              <Small muted={false}>{t('Estimated labour')}</Small>
              <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                {estimate ? inr(estimate) : t('After visit')}
              </Text>
            </Row>
            <Small>
              {estimate && perSqft
                ? t('{area} sq ft × {rate} · final price after measurement', {
                    area: sqft,
                    rate: inr(chosen.rate!),
                  })
                : t('Final price after measurement')}
            </Small>
          </View>
          <Button testID="opt-continue" title={t('Continue')} onPress={next} />
        </View>
      </Modal>
    </View>
  );
}
