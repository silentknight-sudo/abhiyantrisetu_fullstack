import createQueryHooks from 'openapi-react-query';
import type { SetuClient } from './index';

/**
 * TanStack Query hooks over the typed client:
 * `const $api = createSetuQueries(client); $api.useQuery('get', '/v1/jobs')`.
 */
export function createSetuQueries(client: SetuClient) {
  return createQueryHooks(client.api);
}
