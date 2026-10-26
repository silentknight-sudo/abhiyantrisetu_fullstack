import { SECTORS } from '@setu/domain';
import { createRequirementSchema } from '@setu/schemas';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
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
import { PhotoPicker } from '@/components/PhotoPicker';
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { type MessageKey, useI18n } from '@/lib/i18n';

type Kind = 'service' | 'renovation' | 'consult' | 'material_rfq' | 'equipment';

const KINDS: { kind: Kind; label: MessageKey }[] = [
  { kind: 'service', label: 'Repair & maintain' },
  { kind: 'renovation', label: 'Renovate' },
  { kind: 'consult', label: 'Ask an expert' },
  { kind: 'material_rfq', label: 'Buy materials' },
  { kind: 'equipment', label: 'Rent equipment' },
];
const TITLE_HINT: Record<Kind, MessageKey> = {
  service: 'e.g. Kitchen tap leaking',
  renovation: 'e.g. Redo the master bathroom',
  consult: 'e.g. Crack in the living room beam',
  material_rfq: 'e.g. Cement and TMT bars for the slab',
  equipment: 'e.g. JCB for foundation digging',
};
/** Units the materials schema accepts. */
const UNITS = [
  'bag',
  'kg',
  'tonne',
  'cft',
  'cum',
  'sqft',
  'piece',
  'litre',
  'metre',
  'truck',
] as const;
type Unit = (typeof UNITS)[number];
interface MaterialRow {
  name: string;
  quantity: string;
  unit: Unit;
}

