import { Image, Linking, Pressable, ScrollView } from 'react-native';
import { radius, spacing, usePalette } from '@/lib/theme';

/** A row of photos; tap one to open it full size. Links expire, so they are never cached long. */
export function PhotoStrip({ urls, size = 96 }: { urls: string[]; size?: number }) {
  const c = usePalette();
  if (urls.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing[2] }}
    >
      {urls.map((url, i) => (
        <Pressable
          key={url}
          accessibilityRole="imagebutton"
          accessibilityLabel={`Photo ${i + 1}`}
          onPress={() => void Linking.openURL(url)}
        >
          <Image
            source={{ uri: url }}
            style={{
              width: size,
              height: size,
              borderRadius: radius.md,
              backgroundColor: c.surfaceMuted,
            }}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}
