import { LOCALES, normalizeIndianMobile } from '@setu/domain';
import { Image } from 'react-native';
import { useState } from 'react';
import { Body, Button, Chip, Chips, Field, Heading, Notice, Screen, Small } from '@/components/ui';
import { client } from '@/lib/api';
import { IS_PARTNER } from '@/lib/config';
import { errorMessage } from '@/lib/errors';
import { LANGUAGE_NAMES, useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/session';

export default function Login() {
  const { signIn } = useSession();
  const { t, locale, setLocale } = useI18n();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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

  return (
    <Screen edges={['top', 'bottom']}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: 96, height: 96, borderRadius: 20, marginTop: 24 }}
        accessibilityLabel="Abhiyantri Setu"
      />
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
      <Heading size="4xl">
        {IS_PARTNER ? t('Grow your work') : t('Build, Renovate, Repair & Maintain')}
      </Heading>
      <Body muted>
        {IS_PARTNER
          ? t(
              'Get verified leads near you in Greater Noida. Quote, get hired and get paid on time.',
            )
          : t('Verified professionals in Greater Noida. Post once, compare quotes, pay safely.')}
      </Body>

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
    </Screen>
  );
}
