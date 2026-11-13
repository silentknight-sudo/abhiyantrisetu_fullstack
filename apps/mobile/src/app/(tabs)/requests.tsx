import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import {
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  Empty,
  IconBadge,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { BANNERS } from '@/lib/banners';
import { errorMessage } from '@/lib/errors';
import { ago } from '@/lib/format';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { TYPE_ICON } from '@/lib/icons';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

type Type = 'service' | 'renovation' | 'consult' | 'material_rfq' | 'equipment';
const SEGMENTS: [Type | 'all', MessageKey][] = [
  ['all', 'All'],
  ['service', 'Home services'],
  ['renovation', 'Build & renovate'],
  ['consult', 'Professionals'],
  ['material_rfq', 'Materials'],
  ['equipment', 'Equipment'],
];
const STAGES: MessageKey[] = ['Posted', 'Quotes', 'Hired', 'In progress', 'Done'];
const NEXT: MessageKey[] = [
  'Next: quotes from verified pros',
  'Next: compare and hire',
  'Next: the visit or start of work',
  'Next: check the work and confirm',
  'Completed',
];

/** Where a request is in its lifecycle: 0 Posted … 4 Done, or -1 when stopped. */
function stageOf(status: string, jobState?: string): number {
  if (status === 'cancelled' || status === 'expired' || jobState === 'cancelled') return -1;
  if (jobState === 'closed') return 4;
  if (jobState === 'in_progress' || jobState === 'completed' || jobState === 'disputed') return 3;
  if (status === 'hired') return 2;
  if (status === 'quoted') return 1;
  return 0;
}

/** My projects: every request across all segments, with one lifecycle progress bar. */
export default function MyProjects() {
  const { t, d } = useI18n();
  const c = usePalette();
  const list = $api.useQuery('get', '/v1/requirements');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const [segment, setSegment] = useState<Type | 'all'>('all');
  const [view, setView] = useState<'active' | 'done'>('active');

  const jobFor = (id: string) => (jobs.data ?? []).find((j) => j.requirementId === id);
  const rows = (list.data ?? [])
    .map((r) => {
      const job = jobFor(r.id);
      return { r, job, stage: stageOf(r.status, job?.state) };
    })
    .filter((x) => segment === 'all' || x.r.type === segment);
  const active = rows.filter((x) => x.stage >= 0 && x.stage < 4);
  const done = rows.filter((x) => x.stage === 4 || x.stage === -1);
  const shown = view === 'active' ? active : done;

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => {
        void list.refetch();
        void jobs.refetch();
      }}
    >
      <Banner
        image={BANNERS.homeServices}
        height={130}
        eyebrow={t('Get a quote')}
        title={t('Post a requirement')}
        onPress={() => router.push('/requirement/new')}
      />
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {(
          [
            ['active', t('Active ({n})', { n: active.length })],
            ['done', t('Completed ({n})', { n: done.length })],
          ] as const
        ).map(([k, label]) => (
          <View key={k} style={{ flex: 1 }}>
            <Button
              title={label}
              kind={view === k ? 'primary' : 'outline'}
              onPress={() => setView(k)}
            />
          </View>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          {SEGMENTS.map(([k, label]) => (
            <Chip key={k} label={t(label)} selected={segment === k} onPress={() => setSegment(k)} />
          ))}
        </View>
      </ScrollView>

      {list.isPending ? <Loading /> : null}
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data && shown.length === 0 ? (
        <Empty
          icon="folder-open-outline"
          title={view === 'active' ? t('No active projects') : t('Nothing completed yet')}
          body={t('Post what you need and get quotes from verified professionals.')}
          action={
            view === 'active' ? (
              <Button
                title={t('Post a requirement')}
                onPress={() => router.push('/requirement/new')}
              />
            ) : undefined
          }
        />
      ) : null}

      {shown.map(({ r, job, stage }) => (
        <Card
          key={r.id}
          onPress={() => router.push(job && stage >= 2 ? `/job/${job.id}` : `/requirement/${r.id}`)}
        >
          <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
            <IconBadge name={TYPE_ICON[r.type] ?? 'construct'} tone="light" />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[
                  typeScale.xs,
                  { color: c.textMuted, fontFamily: font.semibold, letterSpacing: 1 },
                ]}
              >
                {d.requirementType[r.type].toUpperCase()}
              </Text>
              <Title>{r.title}</Title>
            </View>
            {stage === -1 ? (
              <Badge label={d.requirementStatus[r.status]} tone="neutral" />
            ) : (
              <Badge
                label={t(STAGES[stage]!)}
                tone={stage === 4 ? 'success' : stage >= 2 ? 'info' : 'warning'}
              />
            )}
          </View>
          {stage >= 0 ? (
            <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={t(STAGES[stage]!)}>
              {STAGES.map((s, i) => (
                <View
                  key={s}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor:
                      i <= stage ? (stage === 4 ? c.success : c.highlight) : c.border,
                  }}
                />
              ))}
            </View>
          ) : null}
          <Row>
            <Small>{t('Posted {when}', { when: ago(r.createdAt, t) })}</Small>
            {stage >= 0 ? <Small muted={false}>{t(NEXT[stage]!)}</Small> : null}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
