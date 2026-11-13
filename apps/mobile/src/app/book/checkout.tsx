import Ionicons from '@expo/vector-icons/Ionicons';
import { SECTORS } from '@setu/domain';
import { createBookingSchema } from '@setu/schemas';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartBar, QtyStepper } from '@/components/booking';
import {
  Card,
  Chip,
  Chips,
  Divider,
  Empty,
  Field,
  Notice,
  Row,
  Small,
  Title,
} from '@/components/ui';
import { $api, queryClient } from '@/lib/api';
import { BOOKABLE, cartStore, useCart } from '@/lib/cart';
import { errorMessage } from '@/lib/errors';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { secureStorage } from '@/lib/storage';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

const SECTOR_KEY = 'setu.sector';
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const NOTICE_MS = 90 * 60_000;

/** The next seven days, each with the hourly slots still bookable (at least 90 minutes away). */
function days(now = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slots = HOURS.map(
      (h) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h),
    ).filter((s) => s.getTime() - now.getTime() >= NOTICE_MS);
    return { day, slots };
  }).filter((d) => d.slots.length);
}
const hourLabel = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });

/** Review the cart, pick a slot and an address, and book. */
export default function Checkout() {
  const { t, locale } = useI18n();
  const c = usePalette();
  const { status } = useSession();
  const cart = useCart();
  const hi = locale === 'hi';
  const options = useMemo(() => days(), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [slot, setSlot] = useState<Date | null>(null);
  const [sector, setSector] = useState<(typeof SECTORS)[number]>(SECTORS[0]!);
  const [line1, setLine1] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void secureStorage.get(SECTOR_KEY).then((v) => {
      const hit = SECTORS.find((s) => s.name === v);
      if (hit) setSector(hit);
    });
  }, []);

  const book = $api.useMutation('post', '/v1/bookings', {
    onSuccess: (req) => {
      cartStore.clear();
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/requirements'] });
      router.dismissAll();
      router.push(`/requirement/${req.id}`);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!cart.category || cart.count === 0)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background, padding: spacing[4] }}>
        <Empty
          icon="cart-outline"
          title={t('Your cart is empty')}
          body={t('Add services from the menu to book a slot.')}
        />
      </SafeAreaView>
    );
  const category = cart.category;

  function submit() {
    setError(null);
    if (status !== 'signedIn') return router.push('/login');
    if (!slot) return setError(t('Pick a time slot'));
    const parsed = createBookingSchema.safeParse({
      categoryId: cart.lines[0]!.service.categoryId,
      items: cart.lines.map((l) => ({ serviceId: l.service.id, quantity: l.quantity })),
      slotStart: slot.toISOString(),
      address: {
        line1,
        sector: sector.name,
        city: 'Greater Noida',
        pincode: sector.pincode,
        location: { lat: sector.lat, lng: sector.lng },
      },
      notes: notes.trim() || undefined,
      partnerId: cart.pro?.id,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? t('Check the form'));
    void secureStorage.set(SECTOR_KEY, sector.name);
    book.mutate({ body: parsed.data });
  }

  const day = options[dayIdx];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={[]}>
      <Stack.Screen options={{ title: t('Checkout') }} />
      <ScrollView
        contentContainerStyle={{ padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] }}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Title>{t(BOOKABLE[category] ?? 'Book a service')}</Title>
          {cart.lines.map((l) => {
            const name = (hi && l.service.nameHi) || l.service.nameEn;
            return (
              <Row key={l.service.id}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[typeScale.base, { color: c.text, fontFamily: font.medium }]}>
                    {name}
                  </Text>
                  <Small>{rupees(l.service.pricePaise * l.quantity)}</Small>
                </View>
                <QtyStepper
                  label={name}
                  qty={l.quantity}
                  onChange={(delta) => cartStore.change(category, l.service, delta)}
                />
              </Row>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={[typeScale.sm, { color: c.accent, fontFamily: font.semibold }]}>
              + {t('Add more services')}
            </Text>
          </Pressable>
        </Card>

        <Card>
          <Title>{t('Who should do the job?')}</Title>
          {(
            [
              [
                false,
                'Setu assigns the best available',
                'Fastest. A verified, top-rated professional near you.',
              ],
              [true, "I'll choose my professional", 'See profiles, ratings and experience first.'],
            ] as const
          ).map(([choose, title, body]) => {
            const on = choose ? Boolean(cart.pro) : !cart.pro;
            return (
              <Pressable
                key={title}
                testID={choose ? 'choose-own-pro' : 'setu-assigns'}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() =>
                  choose
                    ? router.push({ pathname: '/book/pros', params: { sector: sector.name } })
                    : cartStore.choosePro(null)
                }
                style={{
                  flexDirection: 'row',
                  gap: spacing[3],
                  alignItems: 'center',
                  padding: spacing[3],
                  borderRadius: 14,
                  borderWidth: on ? 1.5 : 1,
                  borderColor: on ? c.highlight : c.border,
                  backgroundColor: on ? c.highlightBg : c.surface,
                }}
              >
                <Ionicons
                  name={on ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={on ? c.text : c.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[typeScale.base, { color: c.text, fontFamily: font.semibold }]}>
                    {choose && cart.pro ? cart.pro.name : t(title)}
                  </Text>
                  <Small>{choose && cart.pro ? t('Tap to change') : t(body)}</Small>
                </View>
              </Pressable>
            );
          })}
          <Small>{t('The price stays the same either way.')}</Small>
        </Card>

        <Card>
          <Title>{t('When should the professional come?')}</Title>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {options.map((o, i) => {
                const selected = i === dayIdx;
                const today = new Date().toDateString() === o.day.toDateString();
                return (
                  <Pressable
                    key={o.day.toISOString()}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      setDayIdx(i);
                      setSlot(null);
                    }}
                    style={{
                      width: 64,
                      paddingVertical: spacing[2],
                      borderRadius: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primary : c.surface,
                    }}
                  >
                    <Text
                      style={[
                        typeScale.xs,
                        { color: selected ? 'rgba(255,255,255,0.8)' : c.textMuted },
                      ]}
                    >
                      {today ? t('Today') : o.day.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </Text>
                    <Text
                      style={[
                        typeScale.lg,
                        { color: selected ? '#fff' : c.text, fontFamily: font.heading },
                      ]}
                    >
                      {o.day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Chips>
            {day?.slots.map((s) => (
              <Chip
                key={s.toISOString()}
                label={hourLabel(s)}
                selected={slot?.getTime() === s.getTime()}
                onPress={() => setSlot(s)}
              />
            ))}
          </Chips>
          <Small>
            {cart.minutes
              ? t('Takes about {n} mins. The professional arrives within the hour you pick.', {
                  n: cart.minutes,
                })
              : t('The professional arrives within the hour you pick.')}
          </Small>
        </Card>

        <Card>
          <Title>{t('Address')}</Title>
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
            label={t('Flat, tower and society')}
            value={line1}
            onChangeText={setLine1}
            placeholder={t('e.g. B-1203, Ansal Golf Links')}
            testID="booking-line1"
          />
          <Field
            label={t('Anything the professional should know? (optional)')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('e.g. Kitchen tap is dripping, parking at gate 2')}
            multiline
            maxLength={500}
          />
          <Small>{t('Professionals only see your sector until you hire them.')}</Small>
        </Card>

        <Card>
          <Title>{t('Payment summary')}</Title>
          <Row>
            <Small muted={false}>{t('Item total')}</Small>
            <Small muted={false}>{rupees(cart.totalPaise)}</Small>
          </Row>
          <Row>
            <Small muted={false}>{t('Visit charge')}</Small>
            <Text style={[typeScale.sm, { color: c.success, fontFamily: font.semibold }]}>
              {t('Free')}
            </Text>
          </Row>
          <Divider />
          <Row>
            <Title>{t('Total')}</Title>
            <Title>{rupees(cart.totalPaise)}</Title>
          </Row>
          <Small>
            {t(
              'Pay by UPI or card once a professional is assigned. Setu holds the money until you confirm the work is done. Spare parts, if needed, are billed at fixed rates with your approval.',
            )}
          </Small>
        </Card>

        {error ? <Notice>{error}</Notice> : null}
      </ScrollView>
      <CartBar
        testID="book-now"
        count={cart.count}
        totalPaise={cart.totalPaise}
        action={status === 'signedIn' ? t('Book now') : t('Log in to book')}
        loading={book.isPending}
        onPress={submit}
      />
    </SafeAreaView>
  );
}
