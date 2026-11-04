import { router } from 'expo-router';
import {
  Badge,
  Banner,
  Body,
  Card,
  Empty,
  IconBadge,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
  Stat,
  Title,
  toneColor,
} from '@/components/ui';
import { View } from 'react-native';
import { BANNERS } from '@/lib/banners';
import { TYPE_ICON } from '@/lib/icons';
import { spacing, usePalette } from '@/lib/theme';
import { $api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago, LEAD_STATUS, rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';

export default function Leads() {
  const { t, d } = useI18n();
  const c = usePalette();
  const partner = $api.useQuery('get', '/v1/partners/me');
  const leads = $api.useQuery('get', '/v1/partner/leads');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const earnings = $api.useQuery('get', '/v1/partner/earnings', {}, { retry: false });
  const activeJobs = (jobs.data ?? []).filter(
    (j) => j.viewerRole === 'partner' && !['closed', 'cancelled'].includes(j.state),
  ).length;
  const verified = partner.data?.verificationStatus === 'verified';

  return (
    <Screen refreshing={leads.isRefetching} onRefresh={() => void leads.refetch()}>
      <Banner
        image={BANNERS.loginPartner}
        height={150}
        eyebrow={partner.data?.displayName ?? t('Your business')}
        title={t('New leads: {n}', {
          n: (leads.data ?? []).filter((l) => l.status === 'sent').length,
        })}
        body={t('New jobs near you will appear here and on WhatsApp.')}
      />
      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        <Stat
          icon="star"
          label={t('Rating')}
          value={partner.data?.ratingAvg ? partner.data.ratingAvg.toFixed(1) : '–'}
        />
        <Stat
          icon="briefcase"
          label={t('Active jobs')}
          value={String(activeJobs)}
          onPress={() => router.push('/jobs')}
        />
        <Stat
          icon="wallet"
          label={t('Next payout')}
          value={earnings.data ? rupees(earnings.data.owedPaise) : '–'}
          onPress={() => router.push('/earnings')}
        />
      </View>
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
          <Card key={l.id} accent={toneColor(tone, c)} onPress={() => router.push(`/lead/${l.id}`)}>
            <Row>
              <Small>
                {d.requirementType[l.requirement.type]} · {t('{km} km', { km: l.distanceKm })} ·{' '}
                {ago(l.sentAt, t)}
              </Small>
              <Badge label={t(label)} tone={tone} />
            </Row>
            <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
              <IconBadge name={TYPE_ICON[l.requirement.type] ?? 'construct'} tone="orange" />
              <View style={{ flex: 1 }}>
                <Title>{l.requirement.title}</Title>
              </View>
            </View>
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
