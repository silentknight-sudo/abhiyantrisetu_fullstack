import { View } from 'react-native';
import { Card, Small, Title } from './ui';
import { when } from '@/lib/format';
import { type MessageKey, useI18n } from '@/lib/i18n';
import { spacing, usePalette } from '@/lib/theme';

type Job = {
  state: string;
  createdAt: string;
  onTheWayAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

/** The customer's live view of a visit: confirmed → on the way → started → completed. */
export function LiveStatus({ job }: { job: Job }) {
  const { t } = useI18n();
  const c = usePalette();
  if (['cancelled', 'disputed'].includes(job.state)) return null;
  const steps: [MessageKey, MessageKey, string | null | undefined][] = [
    ['Booking confirmed', 'Your professional accepted the booking', job.createdAt],
    ['On the way', 'Your professional has left for your address', job.onTheWayAt],
    ['Job started', 'Started after you shared the start code', job.startedAt],
    ['Completed', 'Check the work, then confirm to release payment', job.completedAt],
  ];
  const current = steps.findIndex(([, , at]) => !at);
  return (
    <Card>
      <Title>{t('Live status')}</Title>
      {steps.map(([title, body, at], i) => {
        const done = Boolean(at);
        const now = i === current;
        return (
          <View key={title} style={{ flexDirection: 'row', gap: spacing[3] }}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  marginTop: 3,
                  backgroundColor: done ? c.success : now ? c.highlight : c.border,
                }}
              />
              {i < steps.length - 1 ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 18,
                    backgroundColor: done ? c.success : c.border,
                  }}
                />
              ) : null}
            </View>
            <View style={{ flex: 1, paddingBottom: spacing[2] }}>
              <Small muted={!done && !now}>{t(title)}</Small>
              <Small>{done ? when(at!) : t(body)}</Small>
            </View>
          </View>
        );
      })}
    </Card>
  );
}
