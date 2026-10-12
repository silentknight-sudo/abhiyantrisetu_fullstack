import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { Sql } from 'postgres';
import { ENV, type Env } from '../config/env';
import { createDb } from './client';

export const DB = Symbol('DB');
export const SQL = Symbol('SQL');

@Global()
@Module({
  providers: [
    {
      provide: 'DB_CONNECTION',
      inject: [ENV],
      useFactory: (env: Env) => createDb(env.DATABASE_URL),
    },
    {
      provide: DB,
      inject: ['DB_CONNECTION'],
      useFactory: (c: ReturnType<typeof createDb>) => c.db,
    },
    {
      provide: SQL,
      inject: ['DB_CONNECTION'],
      useFactory: (c: ReturnType<typeof createDb>) => c.sql,
    },
  ],
  exports: [DB, SQL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(SQL) private readonly sql: Sql) {}

  async onApplicationShutdown() {
    await this.sql.end({ timeout: 5 });
  }
}
