import { router } from 'expo-router';
import { Badge, Body, Button, Card, Heading, Row, Screen, Small, Title } from '@/components/ui';
import { $api } from '@/lib/api';
import { jobStateLabel, jobTone, rupees } from '@/lib/format';

const STARTS = [
  {
    type: 'service',
    title: 'Repair & maintain',
    body: 'Plumber, electrician, AC, carpenter, painter',
  },
  { type: 'renovation', title: 'Renovate', body: 'Kitchen, bathroom, flooring, full home' },
  {
    type: 'consult',
    title: 'Ask an expert',
    body: 'Structural, architect, interior, cost estimate',
  },
] as const;

export default function Home() {
  const me = $api.useQuery('get', '/v1/me');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const active = (jobs.data ?? []).filter((j) => !['closed', 'cancelled'].includes(j.state));
  const firstName = me.data?.name?.split(' ')[0];

  return (
    <Screen refreshing={jobs.isRefetching} onRefresh={() => void jobs.refetch()}>
      <Heading>{firstName ? `Namaste, ${firstName}` : 'Namaste'}</Heading>
      <Body muted>
        What do you need done? Post once and verified professionals nearby send quotes.
      </Body>
      <Button
        title="Post a requirement"
        kind="accent"
        testID="post-requirement"
        onPress={() => router.push('/requirement/new')}
      />
      {STARTS.map((s) => (
        <Card
          key={s.type}
          onPress={() => router.push({ pathname: '/requirement/new', params: { type: s.type } })}
        >
          <Title>{s.title}</Title>
          <Small>{s.body}</Small>
        </Card>
      ))}
      {active.length > 0 ? (
        <>
          <Title>Active jobs</Title>
          {active.map((j) => (
            <Card key={j.id} onPress={() => router.push(`/job/${j.id}`)}>
              <Row>
                <Body>{rupees(j.agreedTotalPaise)}</Body>
                <Badge label={jobStateLabel(j.state)} tone={jobTone(j.state)} />
              </Row>
              <Title>{j.title}</Title>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
