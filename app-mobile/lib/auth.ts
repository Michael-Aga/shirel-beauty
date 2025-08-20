import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "sb_is_admin";

async function secureAvailable() {
  try { return await SecureStore.isAvailableAsync(); } catch { return false; }
}

async function setItem(key: string, value: string) {
  if (await secureAvailable()) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}
async function getItem(key: string) {
  if (await secureAvailable()) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}
async function deleteItem(key: string) {
  if (await secureAvailable()) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
}

export async function isAdmin(): Promise<boolean> {
  return (await getItem(KEY)) === "1";
}

export async function loginWithPin(pin: string): Promise<boolean> {
  const expected = process.env.EXPO_PUBLIC_ADMIN_PIN || "";
  if (pin && expected && pin === expected) {
    await setItem(KEY, "1");
    return true;
  }
  return false;
}

export async function logout(): Promise<void> {
  await deleteItem(KEY);
}
