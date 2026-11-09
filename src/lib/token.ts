// Token de sesión: SecureStore en el móvil, localStorage en la web.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const CLAVE = "session_token";

export async function leerToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(CLAVE) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(CLAVE);
}

export async function guardarToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(CLAVE, token);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(CLAVE, token);
}

export async function borrarToken(): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.removeItem(CLAVE);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE);
}
