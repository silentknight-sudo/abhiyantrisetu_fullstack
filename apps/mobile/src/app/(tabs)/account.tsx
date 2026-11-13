import { CraftHeader } from '@/components/craft';
import { LOCALES } from '@setu/domain';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Switch } from 'react-native';
import {
  Avatar,
  Badge,
  Body,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  MenuRow,
  Notice,
  Row,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { Linking } from 'react-native';
import { View } from 'react-native';
import { spacing } from '@/lib/theme';
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
      <CraftHeader
        eyebrow={t('Signed in as')}
        title={
          (IS_PARTNER ? partner.data?.displayName : undefined) ||
          me.data?.name ||
          me.data?.phone ||
          '…'
        }
        body={me.data?.name || (IS_PARTNER && partner.data) ? (me.data?.phone ?? '') : undefined}
      >
        <View style={{ position: 'absolute', right: spacing[5], top: spacing[5] }}>
          <Avatar name={me.data?.name || me.data?.phone || ''} size={52} />
        </View>
      </CraftHeader>
      <Card>
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

      <Card>
        <MenuRow
          icon="notifications"
          label={t('Notifications')}
          onPress={() => router.push('/notifications')}
        />
        {IS_PARTNER ? (
          <MenuRow icon="wallet" label={t('Earnings')} onPress={() => router.push('/earnings')} />
        ) : (
          <>
            <MenuRow icon="sparkles" label="Setu AI" onPress={() => router.push('/assistant')} />
            <MenuRow
              icon="calculator"
              label={t('Cost calculator')}
              onPress={() => router.push('/calculator')}
            />
            <MenuRow
              icon="gift"
              label={t('Refer and earn')}
              onPress={() => router.push('/refer')}
            />
            <MenuRow
              icon="shield-checkmark"
              label={t('Care plans')}
              onPress={() => router.push('/care-plans')}
            />
            <MenuRow
              icon="business"
              label={t('Societies and builders')}
              onPress={() => router.push('/society')}
            />
          </>
        )}
        <MenuRow
          icon="logo-whatsapp"
          label={t('Help on WhatsApp')}
          onPress={() => void Linking.openURL('https://wa.me/919289553069')}
        />
        <MenuRow
          icon="document-text"
          label={t('Terms and privacy')}
          onPress={() => void Linking.openURL('https://www.abhiyantrisetu.com/')}
          last
        />
      </Card>

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
