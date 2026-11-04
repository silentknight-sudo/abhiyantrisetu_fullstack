import { router } from 'expo-router';
import { View } from 'react-native';
import {
  Card,
  Empty,
  IconBadge,
  type IconName,
  Loading,
  Notice,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { spacing } from '@/lib/theme';

const ICON: Record<string, IconName> = {
  lead_new: 'flash',
  quote_received: 'pricetag',
  hired: 'briefcase',
  job_update: 'construct',
};

/** Where a notification leads when tapped. */
function target(template: string, params: Record<string, unknown>): string | null {
  if (typeof params.jobId === 'string') return `/job/${params.jobId}`;
  if (typeof params.requirementId === 'string') return `/requirement/${params.requirementId}`;
  if (template === 'lead_new') return '/leads';
  return null;
}

export default function Notifications() {
  const { t } = useI18n();
  const inbox = $api.useQuery('get', '/v1/me/notifications');
  return (
    <Screen refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()}>
      {inbox.isPending ? <Loading /> : null}
      {inbox.error ? <Notice>{errorMessage(inbox.error)}</Notice> : null}
      {inbox.data?.length === 0 ? (
        <Empty
          icon="notifications-outline"
          title={t('No notifications yet')}
          body={t('Quotes, job updates and new leads will show up here.')}
        />
      ) : null}
      {inbox.data?.map((n) => {
        const href = target(n.template, (n.params ?? {}) as Record<string, unknown>);
        return (
          <Card key={n.id} onPress={href ? () => router.push(href as never) : undefined}>
            <View style={{ flexDirection: 'row', gap: spacing[3] }}>
              <IconBadge name={ICON[n.template] ?? 'notifications'} tone="light" size={40} />
              <View style={{ flex: 1, gap: 2 }}>
                <Title>{n.title}</Title>
                <Small muted={false}>{n.body}</Small>
                <Small>{ago(n.createdAt, t)}</Small>
              </View>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