/** The next 7 days as YYYY-MM-DD (local time) with a short label. */
function nextDays(dateLocale: string, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      iso,
      label: d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });
}
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
] as const;
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
  const { t, locale } = useI18n();
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
  const [materials, setMaterials] = useState<MaterialRow[]>([
    { name: '', quantity: '', unit: 'bag' },
  ]);
  const [needsUnloading, setNeedsUnloading] = useState(false);
  const [equipmentType, setEquipmentType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationDays, setDurationDays] = useState('3');
  const [withOperator, setWithOperator] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
        throw new Error(t('Location permission was not given. Pick your sector instead.'));
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
        ? { description, urgency, photos }
        : kind === 'renovation'
          ? {
              propertyType,
              scope,
              description,
              areaSqft: areaSqft ? Number(areaSqft) : undefined,
              photos,
            }
          : kind === 'consult'
            ? { topic, description }
            : kind === 'material_rfq'
              ? {
                  items: materials
                    .filter((m) => m.name.trim() || m.quantity.trim())
                    .map((m) => ({
                      name: m.name.trim(),
                      quantity: Number(m.quantity),
                      unit: m.unit,
                    })),
                  needsUnloading,
                }
              : {
                  equipmentType,
                  startDate,
                  durationDays: Number(durationDays),
                  withOperator,
                  spec: description.trim() || undefined,
                };
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
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? t('Check the form'));
    create.mutate({ body: parsed.data });
  }

  return (
    <Screen>
      <Chips>
        {KINDS.map((k) => (
          <Chip
            key={k.kind}
            label={t(k.label)}
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
          <Title>{t('What kind of work?')}</Title>
          <Chips>
            {categories.map((c) => (
              <Chip
                key={c.id}
                label={locale === 'hi' ? c.nameHi : c.nameEn}
                selected={categoryId === c.id}
                onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
              />
            ))}
          </Chips>
        </Card>
      ) : null}

      <Field
        label={t('Title')}
        testID="title"
        value={title}
        onChangeText={setTitle}
        placeholder={t(TITLE_HINT[kind])}
        maxLength={120}
      />

      {kind === 'renovation' ? (
        <Card>
          <Title>{t('Property')}</Title>
          <Chips>
            {PROPERTY.map(([v, l]) => (
              <Chip
                key={v}
                label={t(l)}
                selected={propertyType === v}
                onPress={() => setPropertyType(v)}
              />
            ))}
          </Chips>
          <Small>{t('Areas of work')}</Small>
          <Chips>
            {SCOPE.map((s) => (
              <Chip
                key={s}
                label={t(s)}
                selected={scope.includes(s)}
                onPress={() => setScope(toggle(scope, s))}
              />
            ))}
          </Chips>
          <Field
            label={t('Carpet area (sq ft, optional)')}
            value={areaSqft}
            onChangeText={setAreaSqft}
            keyboardType="number-pad"
          />
        </Card>
      ) : null}

      {kind === 'consult' ? (
        <Card>
          <Title>{t('Topic')}</Title>
          <Chips>
            {TOPICS.map(([v, l]) => (
              <Chip key={v} label={t(l)} selected={topic === v} onPress={() => setTopic(v)} />
            ))}
          </Chips>
        </Card>
      ) : null}

      {kind === 'material_rfq' ? (
        <Card>
          <Title>{t('What do you need?')}</Title>
          {materials.map((m, i) => (
            <View key={i} style={{ gap: 8 }}>
              <Field
                label={t('Item {n}', { n: i + 1 })}
                testID={`material-${i}-name`}
                value={m.name}
                onChangeText={(v) =>
                  setMaterials(materials.map((r, j) => (j === i ? { ...r, name: v } : r)))
                }
                placeholder={t('e.g. OPC 53 grade cement')}
              />
              <Field
                label={t('Quantity')}
                testID={`material-${i}-qty`}
                value={m.quantity}
                onChangeText={(v) =>
                  setMaterials(materials.map((r, j) => (j === i ? { ...r, quantity: v } : r)))
                }
                keyboardType="decimal-pad"
              />
              <Chips>
                {UNITS.map((u) => (
                  <Chip
                    key={u}
                    label={u}
                    selected={m.unit === u}
                    onPress={() =>
                      setMaterials(materials.map((r, j) => (j === i ? { ...r, unit: u } : r)))
                    }
                  />
                ))}
              </Chips>
            </View>
          ))}
          <Button
            title={t('Add another item')}
            kind="outline"
            onPress={() => setMaterials([...materials, { name: '', quantity: '', unit: 'bag' }])}
          />
          <Chips>
            <Chip
              label={t('We will unload')}
              selected={!needsUnloading}
              onPress={() => setNeedsUnloading(false)}
            />
            <Chip
              label={t('Supplier unloads')}
              selected={needsUnloading}
              onPress={() => setNeedsUnloading(true)}
            />
          </Chips>
        </Card>
      ) : null}

      {kind === 'equipment' ? (
        <Card>
          <Field
            label={t('Equipment')}
            testID="equipment-type"
            value={equipmentType}
            onChangeText={setEquipmentType}
            placeholder={t('e.g. JCB 3DX, concrete mixer, scaffolding')}
          />
          <Title>{t('Start date')}</Title>
          <Chips>
            {nextDays(locale === 'hi' ? 'hi-IN' : 'en-IN').map((d) => (
              <Chip
                key={d.iso}
                label={d.label}
                selected={startDate === d.iso}
                onPress={() => setStartDate(d.iso)}
              />
            ))}
          </Chips>
          <Field
            label={t('For how many days?')}
            testID="duration-days"
            value={durationDays}
            onChangeText={setDurationDays}
            keyboardType="number-pad"
          />
          <Chips>
            <Chip
              label={t('With operator')}
              selected={withOperator}
              onPress={() => setWithOperator(true)}
            />
            <Chip
              label={t('Machine only')}
              selected={!withOperator}
              onPress={() => setWithOperator(false)}
            />
          </Chips>
        </Card>
      ) : null}

      {kind !== 'material_rfq' ? (
        <Field
          label={kind === 'equipment' ? t('Anything else (optional)') : t('Describe the work')}
          testID="description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={
            kind === 'equipment'
              ? t('Site access, soil type, working hours')
              : t('What is the problem, how big is the job, anything the professional should know')
          }
          maxLength={kind === 'equipment' ? 500 : 2000}
        />
      ) : null}

      {kind === 'service' ? (
        <Card>
          <Title>{t('When?')}</Title>
          <Chips>
            {URGENCY.map(([v, l]) => (
              <Chip key={v} label={t(l)} selected={urgency === v} onPress={() => setUrgency(v)} />
            ))}
          </Chips>
        </Card>
      ) : null}

      {kind === 'service' || kind === 'renovation' ? (
        <Card>
          <Title>{t('Photos (optional)')}</Title>
          <PhotoPicker
            onChange={(keys, busy) => {
              setPhotos(keys);
              setUploading(busy);
            }}
          />
        </Card>
      ) : null}

      <Field
        label={t('Budget up to (₹, optional)')}
        value={budget}
        onChangeText={setBudget}
        keyboardType="number-pad"
        hint={t("Leave empty if you'd like professionals to suggest a price.")}
      />

      <Card>
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
        <Field
          label={t('Flat / house, tower and society')}
          testID="line1"
          value={line1}
          onChangeText={setLine1}
          placeholder={t('e.g. C-1203, Tower C, Ansal Golf Links')}
        />
        <Button
          title={gps ? t('Exact location added ✓') : t('Use my exact location')}
          kind="outline"
          loading={locating}
          onPress={locate}
        />
        <Small>{t('Professionals only see your sector until you hire them.')}</Small>
      </Card>

      {error ? <Notice>{error}</Notice> : null}
      <Button
        title={uploading ? t('Uploading photos…') : t('Post requirement')}
        kind="accent"
        testID="submit"
        loading={create.isPending}
        disabled={uploading}
        onPress={submit}
      />
      <Body muted>
        {t(
          'Verified professionals nearby are notified right away. Quotes usually arrive within a few hours.',
        )}
      </Body>
    </Screen>
  );
}
