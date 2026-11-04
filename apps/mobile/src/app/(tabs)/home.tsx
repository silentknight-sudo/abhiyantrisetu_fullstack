import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  Badge,
  Banner,
  Body,
  Card,
  Eyebrow,
  Grid,
  Heading,
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
import { BANNERS } from '@/lib/banners';
import { jobTone, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { spacing, usePalette } from '@/lib/theme';

const STARTS = [
  {
    type: 'service',
    icon: 'construct',
    title: 'Repair & maintain',
    body: 'Plumber, electrician, AC, carpenter, painter',
  },
  {
    type: 'renovation',
    icon: 'hammer',
    title: 'Renovate',
    body: 'Kitchen, bathroom, flooring, full home',
  },
  {
    type: 'consult',
    icon: 'compass',
    title: 'Ask an expert',
    body: 'Structural, architect, interior, cost estimate',
  },
  {
    type: 'material_rfq',
    icon: 'cube',
    title: 'Buy materials',
    body: 'Cement, steel, sand, bricks, tiles',
  },
  {
    type: 'equipment',
    icon: 'car',
    title: 'Rent equipment',
    body: 'JCB, mixer, scaffolding, with or without operator',
  },
] as const;

const post = (type: string) => router.push({ pathname: '/requirement/new', params: { type } });

export default function Home() {
  const { t, d } = useI18n();
  const c = usePalette();
  const me = $api.useQuery('get', '/v1/me');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const active = (jobs.data ?? []).filter((j) => !['closed', 'cancelled'].includes(j.state));
  const firstName = me.data?.name?.split(' ')[0];

  return (
    <Screen padded={false} refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()}>
      <Padded>
        <View style={{ gap: spacing[1], marginTop: spacing[4] }}>
          <Eyebrow>{t('Greater Noida')}</Eyebrow>
          <Heading>{firstName ? t('Namaste, {name}', { name: firstName }) : t('Namaste')}</Heading>
          <Body muted>
            {t('What do you need done? Post once and verified professionals nearby send quotes.')}
          </Body>
        </View>
      </Padded>

      {/* Swipeable promo banners */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={320 + spacing[3]}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: spacing[3] }}
      >
        {(
          [
            [BANNERS.homeServices, 'Home services', 'Verified pros at your door', 'service'],
            [BANNERS.buildHome, 'Build a house', 'Pay stage by stage', 'renovation'],
            [BANNERS.renovation, 'Renovate', 'Itemised quotes in 24 hours', 'renovation'],
          ] as const
        ).map(([image, eyebrow, title, type]) => (
          <View key={eyebrow} style={{ width: 320 }}>
            <Banner
              image={image}
              eyebrow={t(eyebrow)}
              title={t(title)}
              cta={t('Get a quote')}
              onPress={() => post(type)}
            />
          </View>
        ))}
      </ScrollView>

      <Padded>
        <Section title={t('What do you need?')} />
        <Grid>
          {STARTS.map((s, i) => (
            <Tile
              key={s.type}
              icon={s.icon as IconName}
              tone={i === 0 ? 'orange' : 'navy'}
              title={t(s.title)}
              caption={t(s.body)}
              onPress={() => post(s.type)}
              testID={i === 0 ? 'post-requirement' : undefined}
            />
          ))}
          <Tile
            icon="add"
            tone="orange"
            title={t('Post a requirement')}
            caption={t('Describe the work')}
            onPress={() => router.push('/requirement/new')}
          />
        </Grid>

        <TrustRow
          items={[
            ['shield-checkmark', t('Verified')],
            ['wallet', t('Pay safely')],
            ['flash', t('Quick response')],
            ['star', t('Real reviews')],
          ]}
        />

        {active.length > 0 ? (
          <>
            <Section
              title={t('Active jobs')}
              action={t('See all')}
              onAction={() => router.push('/jobs')}
            />
            {active.map((j) => (
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
      </Padded>
    </Screen>
  );
}
