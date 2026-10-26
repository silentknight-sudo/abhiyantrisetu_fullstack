import { LOCALES } from '@setu/domain';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Switch } from 'react-native';
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, client, queryClient } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { tradeName, VERIFICATION_LABEL } from '@/lib/format';
import { LANGUAGE_NAMES, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';

export default function Account() {
  const { t, locale, setLocale } = useI18n();
  const { signOut } = useSession();
  const me = $api.useQuery('get', '/v1/me');
  const partner = $api.useQuery('get', '/v1/partners/me', {}, { enabled: IS_PARTNER });
  const update = $api.useMutation('patch', '/v1/me', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['get', '/v1/me'] }),
  });
  const optIn = $api.useMutation('post', '/v1/me/whatsapp-opt-in');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState(false);
  useEffect(() => {
    if (!me.data) return;
    setName(me.data.name ?? '');
    setWhatsapp(Boolean(me.data.whatsappOptInAt));
  }, [me.data]);

  function confirmDelete() {
    const run = async () => {
      await client.api.DELETE('/v1/me');
      await signOut();
    };
    const title = t('Delete account?');
    const msg = t(
      'This removes your personal details. Past jobs and payments stay on record without your name.',
    );
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`${title}\n\n${msg}`)) void run();
      return;
    }
    Alert.alert(title, msg, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: () => void run() },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Small>{t('Signed in as')}</Small>
        <Title>{me.data?.phone ?? '…'}</Title>
        <Field label={t('Your name')} value={name} onChangeText={setName} placeholder={t('Name')} />
        <Small>{t('Language')}</Small>
        <Chips>
          {LOCALES.map((l) => (
            <Chip
              key={l}
              label={LANGUAGE_NAMES[l]}
              selected={locale === l}
              onPress={() => setLocale(l)}
            />
          ))}
        </Chips>
        {update.error ? <Notice>{errorMessage(update.error)}</Notice> : null}
        <Button
          title={t('Save')}
          kind="outline"
          loading={update.isPending}
          disabled={!name.trim() || name === me.data?.name}
          onPress={() => update.mutate({ body: { name: name.trim() } })}
        />
      </Card>

      <Card>
        <Row>
          <Body>{t('Updates on WhatsApp')}</Body>
          <Switch
            value={whatsapp}
            onValueChange={(v) => {
              setWhatsapp(v);
              optIn.mutate({ body: { optIn: v } });
            }}
          />
        </Row>
        <Small>
          {IS_PARTNER
            ? t('New leads with one-tap accept or decline.')
            : t('Quotes and job updates.')}{' '}
          {t('You can turn this off any time.')}
        </Small>
      </Card>

      {IS_PARTNER && partner.data ? (
        <Card>
          <Row>
            <Title>{partner.data.displayName}</Title>
            <Badge
              label={t(VERIFICATION_LABEL[partner.data.verificationStatus])}
              tone={partner.data.verificationStatus === 'verified' ? 'success' : 'warning'}
            />
          </Row>
          <Small>
            {partner.data.trades.map((s) => tradeName(s, t)).join(', ')} ·{' '}
            {t('within {km} km', { km: partner.data.serviceRadiusKm })}
          </Small>
          <Button
            title={t('Edit business profile')}
            kind="outline"
            onPress={() => router.push('/onboarding')}
          />
        </Card>
      ) : null}

      <Button
        title={t('Sign out')}
        kind="outline"
        testID="sign-out"
        onPress={() => void signOut()}
      />
      <Button title={t('Delete account')} kind="danger" onPress={confirmDelete} />
    </Screen>
  );
}
