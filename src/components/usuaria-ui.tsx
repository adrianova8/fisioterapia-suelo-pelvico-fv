// Piezas propias de las pantallas de usuaria.
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colores, espacio, estiloDePrograma, radios } from "@/constants/theme";
import { urlCompleta } from "@/lib/api";
import { fechaCorta, hora, minutosEntre, textoApertura } from "@/lib/fechas";
import type { Sesion } from "@/lib/tipos";

import { Icono } from "./iconos";
import { Pastilla } from "./ui";

export function Anillo({ usadas, limite, tam = 84 }: { usadas: number; limite: number; tam?: number }) {
  const r = tam / 2 - 7;
  const c = 2 * Math.PI * r;
  const fr = limite > 0 ? Math.min(1, usadas / limite) : 0;
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
    <View style={{ width: tam, height: tam, alignItems: "center", justifyContent: "center" }}>
      <Svg width={tam} height={tam} style={StyleSheet.absoluteFill}>
        <Circle cx={tam / 2} cy={tam / 2} r={r} stroke={colores.gris} strokeWidth={7} fill="none" />
        {fr > 0 ? <Circle
          cx={tam / 2}
          cy={tam / 2}
          r={r}
          stroke={colores.verde}
          strokeWidth={7}
          fill="none"
          strokeDasharray={`${c * fr} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
        /> : null}
      </Svg>
      <Text style={{ fontSize: tam / 4.2, fontWeight: "700", color: colores.texto }}>
        {usadas}/{limite}
      </Text>
    </View>
      {/* Debajo del círculo (dentro se solapaba con el trazo) */}
      <Text style={{ fontSize: 11, color: colores.textoSuave }}>esta semana</Text>
    </View>
  );
}

export function Miniatura({ programa, imagen, tam = 64 }: { programa: string; imagen?: string | null; tam?: number }) {
  const url = urlCompleta(imagen);
  const est = estiloDePrograma(programa);
  if (url) return <Image source={{ uri: url }} style={{ width: tam, height: tam, borderRadius: radios.m }} contentFit="cover" />;
  return (
    <View style={{ width: tam, height: tam, borderRadius: radios.m, backgroundColor: est.color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: tam / 2 }}>{est.icono}</Text>
    </View>
  );
}

export function Avatar({ nombre, foto, tam = 40 }: { nombre: string; foto?: string | null; tam?: number }) {
  const url = urlCompleta(foto);
  if (url) return <Image source={{ uri: url }} style={{ width: tam, height: tam, borderRadius: tam / 2 }} contentFit="cover" />;
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam / 2, backgroundColor: colores.rosaClaro, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: tam / 2.4, fontWeight: "700", color: colores.burdeos }}>{nombre.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/** Pastilla de estado de una clase, según las decisiones de interfaz (§10). */
export function PastillaSesion({ s, onPress }: { s: Sesion; onPress?: () => void }) {
  switch (s.estado) {
    case "DISPONIBLE":
      return <Pastilla texto={`${s.ocupadas}/${s.capacidad}`} icono="chevron" onPress={onPress} />;
    case "RESERVADA":
      return <Pastilla texto={s.miReservaFija ? "Tu clase fija" : "Reservada"} color={colores.burdeos} fondo={colores.rosaClaro} icono="check" />;
    case "EN_LISTA_ESPERA":
      return <Pastilla texto="En lista de espera" color={colores.ambar} fondo={colores.ambarClaro} />;
    case "NO_ABIERTA":
      return <Pastilla texto={`${s.ocupadas}/${s.capacidad}`} color={colores.textoTenue} fondo={colores.gris} />;
    case "SIN_MENSUALIDAD":
    case "MENSUALIDAD_NO_ACTIVA":
      return <Pastilla texto="Plan no activado" color={colores.textoSuave} fondo={colores.gris} />;
    case "LIMITE_SEMANAL":
      return <Pastilla texto="Semana completa" color={colores.textoSuave} fondo={colores.gris} />;
    case "COMPLETA":
      return <Pastilla texto="Completo" color={colores.rojo} fondo={colores.rojoClaro} />;
    case "LISTA_ESPERA_CERRADA":
      return <Pastilla texto="Completo" color={colores.textoSuave} fondo={colores.gris} />;
    case "CANCELADA":
      return <Pastilla texto="Cancelada" color={colores.rojo} fondo={colores.rojoClaro} />;
    case "FINALIZADA":
      return <Pastilla texto="Finalizada" color={colores.textoTenue} fondo={colores.gris} />;
  }
}

export function explicacionEstado(s: Sesion): string | null {
  switch (s.estado) {
    case "NO_ABIERTA":
      return textoApertura(s.aperturaReserva);
    case "SIN_MENSUALIDAD":
      return "Tu plan de este mes no está activado. Paga en la clínica y la profesora lo activará.";
    case "MENSUALIDAD_NO_ACTIVA":
      return "Tu plan de este mes está en pausa. Habla con la profesora para reactivarlo.";
    case "LIMITE_SEMANAL":
      return "Ya has usado tus clases de esta semana. La semana empieza el lunes.";
    case "COMPLETA":
      return "La clase está completa. Puedes apuntarte a la lista de espera y te avisaremos si se libera una plaza.";
    case "LISTA_ESPERA_CERRADA":
      return "La clase está completa y la lista de espera se cierra 1 hora antes.";
    case "CANCELADA":
      return "El centro ha cancelado esta clase.";
    case "FINALIZADA":
      return "Esta clase ya ha pasado.";
    case "EN_LISTA_ESPERA":
      return "Estás en la lista de espera. Si se libera una plaza, te la daremos automáticamente y te avisaremos.";
    default:
      return null;
  }
}

export function TarjetaClase({ s, onPress, onPastilla }: { s: Sesion; onPress: () => void; onPastilla?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [est.tarjeta, pressed && { opacity: 0.85 }]}>
      <Miniatura programa={s.programa} imagen={s.programaImagen} tam={72} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={est.horaTxt}>
          {hora(s.fechaHoraInicio)} · {minutosEntre(s.fechaHoraInicio, s.fechaHoraFin)} min
        </Text>
        <Text style={est.nombre}>{s.programa}</Text>
        <View style={est.fila}>
          <Icono nombre="persona" tam={14} />
          <Text style={est.detalle}>{s.profesional}</Text>
        </View>
        <View style={est.fila}>
          <Icono nombre="ubicacion" tam={14} />
          <Text style={est.detalle}>{s.sala}</Text>
        </View>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <PastillaSesion s={s} onPress={onPastilla} />
        {s.estado === "COMPLETA" ? <Pastilla texto="Lista de espera" color={colores.rosa} fondo={colores.blanco} estilo={{ borderColor: colores.rosa }} onPress={onPastilla ?? onPress} /> : null}
      </View>
    </Pressable>
  );
}

export function ResumenClase({ programa, imagen, inicio, fin, profesional, sala }: { programa: string; imagen?: string | null; inicio: string; fin: string; profesional: string; sala: string }) {
  return (
    <View style={est.resumen}>
      <Miniatura programa={programa} imagen={imagen} tam={68} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={est.nombre}>{programa}</Text>
        <View style={est.fila}>
          <Icono nombre="calendario" tam={14} />
          <Text style={est.detalle}>
            {fechaCorta(inicio)} · {hora(inicio)} – {hora(fin)}
          </Text>
        </View>
        <View style={est.fila}>
          <Icono nombre="persona" tam={14} />
          <Text style={est.detalle}>{profesional}</Text>
        </View>
        <View style={est.fila}>
          <Icono nombre="ubicacion" tam={14} />
          <Text style={est.detalle}>{sala}</Text>
        </View>
      </View>
    </View>
  );
}

export const PIE_CLINICA = "Clínica Fátima Veiga · Suelo Pélvico Santander";

// Datos de contacto del centro (sin horario, a petición de la clínica).
export const CLINICA = {
  direccion: "C. Fernando Calderón, 8",
  localidad: "39005 Santander, Cantabria",
  telefono: "626 52 98 17",
  telefonoEnlace: "tel:+34626529817",
  mapa: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("C. Fernando Calderón, 8, 39005 Santander, Cantabria"),
};

const est = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    gap: espacio.m,
    backgroundColor: colores.blanco,
    borderRadius: radios.l,
    padding: espacio.m,
    marginBottom: espacio.m,
    alignItems: "center",
    shadowColor: "#8B1553",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  horaTxt: { fontSize: 12, color: colores.textoSuave },
  nombre: { fontSize: 16, fontWeight: "700", color: colores.texto },
  fila: { flexDirection: "row", alignItems: "center", gap: 5 },
  detalle: { fontSize: 13, color: colores.textoSuave },
  resumen: { flexDirection: "row", gap: espacio.m, backgroundColor: colores.blanco, borderRadius: radios.l, padding: espacio.m, alignItems: "center" },
});
