'use client';

import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  Notice,
  PageHeader,
  Table,
  Td,
  inputCls,
} from '@/components/ui';
import { $api, errorMessage, queryClient } from '@/lib/api';

/** Pilot rollout: which sectors are live and which collect interest on the waitlist. */
export default function Sectors() {
  const list = $api.useQuery('get', '/v1/admin/sectors');
  const [name, setName] = useState('');
  const save = $api.useMutation('post', '/v1/admin/sectors', {
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/sectors'] });
    },
  });
  const set = (n: string, status: 'live' | 'waitlist') =>
    save.mutate({ body: { name: n, status } });

  return (
    <>
      <PageHeader
        title="Pilot sectors"
        lead="Until you add a sector, the app treats every area as live. Once you add any, customers outside a live sector are told Setu is coming soon."
      />
      {list.error || save.error ? <Notice>{errorMessage(list.error ?? save.error)}</Notice> : null}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputCls} max-w-xs`}
            placeholder="Sector name, e.g. Sector 150"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            disabled={name.trim().length < 2 || save.isPending}
            onClick={() => set(name, 'live')}
          >
            Add as live
          </Button>
          <Button
            kind="outline"
            disabled={name.trim().length < 2 || save.isPending}
            onClick={() => set(name, 'waitlist')}
          >
            Add to waitlist
          </Button>
        </div>
      </Card>
      {list.data?.length === 0 ? <Empty>No sectors yet, so every area is live.</Empty> : null}
      {list.data?.length ? (
        <Table head={['Sector', 'Status', 'Customers', 'Open requests', '']}>
          {list.data.map((s) => (
            <tr key={s.id}>
              <Td className="capitalize">{s.name}</Td>
              <Td>
                <Badge tone={s.status === 'live' ? 'success' : 'warning'}>
                  {s.status === 'live' ? 'Live' : 'Waitlist'}
                </Badge>
              </Td>
              <Td>{s.customers}</Td>
              <Td>{s.openRequests}</Td>
              <Td>
                <Button
                  kind="outline"
                  disabled={save.isPending}
                  onClick={() => set(s.name, s.status === 'live' ? 'waitlist' : 'live')}
                >
                  {s.status === 'live' ? 'Move to waitlist' : 'Go live'}
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
