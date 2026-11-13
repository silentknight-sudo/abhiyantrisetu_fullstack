import { LOCALES, normalizeIndianMobile } from '@setu/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { Welcome, WELCOMED_KEY } from '@/components/Welcome';
import { secureStorage } from '@/lib/storage';
import { Button, Chip, Chips, Field, fill, Notice, Screen, Small, TrustRow } from '@/components/ui';
import { client } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { LANGUAGE_NAMES, useI18n } from '@/lib/i18n';
import { BANNERS } from '@/lib/banners';
import { useSession } from '@/lib/session';
import { font, spacing, typeScale, usePalette } from '@/lib/theme';

export default function Login() {
  const { signIn } = useSession();
  const { t, locale, setLocale } = useI18n();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  // First run on a customer device: the welcome slides come before login.
  const [welcomed, setWelcomed] = useState<boolean | null>(IS_PARTNER ? true : null);
  useEffect(() => {
    if (IS_PARTNER) return;
    secureStorage
      .get(WELCOMED_KEY)
      .then((v) => setWelcomed(v === '1'))
      .catch(() => setWelcomed(true));
  }, []);

  async function sendCode() {
    setError(null);
    if (!normalizeIndianMobile(phone)) return setError(t('Enter a 10-digit Indian mobile number'));
    setBusy(true);
    try {
      const res = await client.api.POST('/v1/auth/otp/send', { body: { phone } });
      if (!res.response.ok) throw res.error;
      setStep('code');
      setInfo(
        t('We sent a 6-digit code by SMS. You can ask for a new one in {seconds}s.', {
          seconds: res.data!.resendAfterSeconds,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError(t('Enter the 6-digit code'));
    setBusy(true);
    try {
      await signIn(phone, code);
      // The root layout swaps to the signed-in routes.
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (welcomed === null) return null;
  if (!welcomed) return <Welcome onDone={() => setWelcomed(true)} />;

  return (
    <Screen padded={false}>
      {/* Photo hero with the logo and the promise */}
      <View style={{ height: 360 + insets.top, overflow: 'hidden' }}>
        <Image
          source={IS_PARTNER ? BANNERS.loginPartner : BANNERS.loginCustomer}
          resizeMode="cover"
          style={fill}
        />
        <LinearGradient
          colors={['rgba(16,36,52,0)', 'rgba(16,36,52,0.35)', 'rgba(16,36,52,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            flex: 1,
            justifyContent: 'space-between',
            paddingTop: insets.top + spacing[4],
            paddingHorizontal: spacing[5],
            paddingBottom: spacing[10],
          }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 6,
            }}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 52, height: 52, borderRadius: 12 }}
              accessibilityLabel="Abhiyantri Setu"
            />
          </View>
          <View style={{ gap: spacing[2] }}>
            <Text
              accessibilityRole="header"
              style={[
                typeScale['4xl'],
                { color: '#fff', fontFamily: font.headingHeavy, letterSpacing: -0.8 },
              ]}
            >
              {IS_PARTNER ? t('Grow your work') : t('Build, Renovate, Repair & Maintain')}
            </Text>
            <Text
              style={[typeScale.base, { color: 'rgba(255,255,255,0.88)', fontFamily: font.body }]}
            >
              {IS_PARTNER
                ? t(
                    'Get verified leads near you in Greater Noida. Quote, get hired and get paid on time.',
                  )
                : t(
                    'Verified professionals in Greater Noida. Post once, compare quotes, pay safely.',
                  )}
            </Text>
          </View>
        </View>
      </View>

      {/* Sign-in sheet overlapping the hero */}
      <View
        style={{
          marginTop: -28,
          backgroundColor: c.background,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: spacing[5],
          gap: spacing[4],
        }}
      >
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

        {step === 'phone' ? (
          <>
            <Field
              label={t('Mobile number')}
              testID="phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="98765 43210"
              maxLength={14}
              onSubmitEditing={sendCode}
            />
            {error ? <Notice>{error}</Notice> : null}
            <Button title={t('Send code')} testID="send-code" onPress={sendCode} loading={busy} />
          </>
        ) : (
          <>
            {info ? <Notice tone="info">{info}</Notice> : null}
            <Field
              label={t('6-digit code')}
              testID="code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              onSubmitEditing={verify}
            />
            {error ? <Notice>{error}</Notice> : null}
            <Button
              title={t('Verify and continue')}
              testID="verify"
              onPress={verify}
              loading={busy}
            />
            <Button
              title={t('Change number')}
              kind="outline"
              onPress={() => {
                setStep('phone');
                setCode('');
                setError(null);
              }}
            />
          </>
        )}
        <Small>
          {t(
            'By continuing you agree to our Terms and Privacy Policy. Your number is never shown to anyone before you hire.',
          )}
        </Small>
        <TrustRow
          items={[
            ['shield-checkmark', t('Verified')],
            ['wallet', t('Pay safely')],
            ['flash', t('Quick response')],
          ]}
        />
      </View>
    </Screen>
  );
}
