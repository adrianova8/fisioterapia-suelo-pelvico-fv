import { Tabs } from "expo-router/js-tabs";

import { iconoPestana, useOpcionesPestanas } from "@/components/pestanas";

export default function LayoutUsuaria() {
  const opciones = useOpcionesPestanas();
  return (
    <Tabs screenOptions={opciones}>
      <Tabs.Screen name="inicio" options={{ title: "Inicio", tabBarIcon: iconoPestana("inicio") }} />
      <Tabs.Screen name="clases" options={{ title: "Clases", tabBarIcon: iconoPestana("clases") }} />
      <Tabs.Screen name="reservas" options={{ title: "Reservas", tabBarIcon: iconoPestana("reservas") }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil", tabBarIcon: iconoPestana("perfil") }} />
    </Tabs>
  );
}
