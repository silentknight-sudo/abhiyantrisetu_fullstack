import { router } from 'expo-router';
import {
  Badge,
  Body,
  Card,
  Empty,
  IconBadge,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
  toneColor,
} from '@/components/ui';
import { View } from 'react-native';
import { spacing, usePalette } from '@/lib/theme';
import { $api } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { jobTone, rupees, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Jobs() {
  const { t, d } = useI18n();
  const c = usePalette();
  const jobs = $api.useQuery('get', '/v1/jobs');
  const mine = (jobs.data ?? []).filter((j) =>
    IS_PARTNER ? j.viewerRole === 'partner' : j.viewerRole === 'customer',
  );
  return (
    <Screen refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()}>
      {jobs.isPending ? <Loading /> : null}
      {jobs.error ? <Notice>{errorMessage(jobs.error)}</Notice> : null}
      {jobs.data && mine.length === 0 ? (
        <Empty
          title={t('No jobs yet')}
          body={
            IS_PARTNER
              ? t('Send quotes on your leads. Jobs appear here once a customer hires you.')
              : t('Accept a quote to hire a professional. Your jobs appear here.')
          }
        />
      ) : null}
      {mine.map((j) => (
        <Card
          key={j.id}
          accent={toneColor(jobTone(j.state), c)}
          onPress={() => router.push(`/job/${j.id}`)}
        >
          <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
            <IconBadge name="briefcase" tone="light" />
            <View style={{ flex: 1, gap: 2 }}>
              <Title>{j.title}</Title>
              <Body>{rupees(j.agreedTotalPaise)}</Body>
            </View>
            <Badge label={d.jobState[j.state]} tone={jobTone(j.state)} />
          </View>
          <Small>
            {j.slotStart
              ? t('Visit {when}', { when: when(j.slotStart) })
              : t('Hired {when}', { when: when(j.createdAt) })}
          </Small>
        </Card>
      ))}
    </Screen>
  );
}
