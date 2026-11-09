import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

import { Icono } from "@/components/iconos";
import { ResumenClase } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import type { Sesion } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function ListaEspera() {
  const { id, posicion } = useLocalSearchParams<{ id: string; posicion?: string }>();
  const router = useRouter();
  const { datos: s, cargando } = useDatos(() => api.get<Sesion>(`/api/sesiones/${id}`), [id]);

  return (
    <Pantalla>
      <View style={{ alignItems: "center", gap: espacio.m, marginVertical: espacio.xxl }}>
        <Icono nombre="reloj" color={colores.rosa} tam={64} grosor={1.6} />
        <T variante="grande" estilo={{ fontSize: 24, textAlign: "center" }}>Te has apuntado a la lista de espera</T>
        <T variante="tenue" estilo={{ fontSize: 15, textAlign: "center" }}>
          Si se libera una plaza, te la daremos automáticamente y te avisaremos.
        </T>
        {posicion ? <T variante="fuerte" estilo={{ color: colores.burdeos }}>Eres la número {posicion} de la lista</T> : null}
      </View>

      {cargando && !s ? <Cargando /> : null}
      {s ? <ResumenClase programa={s.programa} imagen={s.programaImagen} inicio={s.fechaHoraInicio} fin={s.fechaHoraFin} profesional={s.profesional} sala={s.sala} /> : null}
      <View style={{ height: espacio.l }} />
      <CajaMensaje texto="La asignación automática de plazas se detiene 1 hora antes de la clase. Si te damos la plaza, contará como una de tus clases de la semana." />
      <Boton titulo="Ver otras clases" variante="secundario" onPress={() => router.replace("/clases")} estilo={{ marginTop: espacio.l }} />
    </Pantalla>
  );
}
