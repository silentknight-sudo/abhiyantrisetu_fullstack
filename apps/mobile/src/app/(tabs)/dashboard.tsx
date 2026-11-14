import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Badge,
  Card,
  Empty,
  MenuRow,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { rupees, tradeName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Partner home: online switch, this week's money, what needs doing today and how they rank. */
export default function PartnerDashboard() {
  const { t } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const partner = $api.useQuery('get', '/v1/partners/me');
  const leads = $api.useQuery('get', '/v1/partner/leads');
  const jobs = $api.useQuery('get', '/v1/jobs');
  const earnings = $api.useQuery('get', '/v1/partner/earnings', {}, { retry: false });

  const p = partner.data;
  const mine = (jobs.data ?? []).filter((j) => j.viewerRole === 'partner');
  const today = mine
    .filter((j) => j.slotStart && sameDay(new Date(j.slotStart), new Date()))
    .filter((j) => ['scheduled', 'in_progress'].includes(j.state))
    .sort((a, b) => (a.slotStart! < b.slotStart! ? -1 : 1));
  const upcoming = mine.filter(
    (j) => j.state === 'scheduled' && j.slotStart && new Date(j.slotStart) > new Date(),
  ).length;
  const done = mine.filter((j) => j.state === 'closed').length;
  const newLeads = (leads.data ?? []).filter((l) => l.status === 'sent').length;
  const verified = p?.verificationStatus === 'verified';
  const online = p?.isOnline ?? true;
  const docs = $api.useQuery('get', '/v1/partners/me/documents');
  const expiring = (docs.data?.documents ?? []).filter(
    (x) => x.expiresInDays != null && x.expiresInDays <= 30,
  );
  const docAlert = docs.data?.missing.length
    ? t('{n} documents still needed before you can get leads.', { n: docs.data.missing.length })
    : expiring.length
      ? t('A document expires in {n} days. Renew it to keep your badge.', {
          n: Math.max(0, Math.min(...expiring.map((x) => x.expiresInDays ?? 0))),
        })
      : null;

  async function toggle(next: boolean) {
    await client.api.PUT('/v1/partners/me/availability', { body: { online: next } });
    await queryClient.invalidateQueries({ queryKey: ['get', '/v1/partners/me'] });
  }
  const refresh = () => {
    void partner.refetch();
    void leads.refetch();
    void jobs.refetch();
    void earnings.refetch();
  };

  return (
    <Screen padded={false} edges={[]} refreshing={jobs.isRefetching} onRefresh={refresh}>
      {/* Header: who, verified, online switch */}
      <View
        style={{
          paddingTop: insets.top + spacing[3],
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[4],
          backgroundColor: c.surface,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
        }}
      >
        <Avatar name={p?.displayName ?? ''} size={46} />
        <View style={{ flex: 1 }}>
          <Text
            style={[typeScale.lg, { color: c.text, fontFamily: font.heading }]}
            numberOfLines={1}
          >
            {t('Namaste, {name}', { name: p?.displayName?.split(' ')[0] ?? '' })}
          </Text>
          <Small>
            {(p?.trades ?? []).map((x) => tradeName(x, t)).join(', ')}
            {verified ? ` · ✓ ${t('Verified')}` : ''}
          </Small>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Switch
            testID="online-switch"
            accessibilityLabel={t('Online for new jobs')}
            value={online}
            onValueChange={(v) => void toggle(v)}
            trackColor={{ true: c.success, false: c.border }}
          />
          <Text
            style={[
              typeScale.xs,
              { color: online ? c.success : c.textMuted, fontFamily: font.semibold },
            ]}
          >
            {online ? t('Online') : t('Offline')}
          </Text>
        </View>
      </View>

      <View style={{ padding: spacing[4], gap: spacing[4] }}>
        {!online ? (
          <Notice tone="info">
            {t('You are offline. Customers near you will not see you for new jobs.')}
          </Notice>
        ) : null}
        {docAlert ? (
          <Pressable
            accessibilityRole="button"
            testID="docs-alert"
            onPress={() => router.push('/documents')}
          >
            <Notice tone="info">{docAlert} ›</Notice>
          </Pressable>
        ) : null}
        {p && !verified ? (
          <Notice tone="info">
            {t(
              'Your profile is being verified. You will start getting leads once our team has checked your documents.',
            )}
          </Notice>
        ) : null}

        {/* This week's money */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/payouts')}
          style={[
            shadow,
            {
              borderRadius: 22,
              backgroundColor: '#1E1B4F',
              padding: spacing[5],
              gap: spacing[2],
            },
          ]}
        >
          <Row>
            <Text
              style={[
                typeScale.xs,
                { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.4 },
              ]}
            >
              {t('This week').toUpperCase()}
            </Text>
            <Text style={[typeScale.sm, { color: c.highlight, fontFamily: font.semibold }]}>
              {t('Details')} ›
            </Text>
          </Row>
          <Text style={[typeScale['4xl'], { color: '#fff', fontFamily: font.headingHeavy }]}>
            {rupees(earnings.data?.thisWeekPaise ?? 0)}
          </Text>
          <Text style={[typeScale.sm, { color: 'rgba(255,255,255,0.75)', fontFamily: font.body }]}>
            {t('Next payout: {amount}', { amount: rupees(earnings.data?.owedPaise ?? 0) })}
          </Text>
        </Pressable>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: spacing[3] }}>
          {(
            [
              [String(newLeads), 'New leads', '/leads'],
              [p?.ratingAvg ? `★ ${Number(p.ratingAvg).toFixed(1)}` : '–', 'Rating', '/account'],
              [String(upcoming), 'Upcoming', '/jobs'],
            ] as const
          ).map(([value, label, href]) => (
            <Pressable
              key={label}
              accessibilityRole="button"
              onPress={() => router.push(href)}
              style={[
                shadow,
                {
                  flex: 1,
                  borderRadius: 18,
                  padding: spacing[3],
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                  gap: 2,
                },
              ]}
            >
              <Small>{t(label)}</Small>
              <Text style={[typeScale.xl, { color: c.text, fontFamily: font.heading }]}>
                {value}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Today */}
        <Title>{t("Today's jobs")}</Title>
        {today.length === 0 ? (
          <Empty
            icon="calendar-outline"
            title={t('No jobs today')}
            body={t('Accept a lead to see it here.')}
          />
        ) : (
          today.map((j) => (
            <Card key={j.id} onPress={() => router.push(`/job/${j.id}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View
                  style={{
                    borderRadius: 12,
                    backgroundColor: c.highlightBg,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    alignItems: 'center',
                  }}
                >
                  <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                    {time(j.slotStart!)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Title>{j.title}</Title>
                  <Small>{rupees(j.agreedTotalPaise)}</Small>
                </View>
                <Badge
                  label={j.state === 'in_progress' ? t('Working') : t('Next')}
                  tone={j.state === 'in_progress' ? 'info' : 'success'}
                />
              </View>
            </Card>
          ))
        )}

        {/* How you rank */}
        <Title>{t('How you rank')}</Title>
        <Card>
          <Row>
            <Small muted={false}>{t('Jobs completed')}</Small>
            <Title>{String(done)}</Title>
          </Row>
          <Row>
            <Small muted={false}>{t('Reviews')}</Small>
            <Title>{String(p?.ratingCount ?? 0)}</Title>
          </Row>
          <Row>
            <Small muted={false}>{t('Service area')}</Small>
            <Title>{t('{n} km', { n: p?.serviceRadiusKm ?? 10 })}</Title>
          </Row>
          <Small>{t("Ranking can't be bought. It depends on how you serve customers.")}</Small>
        </Card>

        <Card>
          <MenuRow
            icon="wallet-outline"
            label={t('Earnings & payouts')}
            onPress={() => router.push('/payouts')}
          />
          <MenuRow
            icon="briefcase-outline"
            label={t('Edit business profile')}
            onPress={() => router.push('/onboarding')}
          />
          <MenuRow
            icon="notifications-outline"
            label={t('Notifications')}
            onPress={() => router.push('/notifications')}
            last
          />
        </Card>
      </View>
    </Screen>
  );
}
