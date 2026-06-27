/**
 * Secure storage abstraction.
 *
 * expo-secure-store uses native Keychain/Keystore APIs and cannot run in Expo Go.
 * This module uses @react-native-async-storage/async-storage as a drop-in replacement
 * so the app works in Expo Go during development.
 *
 * For production builds (custom dev client / EAS Build), you can swap this back
 * to expo-secure-store which provides OS-level encryption at rest.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
