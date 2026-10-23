import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildOpenApi } from '../src/bootstrap';
import * as dtos from '../src/common/responses';
import { createTestApp, type TestContext } from './setup';

type Json = Record<string, unknown>;
let ctx: TestContext;
let doc: { components: { schemas: Record<string, { properties?: Record<string, Json> }> } };

beforeAll(async () => {
  ctx = await createTestApp();
  doc = buildOpenApi(ctx.app) as unknown as typeof doc;
});

afterAll(async () => {
  await ctx?.app.close();
});

const isArray = (s: Json): boolean =>
  s.type === 'array' || (Array.isArray(s.anyOf) && (s.anyOf as Json[]).some(isArray));
const isNullable = (s: Json): boolean =>
  s.nullable === true ||
  (Array.isArray(s.type) && s.type.includes('null')) ||
  (Array.isArray(s.anyOf) && (s.anyOf as Json[]).some((x) => x.type === 'null'));

/** Every response DTO the controllers use, with the zod schema it encodes through. */
const responses = Object.values(dtos).map((d) => ({
  dto: d.name,
  schema: d.schema as z.ZodObject,
}));

describe('OpenAPI document', () => {
  it('documents every response schema', () => {
    const missing = responses.filter((r) => !doc.components.schemas[r.dto]).map((r) => r.dto);
    expect(missing).toEqual([]);
  });

  it('keeps arrays and nullability exactly as the zod schemas say', () => {
    const drift: string[] = [];
    for (const { dto, schema } of responses) {
      const wire = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as {
        properties: Record<string, Json>;
      };
      const documented = doc.components.schemas[dto]!.properties ?? {};
      for (const [key, expected] of Object.entries(wire.properties)) {
        const actual = documented[key];
        if (!actual) {
          drift.push(`${dto}.${key} missing`);
          continue;
        }
        if (isArray(expected) !== isArray(actual)) drift.push(`${dto}.${key} array mismatch`);
        if (isNullable(expected) !== isNullable(actual))
          drift.push(`${dto}.${key} nullable mismatch`);
      }
    }
    expect(drift).toEqual([]);
  });
});
