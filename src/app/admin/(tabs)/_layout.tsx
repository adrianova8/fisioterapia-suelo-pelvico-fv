import { Tabs } from "expo-router/js-tabs";

import { iconoPestana, useOpcionesPestanas } from "@/components/pestanas";

export default function PestanasAdmin() {
  const opciones = useOpcionesPestanas();
  return (
    <Tabs screenOptions={opciones}>
      <Tabs.Screen name="index" options={{ title: "Panel", tabBarIcon: iconoPestana("panel") }} />
      <Tabs.Screen name="usuarias" options={{ title: "Usuarias", tabBarIcon: iconoPestana("usuarias") }} />
      <Tabs.Screen name="calendario" options={{ title: "Calendario", tabBarIcon: iconoPestana("calendario") }} />
      <Tabs.Screen name="horario" options={{ title: "Horario Base", tabBarIcon: iconoPestana("horario") }} />
    </Tabs>
  );
}
