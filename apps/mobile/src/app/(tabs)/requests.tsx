import { router } from 'expo-router';
import {
  Badge,
  Banner,
  Body,
  Button,
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
import { BANNERS } from '@/lib/banners';
import { TYPE_ICON } from '@/lib/icons';
import { spacing, usePalette } from '@/lib/theme';
import { $api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago, requirementTone } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Requests() {
  const { t, d } = useI18n();
  const c = usePalette();
  const list = $api.useQuery('get', '/v1/requirements');
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Banner
        image={BANNERS.homeServices}
        height={140}
        eyebrow={t('Get a quote')}
        title={t('Post a requirement')}
        onPress={() => router.push('/requirement/new')}
      />
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
        <Card
          key={r.id}
          accent={toneColor(requirementTone(r.status), c)}
          onPress={() => router.push(`/requirement/${r.id}`)}
        >
          <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
            <IconBadge name={TYPE_ICON[r.type] ?? 'construct'} tone="light" />
            <View style={{ flex: 1, gap: 2 }}>
              <Small>{d.requirementType[r.type]}</Small>
              <Title>{r.title}</Title>
            </View>
          </View>
          <Row>
            <Body muted>{t('Posted {when}', { when: ago(r.createdAt, t) })}</Body>
            <Badge label={d.requirementStatus[r.status]} tone={requirementTone(r.status)} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
