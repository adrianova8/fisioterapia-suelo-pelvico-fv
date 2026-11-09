// Modo invitada: calendario de los próximos 14 días, solo lectura.
import { useRouter } from "expo-router";
import { View } from "react-native";

import { TarjetaClase } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cabecera, Cargando, Chips, Pantalla, T, Vacio } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { capitalizar, claveDia, fechaLarga } from "@/lib/fechas";
import type { RespuestaSesiones, Sesion } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { useState } from "react";

export default function Invitada() {
  const router = useRouter();
  const [programa, setPrograma] = useState("Todas");
  const { datos, error, cargando, refrescando, refrescar } = useDatos(() => api.get<RespuestaSesiones>("/api/sesiones/invitada"));

  const sesiones = (datos?.sesiones ?? []).filter((s) => programa === "Todas" || s.programa === programa);
  const programas = ["Todas", ...new Set((datos?.sesiones ?? []).map((s) => s.programa))];
  const porDia = new Map<string, Sesion[]>();
  sesiones.forEach((s) => {
    const k = claveDia(new Date(s.fechaHoraInicio));
    porDia.set(k, [...(porDia.get(k) ?? []), s]);
  });

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <Cabecera titulo="Próximas clases" subtitulo="Los próximos 14 días" volver />
      <CajaMensaje texto="Estás viendo el calendario como invitada. Para reservar, crea tu cuenta o inicia sesión." />
      <Chips opciones={programas.map((p) => ({ valor: p, texto: p }))} valor={programa} onCambio={setPrograma} />
      <View style={{ height: espacio.l }} />
      {cargando ? <Cargando /> : null}
      {error ? <CajaMensaje tipo="error" texto={error} /> : null}
      {!cargando && sesiones.length === 0 ? <Vacio texto="No hay clases programadas en estos días." icono="calendario" /> : null}
      {[...porDia.entries()].map(([dia, lista]) => (
        <View key={dia}>
          <T variante="seccion">{capitalizar(fechaLarga(lista[0].fechaHoraInicio))}</T>
          {lista.map((s) => (
            <TarjetaClase key={s.id} s={{ ...s, estado: "NO_ABIERTA" }} onPress={() => router.push("/registro")} />
          ))}
        </View>
      ))}
      <Boton titulo="Crear cuenta" onPress={() => router.push("/registro")} estilo={{ marginTop: espacio.l }} />
    </Pantalla>
  );
}
