import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

// expo-notifications push tokens were removed from Expo Go in SDK 53.
// Only import and use when running as a standalone/dev-client build.
const isExpoGo = Constants.appOwnership === 'expo';

export async function setupPushNotifications(): Promise<void> {
  if (!Device.isDevice || isExpoGo) return;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Style In Need Fashions',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#C8A97E',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (token) await api.post('/notifications/push-token', { token }).catch(() => {});
  } catch (err) {
    console.warn('[push] setup failed:', err);
  }
}

export function setupForegroundHandler(): () => void {
  if (isExpoGo) return () => {};
  let cleanup = () => {};
  import('expo-notifications').then((Notifications) => {
    const sub = Notifications.addNotificationReceivedListener(() => {});
    cleanup = () => sub.remove();
  }).catch(() => {});
  return () => cleanup();
}
