import { SECTORS } from '@setu/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Loading,
  Notice,
  Row,
  Screen,
  Small,
} from '@/components/ui';
import { $api } from '@/lib/api';
import { cartStore, useCart } from '@/lib/cart';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** "I'll choose my professional": verified pros near the chosen sector. Same price either way. */
export default function ChoosePro() {
  const { t } = useI18n();
  const c = usePalette();
  const cart = useCart();
  const { sector } = useLocalSearchParams<{ sector?: string }>();
  const at = SECTORS.find((s) => s.name === sector) ?? SECTORS[0]!;
  const pros = $api.useQuery(
    'get',
    '/v1/catalog/pros',
    { params: { query: { category: cart.category ?? '', lat: at.lat, lng: at.lng } } },
    { enabled: Boolean(cart.category) },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Choose your professional') }} />
      <Small>
        {t('Verified professionals near {area}. The price stays the same.', { area: at.name })}
      </Small>
      {pros.isPending ? <Loading /> : null}
      {pros.error ? <Notice>{errorMessage(pros.error)}</Notice> : null}
      {pros.data && pros.data.length === 0 ? (
        <Empty
          icon="people-outline"
          title={t('No professional free near you right now')}
          body={t('Let Setu assign: we alert every verified professional nearby.')}
        />
      ) : null}
      {pros.data?.map((p, i) => {
        const selected = cart.pro?.id === p.id;
        const fresh = p.ratingCount === 0;
        return (
          <Card key={p.id} accent={selected ? c.highlight : undefined}>
            {i === 0 && !fresh ? (
              <Text
                style={[
                  typeScale.xs,
                  { color: c.highlight, fontFamily: font.semibold, letterSpacing: 1.2 },
                ]}
              >
                {t('Setu recommended').toUpperCase()}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <Avatar name={p.displayName} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[typeScale.base, { color: c.text, fontFamily: font.heading }]}>
                  {p.displayName}
                </Text>
                <Small>
                  {fresh
                    ? t('No reviews yet')
                    : `★ ${Number(p.ratingAvg).toFixed(1)} (${p.ratingCount}) · ${t('{n} jobs', { n: p.jobsDone })}`}
                  {` · ~${p.distanceKm} km`}
                </Small>
              </View>
            </View>
            <Row style={{ justifyContent: 'flex-start', gap: spacing[2] }}>
              <Badge label={`✓ ${t('Verified')}`} tone="success" />
              {p.gstRegistered ? <Badge label="✓ GST" tone="success" /> : null}
              {fresh ? <Badge label={t('New on Setu')} tone="info" /> : null}
            </Row>
            <Button
              testID={`choose-pro-${i}`}
              title={selected ? `✓ ${t('Selected')}` : t('Select')}
              kind={selected ? 'primary' : 'outline'}
              onPress={() => {
                cartStore.choosePro({ id: p.id, name: p.displayName });
                router.back();
              }}
            />
          </Card>
        );
      })}
      <Button
        title={t('Skip, let Setu assign')}
        kind="outline"
        onPress={() => {
          cartStore.choosePro(null);
          router.back();
        }}
      />
    </Screen>
  );
}
