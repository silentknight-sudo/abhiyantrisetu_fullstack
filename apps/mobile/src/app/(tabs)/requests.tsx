import { router } from 'expo-router';
import {
  Badge,
  Body,
  Button,
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
import { errorMessage } from '@/lib/errors';
import { ago, requirementStatusLabel, requirementTone, requirementTypeLabel } from '@/lib/format';

export default function Requests() {
  const list = $api.useQuery('get', '/v1/requirements');
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      {list.isPending ? <Loading /> : null}
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data?.length === 0 ? (
        <Empty
          title="No requests yet"
          body="Post what you need and get quotes from verified professionals."
          action={
            <Button title="Post a requirement" onPress={() => router.push('/requirement/new')} />
          }
        />
      ) : null}
      {list.data?.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/requirement/${r.id}`)}>
          <Row>
            <Small>{requirementTypeLabel(r.type)}</Small>
            <Badge label={requirementStatusLabel(r.status)} tone={requirementTone(r.status)} />
          </Row>
          <Title>{r.title}</Title>
          <Body muted>Posted {ago(r.createdAt)}</Body>
        </Card>
      ))}
    </Screen>
  );
}
