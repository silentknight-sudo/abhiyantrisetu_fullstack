import type { PaymentOrder } from '@setu/api-client';
import { Modal, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { type CheckoutPrefill, type CheckoutResult, checkoutOptions } from '@/lib/checkout';
import { useI18n } from '@/lib/i18n';
import { Button } from './ui';

/**
 * Razorpay Checkout in a WebView: works in Expo Go and dev builds without a native SDK.
 * The page posts the result (or dismissal) back to the app.
 */
export function RazorpayCheckout({
  order,
  prefill,
  onResult,
}: {
  order: PaymentOrder | null;
  prefill: CheckoutPrefill;
  onResult: (result: CheckoutResult | { error: string } | null) => void;
}) {
  const { t } = useI18n();
  if (!order) return null;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script></head><body style="background:#F6EFE3">
<script>
  var post = function (m) { window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  var opts = ${JSON.stringify(checkoutOptions(order, prefill))};
  opts.handler = function (r) { post({ ok: true, r: r }); };
  opts.modal = { ondismiss: function () { post({ dismissed: true }); } };
  var rzp = new Razorpay(opts);
  rzp.on('payment.failed', function (e) { post({ error: (e.error && e.error.description) || 'Payment failed' }); });
  rzp.open();
</script></body></html>`;

  function onMessage(e: WebViewMessageEvent) {
    const m = JSON.parse(e.nativeEvent.data) as {
      ok?: boolean;
      r?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
      error?: string;
    };
    if (m.ok && m.r) {
      onResult({
        razorpayOrderId: m.r.razorpay_order_id,
        razorpayPaymentId: m.r.razorpay_payment_id,
        razorpaySignature: m.r.razorpay_signature,
      });
    } else if (m.error) onResult({ error: m.error });
    else onResult(null);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={() => onResult(null)}>
      <View style={{ flex: 1, paddingTop: 48, backgroundColor: '#F6EFE3' }}>
        <WebView
          originWhitelist={['*']}
          source={{ html, baseUrl: 'https://abhiyantrisetu.com' }}
          onMessage={onMessage}
        />
        <View style={{ padding: 16 }}>
          <Button title={t('Cancel')} kind="outline" onPress={() => onResult(null)} />
        </View>
      </View>
    </Modal>
  );
}
