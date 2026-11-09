import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Icono } from "@/components/iconos";
import { ResumenClase } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { anadirACalendario } from "@/lib/calendario";
import type { Sesion } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Confirmada() {
  const { id, origen } = useLocalSearchParams<{ id: string; origen?: string }>();
  const router = useRouter();
  const { datos: s, cargando } = useDatos(() => api.get<Sesion>(`/api/sesiones/${id}`), [id]);

  return (
    <Pantalla>
      <View style={est.cabeza}>
        <View style={est.check}>
          <Icono nombre="check" color={colores.blanco} tam={40} grosor={3} />
        </View>
        <T variante="grande" estilo={{ fontSize: 26, textAlign: "center" }}>¡Reserva confirmada!</T>
        <T variante="tenue" estilo={{ fontSize: 15 }}>Te esperamos en la clase</T>
      </View>

      {cargando && !s ? <Cargando /> : null}
      {s ? (
        <>
          <ResumenClase programa={s.programa} imagen={s.programaImagen} inicio={s.fechaHoraInicio} fin={s.fechaHoraFin} profesional={s.profesional} sala={s.sala} />
          <View style={{ height: espacio.l }} />
          {origen === "COMPENSACION" ? <CajaMensaje tipo="ok" icono="corazon" texto="Has usado una de las clases que te debemos. No gasta las de esta semana." /> : null}
          <CajaMensaje tipo="ok" icono="reloj" texto="Si no puedes venir, cancela con al menos 1 hora de antelación para no perder la sesión." />
          <View style={{ gap: espacio.s, marginTop: espacio.l }}>
            <Boton
              titulo="Añadir a mi calendario"
              variante="suave"
              icono="calendario"
              onPress={() => anadirACalendario(`${s.programa} · Mamá en movimiento`, s.fechaHoraInicio, s.fechaHoraFin, s.sala)}
            />
            <Boton titulo="Ver mis reservas" variante="texto" icono="reservas" onPress={() => router.replace("/reservas")} />
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}

const est = StyleSheet.create({
  cabeza: { alignItems: "center", gap: espacio.s, marginVertical: espacio.xxl },
  check: { width: 80, height: 80, borderRadius: 40, backgroundColor: colores.verde, alignItems: "center", justifyContent: "center", marginBottom: espacio.m },
});
