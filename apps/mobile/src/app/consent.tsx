import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card, Notice, Screen, Small, Title } from '@/components/ui';
import { client, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

/** The DPDP notice version this screen asks for. Bump it when the notice changes. */
export const CONSENT_VERSION = '2026-11';

/** Before you continue: required data, and two optional, separate choices. */
export default function Consent() {
  const { t } = useI18n();
  const c = usePalette();
  const [whatsapp, setWhatsapp] = useState(true);
  const [offers, setOffers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setBusy(true);
    setError(null);
    try {
      const me = await client.api.PATCH('/v1/me', {
        body: { consentVersion: CONSENT_VERSION, marketingOptIn: offers },
      });
      if (me.error) throw me.error;
      const wa = await client.api.POST('/v1/me/whatsapp-opt-in', { body: { optIn: whatsapp } });
      if (wa.error) throw wa.error;
      // The tabs read this profile to decide whether to ask again, so update it before leaving.
      queryClient.setQueriesData({ queryKey: ['get', '/v1/me'] }, me.data);
      router.replace('/');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const row = (
    title: string,
    body: string,
    value: boolean,
    onChange?: (v: boolean) => void,
    testID?: string,
  ) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[2],
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>{title}</Text>
        <Small>{body}</Small>
      </View>
      <Switch
        testID={testID}
        accessibilityLabel={title}
        value={value}
        disabled={!onChange}
        onValueChange={onChange}
        trackColor={{ true: c.success, false: c.border }}
      />
    </View>
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Before you continue'), headerBackVisible: false }} />
      <Title>{t('Your data, your choice')}</Title>
      <Small>
        {t(
          "Setu needs your consent to process your data under India's DPDP Act. You can change the optional choices anytime in Account.",
        )}
      </Small>
      <Card>
        {row(
          t('Required: account, address, job and payment data'),
          t('Needed to run your bookings, payments and safety messages.'),
          true,
        )}
        {row(
          t('WhatsApp updates on quotes, bookings and payments'),
          t('Service messages only. Reply STOP to stop.'),
          whatsapp,
          setWhatsapp,
          'consent-whatsapp',
        )}
        {row(
          t('Offers and construction tips'),
          t('Occasional offers. Off unless you turn it on.'),
          offers,
          setOffers,
          'consent-offers',
        )}
      </Card>
      {error ? <Notice>{error}</Notice> : null}
      <Button
        testID="consent-agree"
        title={t('Agree and continue')}
        kind="accent"
        loading={busy}
        onPress={() => void agree()}
      />
    </Screen>
  );
}
