import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { client } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { useI18n } from '@/lib/i18n';
import { radius, spacing, typeScale, usePalette } from '@/lib/theme';
import { Button, Notice, Small } from './ui';

type Accepted = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';
const ACCEPTED: Accepted[] = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

interface Photo {
  uri: string;
  key?: string;
  error?: string;
}

/**
 * Pick up to `max` photos and upload each straight to storage with a signed slot from the
 * API. Calls `onChange` with the stored file keys as uploads finish.
 */
export function PhotoPicker({
  max = 5,
  onChange,
}: {
  max?: number;
  /** Stored keys so far, and whether any upload is still running. */
  onChange: (keys: string[], uploading: boolean) => void;
}) {
  const c = usePalette();
  const { t } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const publish = (next: Photo[]) => {
    setPhotos(next);
    onChange(
      next.flatMap((p) => (p.key ? [p.key] : [])),
      next.some((p) => !p.key && !p.error),
    );
  };

  async function uploadOne(asset: ImagePicker.ImagePickerAsset): Promise<string> {
    const type = (asset.mimeType ?? 'image/jpeg').toLowerCase();
    const contentType: Accepted = ACCEPTED.includes(type as Accepted)
      ? (type as Accepted)
      : 'image/jpeg';
    const blob = await (await fetch(asset.uri)).blob();
    const slot = await client.api.POST('/v1/uploads', {
      body: { purpose: 'requirement_photo', contentType, sizeBytes: asset.fileSize ?? blob.size },
    });
    if (!slot.data) throw slot.error;
    const res = await fetch(slot.data.upload.url, {
      method: 'PUT',
      headers: slot.data.upload.headers,
      body: blob,
    });
    if (!res.ok) throw new Error(t('Upload failed ({status})', { status: res.status }));
    return slot.data.fileKey;
  }

  async function pick() {
    setError(null);
    const room = max - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: room,
      quality: 0.7,
    });
    if (result.canceled) return;
    let current: Photo[] = [
      ...photos,
      ...result.assets.slice(0, room).map((a) => ({ uri: a.uri })),
    ];
    publish(current);
    for (const asset of result.assets.slice(0, room)) {
      try {
        const key = await uploadOne(asset);
        current = current.map((p) => (p.uri === asset.uri ? { ...p, key } : p));
      } catch (err) {
        current = current.map((p) =>
          p.uri === asset.uri ? { ...p, error: errorMessage(err) } : p,
        );
      }
      publish(current);
    }
    const failed = current.find((p) => p.error);
    if (failed)
      setError(t('A photo could not be uploaded: {reason}', { reason: failed.error ?? '' }));
  }

  return (
    <View style={{ gap: spacing[2] }}>
      {photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {photos.map((p) => (
            <Pressable
              key={p.uri}
              accessibilityLabel={t('Remove photo')}
              onPress={() => publish(photos.filter((x) => x.uri !== p.uri))}
              style={{ width: 72, height: 72 }}
            >
              <Image
                source={{ uri: p.uri }}
                style={{ width: 72, height: 72, borderRadius: radius.md, opacity: p.key ? 1 : 0.5 }}
              />
              {!p.key && !p.error ? (
                <ActivityIndicator
                  style={{ position: 'absolute', top: 26, left: 26 }}
                  color={c.primary}
                />
              ) : null}
              <Text
                style={[
                  typeScale.xs,
                  {
                    position: 'absolute',
                    top: 2,
                    right: 6,
                    color: '#fff',
                    fontWeight: '700',
                    textShadowColor: '#000',
                    textShadowRadius: 2,
                  },
                ]}
              >
                ✕
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
      {photos.length < max ? (
        <Button
          title={photos.length ? t('Add more photos') : t('Add photos')}
          kind="outline"
          testID="add-photos"
          onPress={() => void pick()}
        />
      ) : null}
      <Small>
        {t('Photos help professionals quote accurately. Up to {n}; tap one to remove it.', {
          n: max,
        })}
      </Small>
    </View>
  );
}
