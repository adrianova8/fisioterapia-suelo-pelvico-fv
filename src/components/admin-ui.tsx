// Piezas de las pantallas de administración.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colores, espacio, radios } from "@/constants/theme";
import { hora, minutosEntre } from "@/lib/fechas";
import type { SesionAdmin } from "@/lib/tipos";

import { Icono } from "./iconos";
import { Avatar, Miniatura, PIE_CLINICA } from "./usuaria-ui";
import { Pastilla, T } from "./ui";

export function CabeceraAdmin({ titulo = "Administración", derecha }: { titulo?: string; derecha?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", marginTop: espacio.s, marginBottom: espacio.l }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colores.morado, fontWeight: "600" }}>{PIE_CLINICA}</Text>
        <T variante="grande" estilo={{ fontSize: 26 }}>{titulo}</T>
      </View>
      {derecha}
    </View>
  );
}

export function TarjetaSesionAdmin({ s, onPress }: { s: SesionAdmin; onPress: () => void }) {
  const cancelada = s.estado === "CANCELADA";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [e.tarjeta, cancelada && { opacity: 0.6 }, pressed && { opacity: 0.8 }]}>
      <Miniatura programa={s.programa} imagen={s.programaImagen} tam={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <T variante="tenue">{hora(s.fechaHoraInicio)} · {minutosEntre(s.fechaHoraInicio, s.fechaHoraFin)} min</T>
        <T variante="fuerte" estilo={{ fontSize: 16, textDecorationLine: cancelada ? "line-through" : "none" }}>{s.programa}</T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Avatar nombre={s.profesional} foto={s.profesionalFoto} tam={18} />
          <T variante="tenue">{s.profesional} · {s.sala}</T>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        {cancelada ? (
          <Pastilla texto="Cancelada" color={colores.rojo} fondo={colores.rojoClaro} />
        ) : (
          <Pastilla
            texto={`${s.ocupadas}/${s.capacidad}`}
            color={s.ocupadas >= s.capacidad ? colores.rojo : colores.verde}
            fondo={s.ocupadas >= s.capacidad ? colores.rojoClaro : colores.verdeClaro}
          />
        )}
        {s.enEspera > 0 ? <T variante="tenue" estilo={{ fontSize: 11 }}>{s.enEspera} en espera</T> : null}
      </View>
      <Icono nombre="chevron" tam={16} color={colores.textoTenue} />
    </Pressable>
  );
}

export function Contador({ valor, onCambio, min = 0, max = 99 }: { valor: number; onCambio: (n: number) => void; min?: number; max?: number }) {
  return (
    <View style={e.contador}>
      <Pressable onPress={() => onCambio(Math.max(min, valor - 1))} style={e.botonCont} accessibilityLabel="Menos">
        <Text style={e.signo}>−</Text>
      </Pressable>
      <Text style={e.valor}>{valor}</Text>
      <Pressable onPress={() => onCambio(Math.min(max, valor + 1))} style={e.botonCont} accessibilityLabel="Más">
        <Text style={e.signo}>+</Text>
      </Pressable>
    </View>
  );
}

export function Estadistica({ valor, texto }: { valor: string | number; texto: string }) {
  return (
    <View style={e.estad}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: colores.burdeos }}>{valor}</Text>
      <Text style={{ fontSize: 12, color: colores.textoSuave, textAlign: "center" }}>{texto}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.m,
    backgroundColor: colores.blanco,
    borderRadius: radios.l,
    padding: espacio.m,
    marginBottom: espacio.s,
  },
  contador: { flexDirection: "row", alignItems: "center", gap: espacio.m },
  botonCont: { width: 38, height: 38, borderRadius: 19, backgroundColor: colores.rosaSuave, alignItems: "center", justifyContent: "center" },
  signo: { fontSize: 20, color: colores.burdeos, fontWeight: "700" },
  valor: { fontSize: 18, fontWeight: "700", minWidth: 28, textAlign: "center", color: colores.texto },
  estad: { flex: 1, backgroundColor: colores.blanco, borderRadius: radios.l, padding: espacio.m, alignItems: "center", gap: 2 },
});
