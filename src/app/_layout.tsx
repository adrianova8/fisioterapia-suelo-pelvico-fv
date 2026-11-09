// Raíz: sesión + guard por rol.
// - Sin sesión: login, registro, recuperar, invitada.
// - USUARIO: pantallas de usuaria. Nunca administración.
// - ADMIN: solo administración (no es una clienta).
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colores } from "@/constants/theme";
import { ProveedorAuth, useAuth } from "@/lib/auth";

void SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { cargando, usuario } = useAuth();

  useEffect(() => {
    if (!cargando) void SplashScreen.hideAsync();
  }, [cargando]);

  if (cargando) return null;

  const esAdmin = usuario?.rol === "ADMIN";
  const esUsuaria = usuario?.rol === "USUARIO";

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" />
        <Stack.Screen name="registro" />
        <Stack.Screen name="recuperar" />
        <Stack.Screen name="invitada" />
      </Stack.Protected>
      <Stack.Protected guard={esUsuaria}>
        <Stack.Screen name="(usuaria)" />
        <Stack.Screen name="clase/[id]" />
        <Stack.Screen name="clase/confirmada" options={{ gestureEnabled: false }} />
        <Stack.Screen name="clase/lista-espera" options={{ gestureEnabled: false }} />
        <Stack.Screen name="tarifas" />
        <Stack.Screen name="mis-datos" />
      </Stack.Protected>
      <Stack.Protected guard={!!usuario}>
        <Stack.Screen name="mas" />
      </Stack.Protected>
      <Stack.Protected guard={esAdmin}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProveedorAuth>
        <StatusBar style="dark" />
        <Navegacion />
      </ProveedorAuth>
    </SafeAreaProvider>
  );
}
