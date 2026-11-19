import Ionicons from '@expo/vector-icons/Ionicons';
import { SECTORS } from '@setu/domain';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Badge,
  Banner,
  Card,
  Chip,
  Chips,
  Grid,
  IconBadge,
  type IconName,
  Padded,
  Row,
  Screen,
  Section,
  Small,
  Tile,
  Title,
  TrustRow,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { PILLAR_ORDER, PILLAR_TILE, PILLARS, type PillarKey } from '@/lib/pillars';
import { BOOKABLE } from '@/lib/cart';
import { jobTone, rupees } from '@/lib/format';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { secureStorage } from '@/lib/storage';
import { craft, font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

type Type = 'service' | 'renovation' | 'consult' | 'material_rfq' | 'equipment';

/** Shortcuts straight into the right form with the category already picked. */
const CATEGORIES: { slug: string; type: Type; icon: IconName; label: MessageKey }[] = [
  { slug: 'plumbing', type: 'service', icon: 'water', label: 'Plumber' },
  { slug: 'electrical', type: 'service', icon: 'flash', label: 'Electrician' },
  { slug: 'ac-repair', type: 'service', icon: 'snow', label: 'AC technician' },
  { slug: 'carpentry', type: 'service', icon: 'hammer', label: 'Carpenter' },
  { slug: 'painting', type: 'service', icon: 'color-palette', label: 'Painter' },
  { slug: 'waterproofing', type: 'service', icon: 'umbrella', label: 'Waterproofing' },
  { slug: 'house-construction', type: 'renovation', icon: 'business', label: 'Contractor' },
  { slug: 'modular-kitchen', type: 'renovation', icon: 'restaurant', label: 'Modular Kitchen' },
  { slug: 'architect', type: 'consult', icon: 'compass', label: 'Architect' },
  { slug: 'cement-steel', type: 'material_rfq', icon: 'cube', label: 'Buy materials' },
  { slug: 'earthmoving', type: 'equipment', icon: 'car', label: 'Equipment rental' },
];

/** Shortcut tiles cycle through clay, saffron, indigo and leaf tints like painted tiles. */
const TILE_TINTS = [
  [craft.terracotta[100], craft.terracotta[300]],
  [craft.saffron[100], craft.saffron[300]],
  [craft.indigo[100], craft.indigo[300]],
  ['#E3F4EA', '#9BD6B8'],
] as const;

const STARTS: { pillar: PillarKey; icon: IconName; title: MessageKey; body: MessageKey }[] = [
  {
    pillar: 'build',
    icon: 'hammer',
    title: 'Build & renovate',
    body: 'New construction, kitchen, bathroom, full home',
  },
  {
    pillar: 'home',
    icon: 'construct',
    title: 'Repair & maintain',
    body: 'Plumber, electrician, AC, carpenter, painter',
  },
  {
    pillar: 'materials',
    icon: 'cube',
    title: 'Buy materials',
    body: 'Cement, steel, sand, bricks, tiles',
  },
  {
    pillar: 'equipment',
    icon: 'car',
    title: 'Rent equipment',
    body: 'JCB, mixer, scaffolding, with or without operator',
  },
  {
    pillar: 'professionals',
    icon: 'compass',
    title: 'Find professionals',
    body: 'Architect, engineer, interior, cost estimate',
  },
];

const BANNER_W = 320;
const SECTOR_KEY = 'setu.sector';

/** Fixed-price trades open the booking menu; everything else goes to the quote form. */
const post = (type: Type, category?: string) =>
  type === 'consult'
    ? router.push('/professionals')
    : category && BOOKABLE[category]
      ? router.push({ pathname: '/book/[category]', params: { category } })
      : router.push({
          pathname: '/requirement/new',
          params: { type, ...(category ? { category } : {}) },
        });

export default function Home() {
  const { t, d } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const me = $api.useQuery('get', '/v1/me');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const inbox = $api.useQuery('get', '/v1/me/notifications');
  const active = (jobs.data ?? []).filter((j) => !['closed', 'cancelled'].includes(j.state));

  // The area the customer is browsing for, remembered on this device.
  const [sector, setSector] = useState<string>(SECTORS[0]!.name);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    void secureStorage.get(SECTOR_KEY).then((v) => v && setSector(v));
  }, []);
  const chooseSector = (name: string) => {
    setSector(name);
    setPicking(false);
    void secureStorage.set(SECTOR_KEY, name);
  };

  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return CATEGORIES.filter(
      (x) =>
        t(x.label).toLowerCase().includes(q) ||
        x.slug.includes(q) ||
        x.label.toLowerCase().includes(q),
    );
  }, [query, t]);

  return (
    <Screen
      padded={false}
      edges={[]}
      refreshing={jobs.isRefetching}
      onRefresh={() => void jobs.refetch()}
    >
      {/* Header: location, alerts, profile */}
      <View
        style={{
          backgroundColor: c.primary,
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[8],
          gap: spacing[4],
          overflow: 'hidden',
        }}
      >
        <Row>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Change area')}
            onPress={() => setPicking(!picking)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 }}
          >
            <Ionicons name="location" size={20} color={c.accent} />
            <View>
              <Text style={[typeScale.base, { color: '#fff', fontFamily: font.heading }]}>
                {sector}
                <Ionicons name="chevron-down" size={14} color="#fff" />
              </Text>
              <Text
                style={[typeScale.xs, { color: 'rgba(255,255,255,0.7)', fontFamily: font.body }]}
              >
                {t('Greater Noida')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Notifications')}
            onPress={() => router.push('/notifications')}
            style={{ padding: spacing[2] }}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {inbox.data?.length ? (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: c.accent,
                }}
              />
            ) : null}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/account')}>
            <Avatar name={me.data?.name ?? ''} size={38} />
          </Pressable>
        </Row>

        <View style={{ gap: 2 }}>
          <Text
            style={[
              typeScale['2xl'],
              { color: '#fff', fontFamily: font.headingHeavy, letterSpacing: -0.6 },
            ]}
          >
            {t('Build, Renovate, Repair & Maintain')}
          </Text>
          <Text
            style={[
              typeScale['2xl'],
              { color: c.accent, fontFamily: font.headingHeavy, letterSpacing: -0.6 },
            ]}
          >
            {t('All in one trusted platform')}
          </Text>
        </View>

        <View
          style={[
            shadow,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[2],
              backgroundColor: c.surface,
              borderRadius: 16,
              paddingHorizontal: spacing[4],
              minHeight: 52,
            },
          ]}
        >
          <Ionicons name="search" size={20} color={c.textMuted} />
          <TextInput
            testID="home-search"
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search painter, cement, JCB, architect…')}
            placeholderTextColor={c.textMuted}
            style={[
              typeScale.base,
              { flex: 1, color: c.text, fontFamily: font.body, minHeight: 48 },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Setu AI"
            onPress={() => router.push('/assistant')}
          >
            <Ionicons name="sparkles" size={20} color={c.accentHover} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing[2] }}>
          {(
            [
              'Verified professionals',
              'Multiple quotes',
              'Compare & choose',
              'End-to-end support',
            ] as const
          ).map((x) => (
            <View
              key={x}
              style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}
            >
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text
                numberOfLines={1}
                style={[typeScale.xs, { flex: 1, color: '#fff', fontFamily: font.semibold }]}
              >
                {t(x)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {picking ? (
        <Padded>
          <Card>
            <Title>{t('Choose your area')}</Title>
            <Chips>
              {SECTORS.map((s) => (
                <Chip
                  key={s.slug}
                  label={s.name}
                  selected={sector === s.name}
                  onPress={() => chooseSector(s.name)}
                />
              ))}
            </Chips>
          </Card>
        </Padded>
      ) : null}

      {query.trim() ? (
        <Padded>
          <Card>
            {matches.length ? (
              matches.map((m) => (
                <Pressable
                  key={m.slug}
                  accessibilityRole="button"
                  onPress={() => post(m.type, m.slug)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[3],
                    paddingVertical: spacing[2],
                  }}
                >
                  <IconBadge name={m.icon} size={36} tone="light" />
                  <Text
                    style={[typeScale.base, { flex: 1, color: c.text, fontFamily: font.medium }]}
                  >
                    {t(m.label)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Pressable>
              ))
            ) : (
              <Pressable accessibilityRole="button" onPress={() => router.push('/assistant')}>
                <Small>{t('Not sure? Ask Setu AI and it will suggest the right service.')}</Small>
              </Pressable>
            )}
          </Card>
        </Padded>
      ) : null}

      {/* The five pillars */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing[4],
          gap: spacing[3],
          paddingTop: spacing[2],
        }}
      >
        {PILLAR_ORDER.map((k, i) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            testID={`pillar-${k}`}
            onPress={() => router.push({ pathname: '/pillar/[key]', params: { key: k } })}
            style={({ pressed }) => [
              shadow,
              {
                width: 104,
                padding: spacing[3],
                gap: spacing[2],
                borderRadius: 18,
                backgroundColor: i === 0 ? c.highlightBg : c.surface,
                borderWidth: 1.5,
                borderColor: i === 0 ? c.accent : c.border,
                alignItems: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: i === 0 ? c.surface : c.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={PILLARS[k].icon} size={26} color={i === 0 ? c.accent : c.primary} />
            </View>
            <Text
              numberOfLines={2}
              style={[
                typeScale.xs,
                { color: c.text, fontFamily: font.semibold, textAlign: 'center' },
              ]}
            >
              {t(PILLAR_TILE[k])}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Post a requirement, straight under the pillars */}
      <Padded>
        <Pressable
          accessibilityRole="button"
          testID="post-requirement"
          onPress={() => router.push('/requirement/new')}
          style={({ pressed }) => [
            shadow,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              padding: spacing[4],
              borderRadius: 18,
              backgroundColor: c.accent,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons name="add-circle" size={30} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={[typeScale.lg, { color: '#fff', fontFamily: font.heading }]}>
              {t('Post a requirement')}
            </Text>
            <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.9)', fontFamily: font.body }]}>
              {t('Describe the work, get 2+ quotes within 24 hours')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </Pressable>
      </Padded>

      <Padded>
        {/* Tools */}
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {(
            [
              ['sparkles', 'Setu AI', 'Ask in Hinglish. Get a plan.', '/assistant'],
              ['calculator', 'Cost calculator', 'Know the ballpark first', '/calculator'],
            ] as const
          ).map(([icon, title, body, href]) => (
            <Pressable
              key={href}
              accessibilityRole="button"
              onPress={() => router.push(href)}
              style={({ pressed }) => [
                shadow,
                {
                  flex: 1,
                  gap: spacing[2],
                  padding: spacing[4],
                  borderRadius: 20,
                  backgroundColor: href === '/assistant' ? c.accent : c.surface,
                  borderWidth: 1,
                  borderColor: href === '/assistant' ? c.accent : c.border,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={icon}
                size={24}
                color={href === '/assistant' ? c.onAccent : c.primary}
              />
              <Text
                style={[
                  typeScale.base,
                  { color: href === '/assistant' ? c.onAccent : c.text, fontFamily: font.heading },
                ]}
              >
                {title === 'Setu AI' ? title : t(title)}
              </Text>
              <Text
                style={[
                  typeScale.xs,
                  {
                    color: href === '/assistant' ? c.onAccent : c.textMuted,
                    fontFamily: font.body,
                  },
                ]}
              >
                {t(body)}
              </Text>
            </Pressable>
          ))}
        </View>

        {active.length > 0 ? (
          <>
            <Section
              title={t('Active jobs')}
              action={t('See all')}
              onAction={() => router.push('/jobs')}
            />
            {active.slice(0, 3).map((j) => (
              <Card key={j.id} accent={c.accent} onPress={() => router.push(`/job/${j.id}`)}>
                <Row>
                  <Title>{j.title}</Title>
                  <Badge label={d.jobState[j.state]} tone={jobTone(j.state)} />
                </Row>
                <Small>{rupees(j.agreedTotalPaise)}</Small>
              </Card>
            ))}
          </>
        ) : null}

        <Section title={t('What do you need?')} />
        <Grid>
          {STARTS.map((s, i) => (
            <Tile
              key={s.pillar}
              icon={s.icon}
              tone={i === 0 ? 'orange' : 'navy'}
              title={t(s.title)}
              caption={t(s.body)}
              onPress={() => router.push({ pathname: '/pillar/[key]', params: { key: s.pillar } })}
            />
          ))}
        </Grid>

        {/* How Setu Safe works */}
        <Section title={t('How Setu works')} />
        <Card>
          {(
            [
              [
                'create',
                'Post your requirement',
                'Describe the job in English, Hindi or Hinglish.',
              ],
              [
                'people',
                'Get 2+ quotes within 24 hours',
                'Verified pros near you send itemised quotes.',
              ],
              [
                'shield-checkmark',
                'Pay safely by milestone',
                'Your money is held by Setu until you confirm the work.',
              ],
            ] as const
          ).map(([icon, title, body], i) => (
            <View
              key={title}
              style={{ flexDirection: 'row', gap: spacing[3], paddingVertical: spacing[2] }}
            >
              <View style={{ alignItems: 'center' }}>
                <IconBadge name={icon} size={40} tone={i === 2 ? 'orange' : 'navy'} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                  {t(title)}
                </Text>
                <Small>{t(body)}</Small>
              </View>
            </View>
          ))}
        </Card>
      </Padded>
    </Screen>
  );
}
