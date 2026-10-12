import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://setu:setu@localhost:5432/setu_dev',
  },
  // PostGIS owns these; never let drizzle-kit try to manage them.
  tablesFilter: ['!spatial_ref_sys', '!geography_columns', '!geometry_columns'],
  strict: true,
  verbose: true,
});
