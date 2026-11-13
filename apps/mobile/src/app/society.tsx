import { SECTORS } from '@setu/domain';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Chip, Chips, Field, Notice, Screen, Small, Title } from '@/components/ui';
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { type MessageKey, useI18n } from '@/lib/i18n';

const WHO: MessageKey[] = ['RWA / society', 'Builder', 'Facility manager'];
const WORK: MessageKey[] = [
  'Terrace waterproofing',
  'Common area painting',
  'Plumbing audit · all flats',
  'Electrical safety audit',
  'Pest control · all flats',
  'Deep cleaning · lobbies',
];
const SIZE: MessageKey[] = ['1 tower', '2–4 towers', '5–10 towers', '10+ towers'];
const WHEN: MessageKey[] = ['This month', 'Next month', 'Before monsoon', 'Flexible'];

/** Societies and builders: one request for many flats or towers, answered with a site survey. */
export default function Society() {
  const { t } = useI18n();
  const [who, setWho] = useState<MessageKey>(WHO[0]!);
  const [name, setName] = useState('');
  const [work, setWork] = useState<MessageKey[]>([]);
  const [size, setSize] = useState<MessageKey>(SIZE[0]!);
  const [when, setWhen] = useState<MessageKey>(WHEN[0]!);
  const [sector, setSector] = useState<(typeof SECTORS)[number]>(SECTORS[0]!);
  const [error, setError] = useState<string | null>(null);
  const create = $api.useMutation('post', '/v1/requirements', {
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/requirements'] });
      router.replace(`/requirement/${r.id}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  function submit() {
    setError(null);
    if (name.trim().length < 3) return setError(t('Add the society or project name'));
    if (!work.length) return setError(t('Pick the work needed'));
    create.mutate({
      body: {
        type: 'renovation',
        title: t('Site survey: {name}', { name: name.trim() }).slice(0, 120),
        address: {
          line1: name.trim(),
          sector: sector.name,
          city: 'Greater Noida',
          pincode: sector.pincode,
          location: { lat: sector.lat, lng: sector.lng },
        },
        details: {
          propertyType: 'apartment',
          scope: work.map((w) => t(w)).slice(0, 20),
          description: [
            `${t(who)} · ${name.trim()}`,
            `${t('Size')}: ${t(size)} · ${t('When')}: ${t(when)}`,
            t('One contract, one supervisor, tower-by-tower tracking, one GST invoice.'),
          ].join('\n'),
          wantsSiteVisit: true,
        },
      },
    });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: t('Societies and builders') }} />
      <Card>
        <Title>{t('One request for many flats or towers')}</Title>
        <Small>
          {t(
            'For RWAs, builders and facility managers: one supervisor, tower-by-tower tracking and a single GST invoice.',
          )}
        </Small>
      </Card>
      <Title>{t('You are')}</Title>
      <Chips>
        {WHO.map((w) => (
          <Chip key={w} label={t(w)} selected={who === w} onPress={() => setWho(w)} />
        ))}
      </Chips>
      <Field
        label={t('Society or project name')}
        value={name}
        onChangeText={setName}
        placeholder={t('e.g. Ace City, Greater Noida West')}
        testID="society-name"
      />
      <Title>{t('Work needed')}</Title>
      <Chips>
        {WORK.map((w) => (
          <Chip
            key={w}
            label={t(w)}
            selected={work.includes(w)}
            onPress={() => setWork(work.includes(w) ? work.filter((x) => x !== w) : [...work, w])}
          />
        ))}
      </Chips>
      <Title>{t('Size')}</Title>
      <Chips>
        {SIZE.map((s) => (
          <Chip key={s} label={t(s)} selected={size === s} onPress={() => setSize(s)} />
        ))}
      </Chips>
      <Title>{t('When')}</Title>
      <Chips>
        {WHEN.map((w) => (
          <Chip key={w} label={t(w)} selected={when === w} onPress={() => setWhen(w)} />
        ))}
      </Chips>
      <Title>{t('Where?')}</Title>
      <Chips>
        {SECTORS.map((s) => (
          <Chip
            key={s.slug}
            label={s.name}
            selected={sector.slug === s.slug}
            onPress={() => setSector(s)}
          />
        ))}
      </Chips>
      {error ? <Notice>{error}</Notice> : null}
      <Button
        title={t('Request site survey')}
        kind="accent"
        testID="society-submit"
        loading={create.isPending}
        onPress={submit}
      />
    </Screen>
  );
}
