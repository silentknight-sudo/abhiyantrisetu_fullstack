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
import { ago, LEAD_STATUS, requirementTypeLabel, rupees } from '@/lib/format';

export default function Leads() {
  const partner = $api.useQuery('get', '/v1/partners/me');
  const leads = $api.useQuery('get', '/v1/partner/leads');
  const verified = partner.data?.verificationStatus === 'verified';

  return (
    <Screen refreshing={leads.isRefetching} onRefresh={() => void leads.refetch()}>
      {partner.data && !verified ? (
        <Notice tone="info">
          Your profile is being verified. You will start getting leads once our team has checked
          your documents.
        </Notice>
      ) : null}
      {leads.isPending ? <Loading /> : null}
      {leads.error ? <Notice>{errorMessage(leads.error)}</Notice> : null}
      {leads.data?.length === 0 ? (
        <Empty title="No leads yet" body="New jobs near you will appear here and on WhatsApp." />
      ) : null}
      {leads.data?.map((l) => {
        const [label, tone] = LEAD_STATUS[l.status];
        const budget = l.requirement.budgetMaxPaise;
        return (
          <Card key={l.id} onPress={() => router.push(`/lead/${l.id}`)}>
            <Row>
              <Small>
                {requirementTypeLabel(l.requirement.type)} · {l.distanceKm} km · {ago(l.sentAt)}
              </Small>
              <Badge label={label} tone={tone} />
            </Row>
            <Title>{l.requirement.title}</Title>
            <Body muted>
              {[l.area.sector, l.area.city].filter(Boolean).join(', ')}
              {budget ? ` · up to ${rupees(budget)}` : ''}
            </Body>
          </Card>
        );
      })}
    </Screen>
  );
}
