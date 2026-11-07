import { useSyncExternalStore } from 'react';
import type { MessageKey } from './i18n';

/** Categories with a fixed-price menu; the home shortcuts open these instead of the form. */
export const BOOKABLE: Record<string, MessageKey> = {
  plumbing: 'Plumber',
  electrical: 'Electrician',
  carpentry: 'Carpenter',
  'ac-repair': 'AC technician',
};

/** A service from the booking menu, as GET /v1/catalog/services returns it. */
export type CartService = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameHi: string;
  unit: string;
  durationMinutes: number | null;
  pricePaise: number;
};
export type CartLine = { service: CartService; quantity: number };
type Cart = { category: string | null; lines: CartLine[] };

const MAX_QTY = 20;
let cart: Cart = { category: null, lines: [] };
const listeners = new Set<() => void>();
const set = (next: Cart) => {
  cart = next;
  for (const l of listeners) l();
};

/** One cart for one category at a time; adding from another category starts afresh. */
export const cartStore = {
  get: () => cart,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  change(category: string, service: CartService, delta: number) {
    const lines = cart.category === category ? cart.lines : [];
    const found = lines.find((l) => l.service.id === service.id);
    const quantity = Math.min(MAX_QTY, Math.max(0, (found?.quantity ?? 0) + delta));
    const rest = lines.filter((l) => l.service.id !== service.id);
    const next = quantity
      ? found
        ? lines.map((l) => (l.service.id === service.id ? { ...l, quantity } : l))
        : [...rest, { service, quantity }]
      : rest;
    set({ category: next.length ? category : null, lines: next });
  },
  clear: () => set({ category: null, lines: [] }),
};

export function useCart() {
  const c = useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.get);
  const totalPaise = c.lines.reduce((t, l) => t + l.quantity * l.service.pricePaise, 0);
  const count = c.lines.reduce((t, l) => t + l.quantity, 0);
  const minutes = c.lines.reduce((t, l) => t + l.quantity * (l.service.durationMinutes ?? 0), 0);
  const qty = (id: string) => c.lines.find((l) => l.service.id === id)?.quantity ?? 0;
  return { ...c, totalPaise, count, minutes, qty };
}
