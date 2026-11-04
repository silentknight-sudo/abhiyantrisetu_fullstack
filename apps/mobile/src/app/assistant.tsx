import Ionicons from '@expo/vector-icons/Ionicons';
import { type AssistantTurn, offlineReply } from '@setu/domain';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Chips, IconBadge, Small } from '@/components/ui';
import { client } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { font, shadow, spacing, typeScale, usePalette } from '@/lib/theme';

const SUGGESTIONS = [
  'Bathroom mein seelan aa rahi hai',
  'Cost to build a 1,200 sq ft house?',
  'किचन मॉड्यूलर बनवाना है',
  'AC service kitna lagega?',
] as const;

/** Setu AI: ask in English, Hindi or Hinglish; answers come from the API (Claude or the rate card). */
export default function Assistant() {
  const { t } = useI18n();
  const c = usePalette();
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);

  useEffect(() => {
    const id = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [turns, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: AssistantTurn[] = [...turns, { role: 'user', content }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    let reply: string;
    try {
      const res = await client.api.POST('/v1/assistant/chat', {
        body: { messages: next.slice(-19) },
      });
      reply = res.data?.reply ?? offlineReply(next);
    } catch {
      reply = offlineReply(next);
    }
    setTurns([...next, { role: 'assistant', content: reply }]);
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scroller as never}
          contentContainerStyle={{ padding: spacing[4], gap: spacing[3] }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', gap: spacing[2], paddingVertical: spacing[4] }}>
            <IconBadge name="sparkles" tone="orange" size={64} />
            <Text style={[typeScale['2xl'], { color: c.text, fontFamily: font.headingHeavy }]}>
              Setu AI
            </Text>
            <Small>
              {t(
                'Ask about costs, the right service or a problem at home, in English, Hindi or Hinglish.',
              )}
            </Small>
          </View>

          {turns.length === 0 ? (
            <Chips>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} onPress={() => void send(s)} />
              ))}
            </Chips>
          ) : null}

          {turns.map((m, i) => (
            <View
              key={i}
              style={[
                {
                  maxWidth: '85%',
                  borderRadius: 18,
                  paddingHorizontal: spacing[4],
                  paddingVertical: spacing[3],
                },
                m.role === 'user'
                  ? {
                      alignSelf: 'flex-end',
                      backgroundColor: c.primary,
                      borderBottomRightRadius: 4,
                    }
                  : [
                      shadow,
                      {
                        alignSelf: 'flex-start',
                        backgroundColor: c.surface,
                        borderBottomLeftRadius: 4,
                      },
                    ],
              ]}
            >
              <Text
                style={[
                  typeScale.base,
                  {
                    color: m.role === 'user' ? c.onPrimary : c.text,
                    fontFamily: font.body,
                  },
                ]}
              >
                {m.content}
              </Text>
            </View>
          ))}
          {busy ? (
            <View style={{ alignSelf: 'flex-start', padding: spacing[3] }}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : null}
          {turns.length >= 2 && !busy ? (
            <Button
              title={t('Post a requirement')}
              kind="accent"
              icon="add-circle"
              onPress={() => router.push('/requirement/new')}
            />
          ) : null}
          <Small>{t('Indicative estimate. Final price after site visit.')}</Small>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            margin: spacing[3],
            paddingLeft: spacing[4],
            paddingRight: 6,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.surface,
          }}
        >
          <TextInput
            testID="assistant-input"
            value={draft}
            onChangeText={setDraft}
            placeholder={t('Ask in English, हिंदी or Hinglish…')}
            placeholderTextColor={c.textMuted}
            onSubmitEditing={() => void send(draft)}
            maxLength={2000}
            style={[
              typeScale.base,
              { flex: 1, color: c.text, fontFamily: font.body, minHeight: 40 },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Send')}
            disabled={busy || !draft.trim()}
            onPress={() => void send(draft)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: c.accent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: busy || !draft.trim() ? 0.5 : 1,
            }}
          >
            <Ionicons name="send" size={18} color={c.onAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
