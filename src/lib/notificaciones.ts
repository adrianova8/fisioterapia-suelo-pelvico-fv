// Registro del token de notificaciones push (Expo) en el backend.
// Avisos actuales: "¡Tienes plaza!" (lista de espera) y "Clase cancelada".
// En Android las push necesitan development build + FCM (no Expo Go).
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api, MODO_DEMO } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarPush(): Promise<void> {
  if (MODO_DEMO || Platform.OS === "web" || !Device.isDevice) return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Avisos de clases",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C97878",
      });
    }
    const actual = await Notifications.getPermissionsAsync();
    let concedido = actual.granted;
    if (!concedido) concedido = (await Notifications.requestPermissionsAsync()).granted;
    if (!concedido) return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await api.post("/api/push-token", { token, plataforma: Platform.OS });
  } catch {
    // Sin push (Expo Go en Android, sin projectId…): la app sigue funcionando.
  }
}
