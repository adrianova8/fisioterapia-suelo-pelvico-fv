// Opciones comunes de la barra de pestañas inferior.
// La altura se calcula con el margen seguro inferior (barra de "deslizar para salir"
// del iPhone) para que los iconos y los nombres no queden debajo de ella.
import type { ComponentProps } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colores } from "@/constants/theme";
import type { Tabs } from "expo-router/js-tabs";

import { Icono, type NombreIcono } from "./iconos";

type Opciones = NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>;

const ALTO_BARRA = 60; // zona de icono + nombre, sin contar el margen seguro

export function useOpcionesPestanas(): Opciones {
  const { bottom } = useSafeAreaInsets();
  // En iPhone con barra de inicio el margen es ~34; sin ella, dejamos un poco de aire.
  const margenInferior = Platform.OS === "web" ? 8 : Math.max(bottom, 10);
  return {
    headerShown: false,
    tabBarActiveTintColor: colores.burdeos,
    tabBarInactiveTintColor: colores.textoSuave,
    tabBarShowLabel: true,
    tabBarLabelPosition: "below-icon",
    tabBarStyle: {
      backgroundColor: colores.blanco,
      borderTopColor: colores.borde,
      height: ALTO_BARRA + margenInferior,
      paddingTop: 8,
      paddingBottom: margenInferior,
    },
    tabBarItemStyle: { paddingVertical: 2 },
    tabBarLabelStyle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    sceneStyle: { backgroundColor: colores.fondo },
  };
}

export function iconoPestana(nombre: NombreIcono) {
  // eslint-disable-next-line react/display-name
  return ({ color }: { color: unknown }) => <Icono nombre={nombre} color={typeof color === "string" ? color : undefined} tam={24} />;
}
