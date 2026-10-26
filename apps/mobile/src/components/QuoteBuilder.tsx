import type { Quote } from '@setu/api-client';
import { GST_RATES, type GstRate, quoteTotals } from '@setu/domain';
import { createQuoteSchema } from '@setu/schemas';
import { useState } from 'react';
import { View } from 'react-native';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { Button, Card, Chip, Chips, Divider, Field, Notice, Row, Small, Title } from './ui';

interface Line {
  description: string;
  quantity: string;
  unit: string;
  price: string;
}

const blank = (): Line => ({ description: '', quantity: '1', unit: '', price: '' });
const num = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;

export type QuoteBody = ReturnType<typeof createQuoteSchema.parse>;

/**
 * Line items with live totals computed by the same @setu/domain rules as the API, so the
 * partner sees exactly what the customer will.
 */
export function QuoteBuilder({
  initial,
  gstRegistered,
  submitLabel,
  busy,
  error,
  onSubmit,
  withMessage,
}: {
  initial?: Quote;
  gstRegistered: boolean;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (body: QuoteBody, message?: string) => void;
  withMessage?: boolean;
}) {
  const { t } = useI18n();
  const [lines, setLines] = useState<Line[]>(
    initial?.items.map((i) => ({
      description: i.description,
      quantity: String(i.quantity),
      unit: i.unit ?? '',
      price: String(i.unitPricePaise / 100),
    })) ?? [blank()],
  );
  const [gstRate, setGstRate] = useState<GstRate | null>(
    initial ? ((initial.gstRate as GstRate | null) ?? null) : gstRegistered ? 18 : null,
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [validDays, setValidDays] = useState(7);
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const items = lines.map((l) => ({
    description: l.description.trim(),
    quantity: num(l.quantity),
    unit: l.unit.trim() || undefined,
    unitPricePaise: Math.round(num(l.price) * 100),
  }));
  const totals = quoteTotals(
    items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPricePaise,
    })),
    gstRate === null ? null : { rate: gstRate },
  );
  const set = (idx: number, patch: Partial<Line>) =>
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  function submit() {
    setLocalError(null);
    const parsed = createQuoteSchema.safeParse({
      items,
      gst: gstRate === null ? null : { rate: gstRate, interState: false },
      notes: notes.trim() || undefined,
      validDays,
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const line =
        typeof issue?.path[1] === 'number' ? `${t('Line {n}', { n: issue.path[1] + 1 })}: ` : '';
      return setLocalError(`${line}${issue?.message ?? t('Check the quote')}`);
    }
    onSubmit(parsed.data, message.trim() || undefined);
  }

  return (
    <View style={{ gap: 16 }}>
      {lines.map((l, idx) => (
        <Card key={idx}>
          <Row>
            <Title>{t('Item {n}', { n: idx + 1 })}</Title>
            {lines.length > 1 ? (
              <Chip
                label={t('Remove')}
                onPress={() => setLines(lines.filter((_, i) => i !== idx))}
              />
            ) : null}
          </Row>
          <Field
            label={t('Description')}
            testID={`item-${idx}-description`}
            value={l.description}
            onChangeText={(v) => set(idx, { description: v })}
            placeholder={t('e.g. Replace kitchen mixer tap')}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <Field
                label={t('Qty')}
                value={l.quantity}
                onChangeText={(v) => set(idx, { quantity: v })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t('Unit')}
                value={l.unit}
                onChangeText={(v) => set(idx, { unit: v })}
                placeholder={t('pc, sqft')}
              />
            </View>
            <View style={{ flex: 1.4 }}>
              <Field
                label={t('Rate (₹)')}
                testID={`item-${idx}-price`}
                value={l.price}
                onChangeText={(v) => set(idx, { price: v })}
                keyboardType="decimal-pad"
              />
            </View>
          </Row>
        </Card>
      ))}
      <Button title={t('Add item')} kind="outline" onPress={() => setLines([...lines, blank()])} />

      <Card>
        <Title>{t('GST')}</Title>
        <Chips>
          <Chip label={t('No GST')} selected={gstRate === null} onPress={() => setGstRate(null)} />
          {GST_RATES.filter((r) => r > 0).map((r) => (
            <Chip key={r} label={`${r}%`} selected={gstRate === r} onPress={() => setGstRate(r)} />
          ))}
        </Chips>
        {!gstRegistered && gstRate !== null ? (
          <Small>{t('Add your GSTIN in your profile to charge GST.')}</Small>
        ) : null}
      </Card>

      <Field
        label={t('Notes for the customer (optional)')}
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder={t("What's included, warranty, materials")}
      />
      <Card>
        <Title>{t('Quote valid for')}</Title>
        <Chips>
          {[3, 7, 15].map((d) => (
            <Chip
              key={d}
              label={t('{n} days', { n: d })}
              selected={validDays === d}
              onPress={() => setValidDays(d)}
            />
          ))}
        </Chips>
      </Card>
      {withMessage ? (
        <Field
          label={t('Message (optional)')}
          value={message}
          onChangeText={setMessage}
          placeholder={t('What changed in this revision')}
        />
      ) : null}

      <Card>
        <Row>
          <Small>{t('Subtotal')}</Small>
          <Small>{rupees(totals.subtotal)}</Small>
        </Row>
        {totals.gst ? (
          <Row>
            <Small>{t('GST {rate}%', { rate: totals.gst.rate })}</Small>
            <Small>{rupees(totals.gst.totalTax)}</Small>
          </Row>
        ) : null}
        <Divider />
        <Row>
          <Title>{t('Customer pays')}</Title>
          <Title>{rupees(totals.total)}</Title>
        </Row>
      </Card>
      {localError || error ? <Notice>{localError ?? error}</Notice> : null}
      <Button
        title={submitLabel}
        kind="accent"
        testID="send-quote"
        loading={busy}
        onPress={submit}
      />
    </View>
  );
}
