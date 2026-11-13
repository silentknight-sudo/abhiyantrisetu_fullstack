import { $api } from '@/lib/api';
import { rupees } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import { useJobPayment } from '@/lib/payment';
import { Badge, Button, Card, Notice, Row, Small, Title } from './ui';

/** What the customer owes on a job, and the button to pay it. */
export function PaySection({ jobId, canPay }: { jobId: string; canPay: boolean }) {
  const { t } = useI18n();
  const path = { params: { path: { id: jobId } } };
  const summary = $api.useQuery('get', '/v1/jobs/{id}/payments', path);
  const { pay, busy, error, paid, checkout } = useJobPayment(jobId);

  const s = summary.data;
  if (!s || (!canPay && s.paidPaise === 0)) return null;
  if (s.refundedPaise > 0) {
    return (
      <Card>
        <Row>
          <Title>{t('Payment')}</Title>
          <Badge label={t('Refunded')} tone="success" />
        </Row>
        <Small>
          {t(
            '{amount} is on its way back to the account or card you paid with. Banks usually take 5–7 working days.',
            { amount: rupees(s.refundedPaise) },
          )}
        </Small>
      </Card>
    );
  }
  return (
    <Card>
      <Row>
        <Title>{t('Payment')}</Title>
        <Badge
          label={s.outstandingPaise === 0 ? t('Paid') : s.paidPaise > 0 ? t('Part paid') : t('Due')}
          tone={s.outstandingPaise === 0 ? 'success' : 'warning'}
        />
      </Row>
      <Small>
        {t(
          '{paid} paid of {total}. Your money is held by Setu and released to the professional when you confirm the work is done.',
          { paid: rupees(s.paidPaise), total: rupees(s.agreedTotalPaise) },
        )}
      </Small>
      {paid ? <Notice tone="success">{t('Payment received. Thank you!')}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}
      {canPay && s.outstandingPaise > 0 ? (
        <Button
          title={t('Pay {amount}', { amount: rupees(s.outstandingPaise) })}
          kind="accent"
          testID="pay"
          loading={busy}
          onPress={() => void pay()}
        />
      ) : null}
      {checkout}
    </Card>
  );
}
