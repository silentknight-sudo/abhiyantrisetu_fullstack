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
import { errorMessage } from '@/lib/errors';
import { ago, LEAD_STATUS, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Leads() {
  const { t, d } = useI18n();
  const partner = $api.useQuery('get', '/v1/partners/me');
  const leads = $api.useQuery('get', '/v1/partner/leads');
  const verified = partner.data?.verificationStatus === 'verified';

  return (
    <Screen refreshing={leads.isRefetching} onRefresh={() => void leads.refetch()}>
      {partner.data && !verified ? (
        <Notice tone="info">
          {t(
            'Your profile is being verified. You will start getting leads once our team has checked your documents.',
          )}
        </Notice>
      ) : null}
      {leads.isPending ? <Loading /> : null}
      {leads.error ? <Notice>{errorMessage(leads.error)}</Notice> : null}
      {leads.data?.length === 0 ? (
        <Empty
          title={t('No leads yet')}
          body={t('New jobs near you will appear here and on WhatsApp.')}
        />
      ) : null}
      {leads.data?.map((l) => {
        const [label, tone] = LEAD_STATUS[l.status];
        const budget = l.requirement.budgetMaxPaise;
        return (
          <Card key={l.id} onPress={() => router.push(`/lead/${l.id}`)}>
            <Row>
              <Small>
                {d.requirementType[l.requirement.type]} · {t('{km} km', { km: l.distanceKm })} ·{' '}
                {ago(l.sentAt, t)}
              </Small>
              <Badge label={t(label)} tone={tone} />
            </Row>
            <Title>{l.requirement.title}</Title>
            <Body muted>
              {[l.area.sector, l.area.city].filter(Boolean).join(', ')}
              {budget ? ` · ${t('up to {amount}', { amount: rupees(budget) })}` : ''}
            </Body>
          </Card>
        );
      })}
    </Screen>
  );
}
