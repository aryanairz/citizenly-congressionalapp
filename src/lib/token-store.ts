/**
 * Platform storage for the session token and cached user.
 *
 * SecureStore is hardware-backed on iOS/Android, but it has NO web
 * implementation - its web module is an empty object, so every call throws a
 * TypeError. On web we use AsyncStorage (localStorage under the hood): not
 * hardware-secure, but the Expo web build is a dev/preview surface; the
 * production website has its own httpOnly-cookie session.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function getStoredItem(key: string): Promise<string | null> {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function deleteStoredItem(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
