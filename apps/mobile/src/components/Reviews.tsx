import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { $api, queryClient } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { when } from '@/lib/format';
import { spacing, typeScale, usePalette } from '@/lib/theme';
import { Body, Button, Card, Field, Notice, Small, Title } from './ui';

export function Stars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  const c = usePalette();
  return (
    <View
      style={{ flexDirection: 'row', gap: spacing[1] }}
      accessibilityRole={onChange ? 'adjustable' : 'text'}
      accessibilityLabel={`${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n)}
          testID={onChange ? `star-${n}` : undefined}
          hitSlop={6}
        >
          <Text
            style={{
              fontSize: size,
              lineHeight: size + 4,
              color: n <= value ? c.accent : c.border,
            }}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The review on a closed job: the customer writes it, the partner can reply once. */
export function JobReview({
  jobId,
  viewer,
  closed,
}: {
  jobId: string;
  viewer: 'customer' | 'partner' | 'ops' | 'system';
  closed: boolean;
}) {
  const path = { params: { path: { id: jobId } } };
  const review = $api.useQuery('get', '/v1/jobs/{id}/review', path, { enabled: closed });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ['get', '/v1/jobs/{id}/review'] });
  const create = $api.useMutation('post', '/v1/jobs/{id}/review', { onSuccess: refresh });
  const answer = $api.useMutation('post', '/v1/reviews/{id}/reply', { onSuccess: refresh });
  if (!closed || !review.data) return null;
  const r = review.data.review;

  if (!r) {
    if (viewer !== 'customer') return null;
    return (
      <Card>
        <Title>How was the work?</Title>
        <Stars value={rating} onChange={setRating} />
        <Field
          label="A few words for others (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={1000}
        />
        {create.error ? <Notice>{errorMessage(create.error)}</Notice> : null}
        <Button
          title="Post review"
          testID="post-review"
          disabled={rating === 0}
          loading={create.isPending}
          onPress={() =>
            create.mutate({ ...path, body: { rating, comment: comment.trim() || undefined } })
          }
        />
        <Small>Reviews are public and show your first name only.</Small>
      </Card>
    );
  }

  return (
    <Card>
      <Title>{viewer === 'customer' ? 'Your review' : 'Customer review'}</Title>
      <Stars value={r.rating} size={20} />
      {r.comment ? <Body>{r.comment}</Body> : null}
      <Small>
        {r.customerFirstName ?? 'Customer'} · {when(r.createdAt)}
      </Small>
      {r.partnerReply ? (
        <View style={{ marginTop: spacing[2] }}>
          <Text style={[typeScale.sm, { fontWeight: '600' }]}>Reply from the professional</Text>
          <Body muted>{r.partnerReply}</Body>
        </View>
      ) : viewer === 'partner' ? (
        <>
          <Field
            label="Reply publicly (once)"
            value={reply}
            onChangeText={setReply}
            multiline
            maxLength={1000}
          />
          {answer.error ? <Notice>{errorMessage(answer.error)}</Notice> : null}
          <Button
            title="Post reply"
            kind="outline"
            disabled={reply.trim().length < 2}
            loading={answer.isPending}
            onPress={() =>
              answer.mutate({ params: { path: { id: r.id } }, body: { reply: reply.trim() } })
            }
          />
        </>
      ) : null}
    </Card>
  );
}

/** The latest reviews of a partner, on the quote a customer is weighing. */
export function PartnerReviews({ partnerId }: { partnerId: string }) {
  const list = $api.useQuery('get', '/v1/partners/{id}/reviews', {
    params: { path: { id: partnerId } },
  });
  if (!list.data?.length) return null;
  return (
    <Card>
      <Title>What customers say</Title>
      {list.data.slice(0, 3).map((r) => (
        <View key={r.id} style={{ gap: 2, marginTop: spacing[1] }}>
          <Stars value={r.rating} size={16} />
          {r.comment ? <Body>{r.comment}</Body> : null}
          <Small>
            {r.customerFirstName ?? 'Customer'} · {when(r.createdAt)}
          </Small>
          {r.partnerReply ? <Small>Reply: {r.partnerReply}</Small> : null}
        </View>
      ))}
    </Card>
  );
}
