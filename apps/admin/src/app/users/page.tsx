'use client';

import { useState } from 'react';
import { Badge, Button, Empty, Notice, PageHeader, Table, Td, inputCls } from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';
import { day } from '@/lib/format';
import { useSession } from '@/lib/session';

type Action = 'suspend' | 'reactivate' | 'reset-device';
const ACTION_LABEL: Record<Action, string> = {
  suspend: 'Suspend',
  reactivate: 'Reactivate',
  'reset-device': 'Unlock phone',
};
const ACTION_PROMPT: Record<Action, string> = {
  suspend: 'Why are we suspending this account?',
  reactivate: 'Why are we reactivating it?',
  'reset-device': 'How did you verify it is them? (e.g. called the registered number)',
};

export default function Users() {
  const { can } = useSession();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const list = $api.useQuery('get', '/v1/admin/users', {
    params: { query: search ? { q: search } : {} },
  });
  const [acting, setActing] = useState<{ id: string; action: Action } | null>(null);
  const [reason, setReason] = useState('');
  const done = {
    onSuccess: () => {
      setActing(null);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/users'] });
    },
  };
  const suspend = $api.useMutation('post', '/v1/admin/users/{id}/suspend', done);
  const reactivate = $api.useMutation('post', '/v1/admin/users/{id}/reactivate', done);
  const reset = $api.useMutation('post', '/v1/admin/users/{id}/reset-device', done);
  const busy = suspend.isPending || reactivate.isPending || reset.isPending;
  const error = suspend.error ?? reactivate.error ?? reset.error ?? list.error;
  const canSuspend = can('ops');

  function run() {
    if (!acting) return;
    const args = { params: { path: { id: acting.id } }, body: { reason: reason.trim() } };
    ({ suspend, reactivate, 'reset-device': reset })[acting.action].mutate(args);
  }

  return (
    <>
      <PageHeader
        title="Users"
        lead="Find a customer or partner by phone or name. Suspending ends their sessions immediately. Unlock a partner's phone only after confirming it is them on a call to the registered number."
      />
      <form
        className="mb-4 flex max-w-lg gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
        }}
      >
        <input
          className={inputCls}
          placeholder="Phone or name"
          aria-label="Search users"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit">Search</Button>
      </form>
      {error ? <Notice>{errorMessage(error)}</Notice> : null}
      {list.data?.length === 0 ? <Empty>No users match.</Empty> : null}
      {list.data?.length ? (
        <Table head={['User', 'Roles', 'Jobs', 'Last login', 'Status', '']}>
          {list.data.map((u) => (
            <tr key={u.id}>
              <Td>
                <div className="font-semibold">{u.partnerName ?? u.name ?? '–'}</div>
                <a className="text-xs underline" href={`tel:${u.phone}`}>
                  {u.phone}
                </a>
              </Td>
              <Td>{u.roles.join(', ')}</Td>
              <Td>{u.jobCount}</Td>
              <Td>{u.lastLoginAt ? day(u.lastLoginAt) : 'Never'}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={u.status === 'active' ? 'success' : 'danger'}>{u.status}</Badge>
                  {u.phoneLocked ? <Badge tone="info">phone locked</Badge> : null}
                </div>
              </Td>
              <Td className="min-w-72">
                {acting?.id === u.id ? (
                  <div className="space-y-2">
                    <input
                      className={inputCls}
                      placeholder={ACTION_PROMPT[acting.action]}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        kind={acting.action === 'suspend' ? 'danger' : 'primary'}
                        busy={busy}
                        disabled={reason.trim().length < 3}
                        onClick={run}
                      >
                        {ACTION_LABEL[acting.action]}
                      </Button>
                      <Button kind="outline" onClick={() => setActing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : u.status === 'deleted' ? null : (
                  <div className="flex flex-wrap gap-2">
                    {u.phoneLocked ? (
                      <Button
                        kind="outline"
                        onClick={() => setActing({ id: u.id, action: 'reset-device' })}
                      >
                        Unlock phone
                      </Button>
                    ) : null}
                    {canSuspend && u.status === 'active' ? (
                      <Button
                        kind="outline"
                        onClick={() => setActing({ id: u.id, action: 'suspend' })}
                      >
                        Suspend
                      </Button>
                    ) : null}
                    {canSuspend && u.status === 'suspended' ? (
                      <Button onClick={() => setActing({ id: u.id, action: 'reactivate' })}>
                        Reactivate
                      </Button>
                    ) : null}
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
