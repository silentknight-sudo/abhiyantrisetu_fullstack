import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { client } from './api';
import { EAS_PROJECT_ID } from './config';

/**
 * Registers this device's Expo push token with the API. Best effort: needs a real device,
 * permission, and an EAS project id (set after `eas init`).
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice || !EAS_PROJECT_ID) return;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Updates',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    await client.api.POST('/v1/me/push-tokens', {
      body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' },
    });
  } catch {
    // Notifications are a nice-to-have; never block the app on them.
  }
}
