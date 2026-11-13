import { LOCALES, SECTORS } from '@setu/domain';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Chips, fill } from './ui';
import { BANNERS } from '@/lib/banners';
import { LANGUAGE_NAMES, type MessageKey, useI18n } from '@/lib/i18n';
import { secureStorage } from '@/lib/storage';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

const SLIDES: { image: keyof typeof BANNERS; title: MessageKey; body: MessageKey }[] = [
  {
    image: 'homeServices',
    title: 'One platform to build, repair and maintain',
    body: 'Construction, home services, materials, equipment and experts across Greater Noida.',
  },
  {
    image: 'renovation',
    title: 'Compare quotes from verified pros',
    body: 'Every professional is ID-checked. Get 3–5 written quotes and pick the best.',
  },
  {
    image: 'buildHome',
    title: 'Pay safely, stage by stage',
    body: 'Setu holds your money and releases it only when you approve the work.',
  },
];

export const WELCOMED_KEY = 'setu.welcomed';
const SECTOR_KEY = 'setu.sector';
/** Light panel so selected chips (black) stand out on the dark slides. */
const panel = { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 18, padding: 10 } as const;

/** First-run welcome: three slides, then language and area. Shown once per device. */
export function Welcome({ onDone }: { onDone: () => void }) {
  const { t, locale, setLocale } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [sector, setSector] = useState<string>(SECTORS[0]!.name);
  const last = i === SLIDES.length;

  async function finish() {
    await secureStorage.set(SECTOR_KEY, sector).catch(() => undefined);
    await secureStorage.set(WELCOMED_KEY, '1').catch(() => undefined);
    onDone();
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#111113' }}>
      {!last ? (
        <>
          <Image source={BANNERS[SLIDES[i]!.image]} resizeMode="cover" style={fill} />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.95)']}
            style={fill}
          />
        </>
      ) : null}
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          paddingHorizontal: spacing[5],
          paddingTop: insets.top + spacing[4],
          paddingBottom: insets.bottom + spacing[5],
          gap: spacing[4],
        }}
      >
        <View style={panel}>
          <Chips>
            {LOCALES.map((l) => (
              <Chip
                key={l}
                label={LANGUAGE_NAMES[l]}
                selected={locale === l}
                onPress={() => setLocale(l)}
              />
            ))}
          </Chips>
        </View>
        {last ? (
          <View style={{ gap: spacing[3] }}>
            <Text style={[typeScale['3xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
              {t('Where is your home or site?')}
            </Text>
            <Text
              style={[typeScale.base, { color: 'rgba(255,255,255,0.8)', fontFamily: font.body }]}
            >
              {t('We show professionals and prices for your area.')}
            </Text>
            <View style={[panel, { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }]}>
              {SECTORS.map((s) => (
                <Chip
                  key={s.slug}
                  label={s.name}
                  selected={sector === s.name}
                  onPress={() => setSector(s.name)}
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: spacing[2] }}>
            <Text style={[typeScale['3xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
              {t(SLIDES[i]!.title)}
            </Text>
            <Text
              style={[typeScale.base, { color: 'rgba(255,255,255,0.85)', fontFamily: font.body }]}
            >
              {t(SLIDES[i]!.body)}
            </Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[...SLIDES, null].map((_, k) => (
            <View
              key={k}
              style={{
                height: 6,
                width: k === i ? 22 : 8,
                borderRadius: 3,
                backgroundColor: k === i ? c.highlight : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {!last ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setI(SLIDES.length)}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={[typeScale.base, { color: '#fff', fontFamily: font.semibold }]}>
                {t('Skip')}
              </Text>
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              testID="welcome-next"
              title={last ? t('Get started') : t('Next')}
              kind="outline"
              onPress={() => (last ? void finish() : setI(i + 1))}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
