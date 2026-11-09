import { StyleSheet, Text, View } from "react-native";

import { colores } from "@/constants/theme";
import { MODO_DEMO, useSinConexion } from "@/lib/api";

export function AvisoSinConexion() {
  const sin = useSinConexion();
  if (!sin) return null;
  return (
    <View style={estilos.franja}>
      <Text style={estilos.texto}>Sin conexión · estás viendo los últimos datos guardados</Text>
    </View>
  );
}

export function AvisoDemo() {
  if (!MODO_DEMO) return null;
  return (
    <View style={[estilos.franja, { backgroundColor: colores.morado }]}>
      <Text style={estilos.texto}>Modo demostración · datos de ejemplo</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  franja: { backgroundColor: colores.ambar, paddingVertical: 6, paddingHorizontal: 12 },
  texto: { color: colores.blanco, fontSize: 12, fontWeight: "600", textAlign: "center" },
});
