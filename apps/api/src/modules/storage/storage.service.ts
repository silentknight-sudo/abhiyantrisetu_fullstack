import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/auth';
import { ENV, type Env } from '../../config/env';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.provider';

export const UPLOAD_PURPOSES = ['requirement_photo'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Image types we accept, and the extension each is stored under. */
export const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const UPLOAD_TTL = 10 * 60;
const VIEW_TTL = 30 * 60;

@Injectable()
export class StorageService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider | null,
  ) {}

  private provider() {
    if (!this.storage) {
      throw new ServiceUnavailableException({
        code: 'PHOTOS_NOT_OPEN',
        message: 'Photo uploads open at launch',
      });
    }
    return this.storage;
  }

  /**
   * A signed, 10-minute upload slot. The key is ours (user, purpose, random id), so a
   * client can only ever write under its own prefix.
   */
  createUpload(
    user: AuthUser,
    input: { purpose: UploadPurpose; contentType: ImageType; sizeBytes: number },
  ) {
    if (input.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new BadRequestException({
        code: 'TOO_LARGE',
        message: 'Photos must be 10 MB or smaller',
      });
    }
    const fileKey = `u/${user.id}/${input.purpose}/${randomUUID()}.${IMAGE_TYPES[input.contentType]}`;
    return {
      fileKey,
      upload: this.provider().presignUpload(fileKey, input.contentType, UPLOAD_TTL),
      expiresInSeconds: UPLOAD_TTL,
    };
  }

  /** Refuses keys this user did not upload for this purpose (a forged key cannot attach someone else's file). */
  assertOwned(userId: string, purpose: UploadPurpose, keys: readonly string[]) {
    const prefix = `u/${userId}/${purpose}/`;
    const bad = keys.find((k) => !k.startsWith(prefix) || k.includes('..'));
    if (bad)
      throw new BadRequestException({
        code: 'BAD_FILE',
        message: 'One of the photos was not uploaded by you',
      });
  }

  /** Short-lived links to view stored photos; none while storage is off. */
  viewUrls(keys: readonly unknown[] | undefined): string[] {
    if (!this.storage || !Array.isArray(keys)) return [];
    return keys
      .filter((k): k is string => typeof k === 'string')
      .map((k) => this.storage!.presignDownload(k, VIEW_TTL));
  }
}
