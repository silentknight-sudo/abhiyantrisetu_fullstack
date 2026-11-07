'use client';

import { useMemo, useState } from 'react';
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

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const toPaise = (s: string) => Math.round(Number(s.replace(/[^\d.]/g, '')) * 100);
const BLANK = {
  categoryId: '',
  slug: '',
  nameEn: '',
  nameHi: '',
  groupEn: '',
  unit: 'per visit',
  duration: '30',
  price: '',
  description: '',
};

export default function Catalogue() {
  const list = $api.useQuery('get', '/v1/admin/services');
  const cats = $api.useQuery('get', '/v1/catalog/categories');
  const [filter, setFilter] = useState<string>('all');
  const [editing, setEditing] = useState<{ id: string; price: string } | null>(null);
  const [form, setForm] = useState(BLANK);
  const [adding, setAdding] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['get', '/v1/admin/services'] });

  const update = $api.useMutation('patch', '/v1/admin/services/{id}', {
    onSuccess: () => {
      setEditing(null);
      void refresh();
    },
  });
  const create = $api.useMutation('post', '/v1/admin/services', {
    onSuccess: () => {
      setForm(BLANK);
      setAdding(false);
      void refresh();
    },
  });

  const serviceCats = (cats.data ?? []).filter((c) => c.requirementType === 'service');
  const shown = useMemo(
    () => (list.data ?? []).filter((s) => filter === 'all' || s.categorySlug === filter),
    [list.data, filter],
  );
  const slugs = [...new Set((list.data ?? []).map((s) => s.categorySlug))];
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title="Catalogue"
        lead="Fixed-price services customers can book instantly. Price changes apply to new bookings only; bookings already made keep the price the customer saw. Every change is audited."
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {['all', ...slugs].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-sm capitalize ${filter === s ? 'border-primary bg-primary text-on-primary' : 'border-border bg-surface'}`}
          >
            {s.replace('-', ' ')}
          </button>
        ))}
        <div className="ml-auto">
          <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add service'}</Button>
        </div>
      </div>

      {adding ? (
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Category
              <select className={inputCls} value={form.categoryId} onChange={set('categoryId')}>
                <option value="">Choose…</option>
                {serviceCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Name (English)
              <input className={inputCls} value={form.nameEn} onChange={set('nameEn')} />
            </label>
            <label className="text-sm">
              Name (Hindi)
              <input className={inputCls} value={form.nameHi} onChange={set('nameHi')} />
            </label>
            <label className="text-sm">
              Slug (unique, e.g. geyser-repair)
              <input className={inputCls} value={form.slug} onChange={set('slug')} />
            </label>
            <label className="text-sm">
              Group on the menu
              <input className={inputCls} value={form.groupEn} onChange={set('groupEn')} />
            </label>
            <label className="text-sm">
              Unit
              <input className={inputCls} value={form.unit} onChange={set('unit')} />
            </label>
            <label className="text-sm">
              Price (₹)
              <input
                className={inputCls}
                inputMode="decimal"
                value={form.price}
                onChange={set('price')}
              />
            </label>
            <label className="text-sm">
              Time (minutes)
              <input
                className={inputCls}
                inputMode="numeric"
                value={form.duration}
                onChange={set('duration')}
              />
            </label>
            <label className="text-sm md:col-span-3">
              Description
              <input className={inputCls} value={form.description} onChange={set('description')} />
            </label>
          </div>
          {create.error ? <Notice>{errorMessage(create.error)}</Notice> : null}
          <div className="mt-3">
            <Button
              busy={create.isPending}
              disabled={!form.categoryId || !form.nameEn || !form.price}
              onClick={() =>
                create.mutate({
                  body: {
                    categoryId: form.categoryId,
                    slug: form.slug.trim(),
                    nameEn: form.nameEn.trim(),
                    nameHi: form.nameHi.trim() || form.nameEn.trim(),
                    groupEn: form.groupEn.trim() || null,
                    unit: form.unit.trim(),
                    durationMinutes: Number(form.duration) || null,
                    pricePaise: toPaise(form.price),
                    description: form.description.trim() || null,
                  },
                })
              }
            >
              Create service
            </Button>
          </div>
        </Card>
      ) : null}

      {list.error || update.error ? (
        <Notice>{errorMessage(list.error ?? update.error)}</Notice>
      ) : null}
      {list.data && shown.length === 0 ? <Empty>No services here yet.</Empty> : null}
      {shown.length ? (
        <Table head={['Service', 'Category', 'Group', 'Unit · time', 'Price', 'Status', '']}>
          {shown.map((s) => (
            <tr key={s.id} className={s.isActive ? '' : 'opacity-60'}>
              <Td>
                <div className="font-semibold">{s.nameEn}</div>
                <div className="text-xs text-text-muted">{s.nameHi}</div>
              </Td>
              <Td className="capitalize">{s.categorySlug.replace('-', ' ')}</Td>
              <Td>{s.groupEn ?? '–'}</Td>
              <Td>
                {s.unit}
                {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
              </Td>
              <Td>
                {editing?.id === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      className={`${inputCls} w-28`}
                      inputMode="decimal"
                      aria-label={`New price for ${s.nameEn} in rupees`}
                      value={editing.price}
                      onChange={(e) => setEditing({ id: s.id, price: e.target.value })}
                      autoFocus
                    />
                    <Button
                      busy={update.isPending}
                      disabled={!(toPaise(editing.price) >= 100)}
                      onClick={() =>
                        update.mutate({
                          params: { path: { id: s.id } },
                          body: { pricePaise: toPaise(editing.price) },
                        })
                      }
                    >
                      Save
                    </Button>
                    <Button kind="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    className="font-semibold underline decoration-dotted"
                    onClick={() => setEditing({ id: s.id, price: String(s.pricePaise / 100) })}
                  >
                    {rupees(s.pricePaise)}
                  </button>
                )}
              </Td>
              <Td>
                <Badge tone={s.isActive ? 'success' : 'neutral'}>
                  {s.isActive ? 'On menu' : 'Hidden'}
                </Badge>
              </Td>
              <Td>
                <Button
                  kind="outline"
                  busy={update.isPending && update.variables?.params.path.id === s.id && !editing}
                  onClick={() =>
                    update.mutate({
                      params: { path: { id: s.id } },
                      body: { isActive: !s.isActive },
                    })
                  }
                >
                  {s.isActive ? 'Hide' : 'Show'}
                </Button>
              </Td>
            </tr>
          ))}
        </Table>
      ) : null}
    </>
  );
}
