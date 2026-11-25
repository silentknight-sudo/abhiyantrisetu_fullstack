import { router } from 'expo-router';
import type { Go } from './pillars';

/** Open a pillar tile or card: the fixed-price menu, the quote form or a screen. */
export function openGo(go: Go, t: (k: never) => string) {
  if ('book' in go) {
    router.push({ pathname: '/book/[category]', params: { category: go.book } });
  } else if ('service' in go) {
    router.push({ pathname: '/service/[slug]', params: { slug: go.service } });
  } else if ('href' in go) {
    router.push(go.href);
  } else {
    router.push({
      pathname: '/requirement/new',
      params: {
        type: go.req,
        ...(go.category ? { category: go.category } : {}),
        ...(go.title ? { title: t(go.title as never) } : {}),
      },
    });
  }
}
