import { Stack } from "expo-router";

import { colores } from "@/constants/theme";

export default function LayoutAdmin() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colores.fondo } }} />;
}
