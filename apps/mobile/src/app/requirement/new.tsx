import { SECTORS } from '@setu/domain';
import { createRequirementSchema } from '@setu/schemas';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Body,
  Button,
  Card,
  Chip,
  Chips,
  Field,
  Notice,
  Screen,
  Small,
  Title,
} from '@/components/ui';
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

type Kind = 'service' | 'renovation' | 'consult';

const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'service', label: 'Repair & maintain' },
  { kind: 'renovation', label: 'Renovate' },
  { kind: 'consult', label: 'Ask an expert' },
];
const URGENCY = [
  ['asap', 'Right away'],
  ['today', 'Today'],
  ['this_week', 'This week'],
  ['flexible', 'Flexible'],
] as const;
const PROPERTY = [
  ['apartment', 'Apartment'],
  ['independent_house', 'House'],
  ['villa', 'Villa'],
  ['commercial', 'Shop / office'],
] as const;
const SCOPE = [
  'Kitchen',
  'Bathroom',
  'Flooring',
  'Painting',
  'Electrical',
  'Plumbing',
  'Waterproofing',
  'Full home',
];
const TOPICS = [
  ['structural', 'Structural'],
  ['architecture', 'Architecture'],
  ['interior', 'Interior'],
  ['vastu', 'Vastu'],
  ['cost_estimate', 'Cost estimate'],
  ['other', 'Other'],
] as const;

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

export default function NewRequirement() {
  const params = useLocalSearchParams<{ type?: string }>();
  const [kind, setKind] = useState<Kind>(
    KINDS.some((k) => k.kind === params.type) ? (params.type as Kind) : 'service',
  );
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<(typeof URGENCY)[number][0]>('flexible');
  const [propertyType, setPropertyType] = useState<(typeof PROPERTY)[number][0]>('apartment');
  const [scope, setScope] = useState<string[]>([]);
  const [areaSqft, setAreaSqft] = useState('');
  const [topic, setTopic] = useState<(typeof TOPICS)[number][0]>('structural');
  const [budget, setBudget] = useState('');
  const [sector, setSector] = useState<(typeof SECTORS)[number]>(SECTORS[0]);
  const [line1, setLine1] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalog = $api.useQuery('get', '/v1/catalog/categories');
  const categories = (catalog.data ?? []).filter((c) => c.requirementType === kind);
  const create = $api.useMutation('post', '/v1/requirements', {
    onSuccess: (req) => {
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/requirements'] });
      router.replace(`/requirement/${req.id}`);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  async function locate() {
    setLocating(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted')
        throw new Error('Location permission was not given. Pick your sector instead.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLocating(false);
    }
  }

  function submit() {
    setError(null);
    const details =
      kind === 'service'
        ? { description, urgency }
        : kind === 'renovation'
          ? { propertyType, scope, description, areaSqft: areaSqft ? Number(areaSqft) : undefined }
          : { topic, description };
    const rupees = Number(budget.replace(/[^\d]/g, ''));
    const parsed = createRequirementSchema.safeParse({
      type: kind,
      title,
      categoryId,
      details,
      budgetMaxPaise: rupees > 0 ? rupees * 100 : undefined,
      address: {
        line1,
        sector: sector.name,
        city: 'Greater Noida',
        pincode: sector.pincode,
        location: gps ?? { lat: sector.lat, lng: sector.lng },
      },
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Check the form');
    create.mutate({ body: parsed.data });
  }

  return (
    <Screen>
      <Chips>
        {KINDS.map((k) => (
          <Chip
            key={k.kind}
            label={k.label}
            selected={kind === k.kind}
            onPress={() => {
              setKind(k.kind);
              setCategoryId(undefined);
            }}
          />
        ))}
      </Chips>

      {categories.length > 0 ? (
        <Card>
          <Title>What kind of work?</Title>
          <Chips>
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={c.nameEn}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
              />
            ))}
          </Chips>
        </Card>
      ) : null}

      <Field
        label="Title"
        testID="title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Kitchen tap leaking"
        maxLength={120}
      />

      {kind === 'renovation' ? (
        <Card>
          <Title>Property</Title>
          <Chips>
            {PROPERTY.map(([v, l]) => (
              <Chip
                key={v}
                label={l}
                selected={propertyType === v}
                onPress={() => setPropertyType(v)}
              />
            ))}
          </Chips>
          <Small>Areas of work</Small>
          <Chips>
            {SCOPE.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={scope.includes(s)}
                onPress={() => setScope(toggle(scope, s))}
              />
            ))}
          </Chips>
          <Field
            label="Carpet area (sq ft, optional)"
            value={areaSqft}
            onChangeText={setAreaSqft}
            keyboardType="number-pad"
          />
        </Card>
      ) : null}

      {kind === 'consult' ? (
        <Card>
          <Title>Topic</Title>
          <Chips>
            {TOPICS.map(([v, l]) => (
              <Chip key={v} label={l} selected={topic === v} onPress={() => setTopic(v)} />
            ))}
          </Chips>
        </Card>
      ) : null}

      <Field
        label="Describe the work"
        testID="description"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What is the problem, how big is the job, anything the professional should know"
        maxLength={2000}
      />

      {kind === 'service' ? (
        <Card>
          <Title>When?</Title>
          <Chips>
            {URGENCY.map(([v, l]) => (
              <Chip key={v} label={l} selected={urgency === v} onPress={() => setUrgency(v)} />
            ))}
          </Chips>
        </Card>
      ) : null}

      <Field
        label="Budget up to (₹, optional)"
        value={budget}
        onChangeText={setBudget}
        keyboardType="number-pad"
        hint="Leave empty if you'd like professionals to suggest a price."
      />

      <Card>
        <Title>Where?</Title>
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
        <Field
          label="Flat / house, tower and society"
          testID="line1"
          value={line1}
          onChangeText={setLine1}
          placeholder="e.g. C-1203, Tower C, Ansal Golf Links"
        />
        <Button
          title={gps ? 'Exact location added ✓' : 'Use my exact location'}
          kind="outline"
          loading={locating}
          onPress={locate}
        />
        <Small>Professionals only see your sector until you hire them.</Small>
      </Card>

      {error ? <Notice>{error}</Notice> : null}
      <Button
        title="Post requirement"
        kind="accent"
        testID="submit"
        loading={create.isPending}
        onPress={submit}
      />
      <Body muted>
        Verified professionals nearby are notified right away. Quotes usually arrive within a few
        hours.
      </Body>
    </Screen>
  );
}
