// Entrar con Google.
// - Real: expo-auth-session abre la ventana de Google y devuelve un id_token,
//   que se manda a POST /api/auth/google. El backend lo verifica y crea la
//   usuaria si no existe (programa por defecto, sin plan).
// - Modo demostración: no abre Google; entra con una usuaria de ejemplo.
// Client IDs (Google Cloud → Credenciales → ID de cliente OAuth), en .env.local:
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
// En móvil necesita un development build (`eas build --profile development`):
// en Expo Go Google no permite volver a la app.
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";

import { MODO_DEMO } from "./api";

WebBrowser.maybeCompleteAuthSession();

const IDS = {
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
};

const ID_PLATAFORMA = Platform.select({ ios: IDS.iosClientId, android: IDS.androidClientId, default: IDS.webClientId });
const EN_EXPO_GO = Constants.executionEnvironment === "storeClient";

/** Motivo por el que Google no está disponible ahora (o null si se puede usar). */
export const GOOGLE_NO_DISPONIBLE: string | null = MODO_DEMO
  ? null
  : !ID_PLATAFORMA
    ? "Entrar con Google aún no está configurado. Usa tu email y contraseña."
    : EN_EXPO_GO && Platform.OS !== "web"
      ? "Entrar con Google no funciona en Expo Go. Usa tu email y contraseña."
      : null;

/**
 * Devuelve `pedir()`, que abre Google y resuelve con el id_token
 * ("demo" en modo demostración) o null si la usuaria cancela.
 */
export function useGoogle() {
  // El hook necesita un client ID aunque no se use; ponemos uno de relleno.
  const relleno = "sin-configurar.apps.googleusercontent.com";
  const [peticion, respuesta, abrir] = Google.useIdTokenAuthRequest({
    iosClientId: IDS.iosClientId ?? relleno,
    androidClientId: IDS.androidClientId ?? relleno,
    webClientId: IDS.webClientId ?? relleno,
    selectAccount: true,
  });
  const pendiente = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    if (!respuesta || !pendiente.current) return;
    const resolver = pendiente.current;
    pendiente.current = null;
    if (respuesta.type === "success") {
      resolver((respuesta.params.id_token as string | undefined) ?? respuesta.authentication?.idToken ?? null);
    } else {
      resolver(null);
    }
  }, [respuesta]);

  const pedir = useCallback(async (): Promise<string | null> => {
    if (MODO_DEMO) return "demo";
    if (GOOGLE_NO_DISPONIBLE) throw new Error(GOOGLE_NO_DISPONIBLE);
    if (!peticion) throw new Error("Google aún se está preparando. Inténtalo de nuevo.");
    const promesa = new Promise<string | null>((res) => (pendiente.current = res));
    const r = await abrir();
    if (r.type !== "success") {
      pendiente.current = null;
      return null;
    }
    return promesa;
  }, [peticion, abrir]);

  return { pedir, listo: MODO_DEMO || !!peticion };
}
