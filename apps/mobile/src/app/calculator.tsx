import {
  constructionEstimate,
  FINISH_TIERS,
  type FinishTier,
  formatINR,
  paintingEstimate,
} from '@setu/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Chip, Chips, Field, Row, Screen, Small } from '@/components/ui';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

type Kind = 'build' | 'paint';
const TIER_LABEL: Record<FinishTier, MessageKey> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};
const rupees = (paise: number) => formatINR(paise, { decimals: false });
const num = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;

/** Cost calculator: the same Greater Noida rates as the website. */
export default function Calculator() {
  const { t } = useI18n();
  const c = usePalette();
  const [kind, setKind] = useState<Kind>('build');
  const [area, setArea] = useState('1200');
  const [floors, setFloors] = useState(2);
  const [carpet, setCarpet] = useState('1100');
  const [tier, setTier] = useState<FinishTier>('standard');

  const e =
    kind === 'build'
      ? constructionEstimate(num(area), floors, tier)
      : paintingEstimate(num(carpet), tier);

  return (
    <Screen>
      <Chips>
        <Chip
          label={t('House construction')}
          selected={kind === 'build'}
          onPress={() => setKind('build')}
        />
        <Chip
          label={t('House Painting')}
          selected={kind === 'paint'}
          onPress={() => setKind('paint')}
        />
      </Chips>

      <Card>
        {kind === 'build' ? (
          <>
            <Field
              label={t('Built-up area per floor (sq ft)')}
              value={area}
              onChangeText={setArea}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Small muted={false}>{t('Floors')}</Small>
            <Chips>
              {[1, 2, 3, 4].map((n) => (
                <Chip
                  key={n}
                  label={String(n)}
                  selected={floors === n}
                  onPress={() => setFloors(n)}
                />
              ))}
            </Chips>
          </>
        ) : (
          <Field
            label={t('Carpet area (sq ft)')}
            value={carpet}
            onChangeText={setCarpet}
            keyboardType="number-pad"
            maxLength={6}
          />
        )}
        <Small muted={false}>{t('Finish quality')}</Small>
        <Chips>
          {FINISH_TIERS.map((k) => (
            <Chip
              key={k}
              label={t(TIER_LABEL[k])}
              selected={tier === k}
              onPress={() => setTier(k)}
            />
          ))}
        </Chips>
      </Card>

      <View
        style={{
          borderRadius: 24,
          backgroundColor: c.primary,
          padding: spacing[5],
          gap: spacing[3],
        }}
      >
        <Text
          style={[typeScale.xs, { color: c.accent, fontFamily: font.semibold, letterSpacing: 1.4 }]}
        >
          {t('Indicative estimate').toUpperCase()}
        </Text>
        <Text style={[typeScale['3xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
          {rupees(e.lowPaise)} – {rupees(e.highPaise)}
        </Text>
        {e.split.map((s) => (
          <View key={s.label} style={{ gap: 4 }}>
            <Row>
              <Text
                style={[typeScale.sm, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}
              >
                {t(s.label as MessageKey)}
              </Text>
              <Text style={[typeScale.sm, { color: '#fff', fontFamily: font.semibold }]}>
                {rupees(Math.round(e.basePaise * s.share))}
              </Text>
            </Row>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <View
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${s.share * 100}%`,
                  backgroundColor: c.accent,
                }}
              />
            </View>
          </View>
        ))}
        <Text style={[typeScale.xs, { color: 'rgba(255,255,255,0.65)', fontFamily: font.body }]}>
          {t('Excludes GST, land and approval fees. Final price after a free site visit.')}
        </Text>
      </View>

      <Button
        title={t('Get exact quotes')}
        kind="accent"
        icon="document-text"
        onPress={() =>
          router.push({
            pathname: '/requirement/new',
            params: { type: kind === 'build' ? 'renovation' : 'service' },
          })
        }
      />
    </Screen>
  );
}
