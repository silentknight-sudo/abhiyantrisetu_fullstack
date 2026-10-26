import { router } from 'expo-router';
import {
  Badge,
  Body,
  Card,
  Empty,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { jobTone, rupees, when } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Jobs() {
  const { t, d } = useI18n();
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
        <Card key={j.id} onPress={() => router.push(`/job/${j.id}`)}>
          <Row>
            <Body>{rupees(j.agreedTotalPaise)}</Body>
            <Badge label={d.jobState[j.state]} tone={jobTone(j.state)} />
          </Row>
          <Title>{j.title}</Title>
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
