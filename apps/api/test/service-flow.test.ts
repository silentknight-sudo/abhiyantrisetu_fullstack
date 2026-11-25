import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, createTestApp, login, type TestContext } from './setup';

let ctx: TestContext;
let token: string;
const address = {
  line1: 'B-402',
  sector: 'Sector Pi',
  city: 'Greater Noida',
  pincode: '201310',
  location: { lat: 28.4735, lng: 77.512 },
};
const visitAt = new Date(Date.now() + 2 * 86_400_000).toISOString();

beforeAll(async () => {
  ctx = await createTestApp();
  token = (await login(ctx, '9760000001')).accessToken;
});
afterAll(async () => {
  await ctx?.app.close();
});

const post = (details: object) =>
  ctx
    .http()
    .post('/v1/requirements')
    .set(bearer(token))
    .send({ type: 'renovation', title: 'Floor tile fitting', address, details });

describe('renovation service flow', () => {
  it('keeps the chosen option, material, measurement visit and start date', async () => {
    const res = await post({
      propertyType: 'apartment',
      scope: ['Flooring'],
      areaSqft: 850,
      description: '2BHK flat, naye vitrified tiles lagwane hain.',
      option: 'Vitrified 2×2 ft',
      supplies: 'customer',
      visitAt,
      startBy: 'two_weeks',
    }).expect(201);
    expect(res.body.details).toMatchObject({
      option: 'Vitrified 2×2 ft',
      supplies: 'customer',
      visitAt,
      startBy: 'two_weeks',
      areaSqft: 850,
    });
  });

  it('keeps the answers to the category questions, and limits their size', async () => {
    const res = await post({
      propertyType: 'apartment',
      scope: ['Flooring'],
      description: 'Tiles in the living room please',
      answers: { 'Current floor': 'Old tiles', 'Tile size': '2×2 ft' },
    }).expect(201);
    expect(res.body.details.answers).toEqual({
      'Current floor': 'Old tiles',
      'Tile size': '2×2 ft',
    });
    const many = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`Q${i}`, 'A']));
    await post({
      propertyType: 'apartment',
      scope: ['Flooring'],
      description: 'Tiles in the living room please',
      answers: many,
    }).expect(400);
    await post({
      propertyType: 'apartment',
      scope: ['Flooring'],
      description: 'Tiles in the living room please',
      answers: { Q: 'x'.repeat(200) },
    }).expect(400);
  });

  it('rejects an unknown material choice or start date', async () => {
    const base = {
      propertyType: 'apartment',
      scope: ['Flooring'],
      description: 'Tiles in living room',
    };
    await post({ ...base, supplies: 'neighbour' }).expect(400);
    await post({ ...base, startBy: 'someday' }).expect(400);
    await post({ ...base, visitAt: 'tomorrow' }).expect(400);
  });
});
