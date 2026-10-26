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
import { ago, requirementTone } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Requests() {
  const { t, d } = useI18n();
  const list = $api.useQuery('get', '/v1/requirements');
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      {list.isPending ? <Loading /> : null}
      {list.error ? <Notice>{errorMessage(list.error)}</Notice> : null}
      {list.data?.length === 0 ? (
        <Empty
          title={t('No requests yet')}
          body={t('Post what you need and get quotes from verified professionals.')}
          action={
            <Button
              title={t('Post a requirement')}
              onPress={() => router.push('/requirement/new')}
            />
          }
        />
      ) : null}
      {list.data?.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/requirement/${r.id}`)}>
          <Row>
            <Small>{d.requirementType[r.type]}</Small>
            <Badge label={d.requirementStatus[r.status]} tone={requirementTone(r.status)} />
          </Row>
          <Title>{r.title}</Title>
          <Body muted>{t('Posted {when}', { when: ago(r.createdAt, t) })}</Body>
        </Card>
      ))}
    </Screen>
  );
}
