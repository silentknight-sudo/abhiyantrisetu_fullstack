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
import { tradeLabel } from '@/lib/format';
import { useSession } from '@/lib/session';

const LANG: Record<(typeof LOCALES)[number], string> = {
  en: 'English',
  hi: 'हिन्दी',
  hinglish: 'Hinglish',
};

export default function Account() {
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
    const msg =
      'This removes your personal details. Past jobs and payments stay on record without your name.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(`Delete account?\n\n${msg}`)) void run();
      return;
    }
    Alert.alert('Delete account?', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void run() },
    ]);
  }

  return (
    <Screen>
      <Card>
        <Small>Signed in as</Small>
        <Title>{me.data?.phone ?? '…'}</Title>
        <Field label="Your name" value={name} onChangeText={setName} placeholder="Name" />
        <Small>Language</Small>
        <Chips>
          {LOCALES.map((l) => (
            <Chip
              key={l}
              label={LANG[l]}
              selected={me.data?.locale === l}
              onPress={() => update.mutate({ body: { locale: l } })}
            />
          ))}
        </Chips>
        {update.error ? <Notice>{errorMessage(update.error)}</Notice> : null}
        <Button
          title="Save"
          kind="outline"
          loading={update.isPending}
          disabled={!name.trim() || name === me.data?.name}
          onPress={() => update.mutate({ body: { name: name.trim() } })}
        />
      </Card>

      <Card>
        <Row>
          <Body>Updates on WhatsApp</Body>
          <Switch
            value={whatsapp}
            onValueChange={(v) => {
              setWhatsapp(v);
              optIn.mutate({ body: { optIn: v } });
            }}
          />
        </Row>
        <Small>
          {IS_PARTNER ? 'New leads with one-tap accept or decline.' : 'Quotes and job updates.'} You
          can turn this off any time.
        </Small>
      </Card>

      {IS_PARTNER && partner.data ? (
        <Card>
          <Row>
            <Title>{partner.data.displayName}</Title>
            <Badge
              label={partner.data.verificationStatus.replace('_', ' ')}
              tone={partner.data.verificationStatus === 'verified' ? 'success' : 'warning'}
            />
          </Row>
          <Small>
            {partner.data.trades.map(tradeLabel).join(', ')} · within {partner.data.serviceRadiusKm}{' '}
            km
          </Small>
          <Button
            title="Edit business profile"
            kind="outline"
            onPress={() => router.push('/onboarding')}
          />
        </Card>
      ) : null}

      <Button title="Sign out" kind="outline" testID="sign-out" onPress={() => void signOut()} />
      <Button title="Delete account" kind="danger" onPress={confirmDelete} />
    </Screen>
  );
}
