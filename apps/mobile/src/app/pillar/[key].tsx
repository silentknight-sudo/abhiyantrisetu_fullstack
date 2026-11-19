import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { openGo } from '@/lib/go';
import { useI18n } from '@/lib/i18n';
import { PILLARS, type PillarKey } from '@/lib/pillars';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** Soft tints for icon tiles, cycled so a row of cards does not look flat. */
const TINTS = ['#EEF1F5', '#FDEEE1', '#E9EEF7', '#E7F4EC', '#FFF3E2', '#EDE8F7'];

/** One pillar (Build & Renovate, Home Services, …): search, what are you looking for, rows. */
export default function PillarScreen() {
  const { t } = useI18n();
  const c = usePalette();
  const { key } = useLocalSearchParams<{ key: string }>();
  const p = PILLARS[(key as PillarKey) in PILLARS ? (key as PillarKey) : 'build'];
  const tr = (k: string) => t(k as never);
  const go = (g: Parameters<typeof openGo>[0]) => openGo(g, t as never);
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const all = [...p.grid, ...p.sections.flatMap((x) => x.cards)];
    return all.filter(
      (x) => tr(x.label).toLowerCase().includes(s) || x.label.toLowerCase().includes(s),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, p]);

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: tr(p.title) }} />
      {/* Search and "What are you looking for?" on white */}
      <View style={{ backgroundColor: c.surface, paddingBottom: spacing[5], gap: spacing[4] }}>
        <Text
          style={[
            typeScale.sm,
            {
              color: c.textMuted,
              fontFamily: font.body,
              paddingHorizontal: spacing[4],
              paddingTop: spacing[3],
            },
          ]}
        >
          {tr(p.sub)}
        </Text>
        <View
          style={{
            marginHorizontal: spacing[4],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            paddingLeft: spacing[4],
            padding: 5,
            backgroundColor: c.surface,
          }}
        >
          <TextInput
            testID="pillar-search"
            value={q}
            onChangeText={setQ}
            placeholder={tr(p.search)}
            placeholderTextColor={c.textMuted}
            style={[
              typeScale.base,
              { flex: 1, minHeight: 40, color: c.text, fontFamily: font.body },
            ]}
          />
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="search" size={20} color="#fff" />
          </View>
        </View>
        {hits.length ? (
          <View style={{ marginHorizontal: spacing[4], gap: spacing[1] }}>
            {hits.slice(0, 6).map((h) => (
              <Pressable
                key={h.label}
                accessibilityRole="button"
                onPress={() => go(h.go)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingVertical: spacing[2],
                }}
              >
                <Ionicons name={h.icon} size={20} color={c.primary} />
                <Text style={[typeScale.base, { flex: 1, color: c.text, fontFamily: font.medium }]}>
                  {tr(h.label)}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text
          style={[
            typeScale.lg,
            { color: c.text, fontFamily: font.heading, paddingHorizontal: spacing[4] },
          ]}
        >
          {t('What are you looking for?')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            rowGap: spacing[4],
            paddingHorizontal: spacing[2],
          }}
        >
          {p.grid.map((g, i) => (
            <Pressable
              key={g.label}
              accessibilityRole="button"
              testID={`grid-${i}`}
              onPress={() => go(g.go)}
              style={{ width: '33.33%', alignItems: 'center', gap: 7, paddingHorizontal: 4 }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: TINTS[i % TINTS.length],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={g.icon} size={28} color={c.primary} />
              </View>
              <Text
                numberOfLines={2}
                style={[
                  typeScale.xs,
                  { color: c.text, fontFamily: font.medium, textAlign: 'center' },
                ]}
              >
                {tr(g.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {p.sections.map((s, si) => (
        <Fragment key={s.title}>
          <View style={{ paddingTop: spacing[6], gap: spacing[3] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing[3],
                paddingHorizontal: spacing[4],
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[typeScale.xl, { color: c.text, fontFamily: font.heading }]}>
                  {tr(s.title)}
                </Text>
                {s.sub ? (
                  <Text style={[typeScale.sm, { color: c.textMuted, fontFamily: font.body }]}>
                    {tr(s.sub)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => go(s.go)}
                style={{
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.surface,
                  borderRadius: 10,
                  height: 40,
                  paddingHorizontal: 14,
                  justifyContent: 'center',
                }}
              >
                <Text style={[typeScale.sm, { color: c.accent, fontFamily: font.semibold }]}>
                  {t('See all')}
                </Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[3] }}
            >
              {s.cards.map((card, ci) => (
                <Pressable
                  key={card.label}
                  accessibilityRole="button"
                  onPress={() => go(card.go)}
                  style={{ width: 150 }}
                >
                  <View
                    style={{
                      height: 150,
                      borderRadius: 14,
                      backgroundColor: TINTS[(si + ci) % TINTS.length],
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name={card.icon} size={48} color={c.primary} />
                    {card.meta ? (
                      <View
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: 8,
                          backgroundColor: c.successBg,
                          borderRadius: 5,
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                        }}
                      >
                        <Text
                          style={[typeScale.xs, { color: c.success, fontFamily: font.semibold }]}
                        >
                          {tr(card.meta).toUpperCase()}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      typeScale.sm,
                      { color: c.text, fontFamily: font.heading, marginTop: spacing[2] },
                    ]}
                  >
                    {tr(card.label)}
                  </Text>
                  <Text
                    style={[
                      typeScale.xs,
                      { color: c.accent, fontFamily: font.semibold, marginTop: 2 },
                    ]}
                  >
                    {'book' in card.go ? t('Fixed price') : t('Get quotes')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          {si === p.banner.after ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => go(p.banner.go)}
              style={{
                marginTop: spacing[6],
                marginHorizontal: spacing[4],
                backgroundColor: c.primary,
                borderRadius: 16,
                padding: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[
                    typeScale.xs,
                    { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1 },
                  ]}
                >
                  {tr(p.banner.eyebrow).toUpperCase()}
                </Text>
                <Text style={[typeScale.lg, { color: '#fff', fontFamily: font.heading }]}>
                  {tr(p.banner.title)}
                </Text>
                <Text
                  style={[typeScale.sm, { color: 'rgba(255,255,255,0.75)', fontFamily: font.body }]}
                >
                  {tr(p.banner.body)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </Pressable>
          ) : null}
        </Fragment>
      ))}

      <View style={{ padding: spacing[4], paddingTop: spacing[6], paddingBottom: spacing[8] }}>
        <Button testID="pillar-cta" title={tr(p.cta.label)} onPress={() => go(p.cta.go)} />
      </View>
    </Screen>
  );
}
