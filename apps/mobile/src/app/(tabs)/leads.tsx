import { router } from 'expo-router';
import {
  Badge,
  Body,
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
import { Image, type ImageSourcePropType, Text, View } from 'react-native';
import { TYPE_ICON } from '@/lib/icons';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';
import { $api } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { ago, leadBadge, rupees, when } from '@/lib/format';
import { CATEGORY_IMAGES } from '@/lib/banners';
import { useI18n } from '@/lib/i18n';

/** A partner's main trade, shown as the photo on their lead cards. */
const TRADE_PHOTO: Record<string, ImageSourcePropType | undefined> = {
  plumber: CATEGORY_IMAGES.plumbing,
  electrician: CATEGORY_IMAGES.electrical,
  'ac-technician': CATEGORY_IMAGES['ac-repair'],
  carpenter: CATEGORY_IMAGES.carpentry,
  painter: CATEGORY_IMAGES.painting,
};

export default function Leads() {
  const { t, d } = useI18n();
  const c = usePalette();
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
        const [label, tone] = leadBadge(l);
        const budget = l.requirement.budgetMaxPaise;
        const booking = l.requirement.details.booking as
          { totalPaise: number; slotStart: string } | undefined;
        const photo = TRADE_PHOTO[partner.data?.trades[0] ?? ''];
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
              {photo ? (
                <Image
                  source={photo}
                  accessibilityIgnoresInvertColors
                  style={{ width: 48, height: 48, borderRadius: 12 }}
                />
              ) : (
                <IconBadge name={TYPE_ICON[l.requirement.type] ?? 'construct'} tone="orange" />
              )}
              <View style={{ flex: 1, gap: 2 }}>
                {booking ? (
                  <Text
                    style={[
                      typeScale.xs,
                      { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.2 },
                    ]}
                  >
                    {t('Instant booking').toUpperCase()}
                  </Text>
                ) : null}
                <Title>{l.requirement.title}</Title>
              </View>
            </View>
            {booking ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: c.surfaceMuted,
                  borderRadius: 12,
                  paddingHorizontal: spacing[3],
                  paddingVertical: spacing[2],
                }}
              >
                <Small muted={false}>{t('Slot: {when}', { when: when(booking.slotStart) })}</Small>
                <Text style={[typeScale.sm, { color: c.text, fontFamily: font.heading }]}>
                  {t('You earn {amount}', { amount: rupees(booking.totalPaise) })}
                </Text>
              </View>
            ) : null}
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
