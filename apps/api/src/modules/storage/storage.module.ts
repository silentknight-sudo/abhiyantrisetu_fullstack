import { Global, Module } from '@nestjs/common';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ENV, type Env } from '../../config/env';
import { StorageController } from './storage.controller';
import { LocalStorageProvider, S3StorageProvider, STORAGE_PROVIDER } from './storage.provider';
import { StorageService } from './storage.service';

/** Local disk in development and test; S3 when configured; off otherwise (production default). */
export const storageMode = (env: Env) =>
  env.STORAGE_PROVIDER ?? (env.NODE_ENV === 'production' ? 'disabled' : 'local');

@Global()
@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    {
      provide: STORAGE_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) => {
        const mode = storageMode(env);
        if (mode === 's3') {
          return new S3StorageProvider(
            env.S3_BUCKET!,
            env.S3_REGION,
            env.S3_ACCESS_KEY_ID!,
            env.S3_SECRET_ACCESS_KEY!,
          );
        }
        if (mode === 'local') {
          // A key derived from the JWT secret, so links survive restarts without a new setting.
          const secret = createHash('sha256')
            .update(`uploads:${env.JWT_ACCESS_SECRET}`)
            .digest('hex');
          return new LocalStorageProvider(
            path.resolve(env.STORAGE_LOCAL_DIR),
            env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`,
            secret,
          );
        }
        return null;
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
