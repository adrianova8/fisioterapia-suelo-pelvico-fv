import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Boton, CajaMensaje, Cargando, Pantalla, Pastilla, Segmentos, T, Tarjeta, Vacio } from "@/components/ui";
import { colores, espacio, radios } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta, confirmar } from "@/lib/dialogos";
import { DIAS_ABREV, MESES_ABREV, diaSemana, hora } from "@/lib/fechas";
import type { EstadoReserva, Reserva } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

const TEXTO_ESTADO: Record<EstadoReserva, { t: string; c: string; f: string }> = {
  CONFIRMADA: { t: "Reservada", c: colores.burdeos, f: colores.rosaClaro },
  ASISTIDA: { t: "Asististe", c: colores.verde, f: colores.verdeClaro },
  NO_SHOW: { t: "No asististe", c: colores.rojo, f: colores.rojoClaro },
  CANCELADA_CON_CREDITO: { t: "Cancelada a tiempo", c: colores.textoSuave, f: colores.gris },
  CANCELADA_SIN_CREDITO: { t: "Cancelada tarde", c: colores.ambar, f: colores.ambarClaro },
};

export default function Reservas() {
  const router = useRouter();
  const [pestana, setPestana] = useState<"proximas" | "historial">("proximas");
  const [cancelando, setCancelando] = useState<number | null>(null);
  const { datos, error, cargando, refrescando, refrescar, recargar } = useDatos(() => api.get<Reserva[]>("/api/reservas"));

  const ahora = Date.now();
  const lista = datos ?? [];
  const esProxima = (r: Reserva) => r.estado === "CONFIRMADA" && new Date(r.sesion.fechaHoraInicio).getTime() > ahora && r.sesion.estado === "ACTIVA";
  const proximas = lista.filter(esProxima).sort((a, b) => a.sesion.fechaHoraInicio.localeCompare(b.sesion.fechaHoraInicio));
  const historial = lista.filter((r) => !esProxima(r)).sort((a, b) => b.sesion.fechaHoraInicio.localeCompare(a.sesion.fechaHoraInicio));
  const mostrar = pestana === "proximas" ? proximas : historial;

  async function cancelar(r: Reserva) {
    const aTiempo = new Date(r.sesion.fechaHoraInicio).getTime() - Date.now() >= 3600_000;
    const verbo = r.fija ? "Liberar mi plaza" : "Cancelar reserva";
    const ok = await confirmar(
      verbo,
      aTiempo
        ? "Faltan más de 1 hora: recuperas la sesión para otro día de esta semana y la plaza queda libre para otra compañera."
        : "Falta menos de 1 hora: la sesión cuenta como usada y no podrás volver a reservar esta clase.",
      verbo,
      "Mantener",
      true,
    );
    if (!ok) return;
    setCancelando(r.id);
    try {
      await api.patch("/api/reservas", { reservaId: r.id });
      await recargar();
    } catch (e) {
      alerta("No se ha podido cancelar", mensajeError(e));
    } finally {
      setCancelando(null);
    }
  }

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <T variante="grande" estilo={{ fontSize: 28, marginTop: espacio.s, marginBottom: espacio.l }}>Mis reservas</T>
      <Segmentos
        opciones={[
          { valor: "proximas", texto: "Próximas" },
          { valor: "historial", texto: "Historial" },
        ]}
        valor={pestana}
        onCambio={setPestana}
      />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos && mostrar.length === 0 ? (
        <>
          <Vacio texto={pestana === "proximas" ? "No tienes clases reservadas." : "Aún no hay clases en tu historial."} icono="reservas" />
          {pestana === "proximas" ? <Boton titulo="Ver clases" variante="secundario" onPress={() => router.push("/clases")} /> : null}
        </>
      ) : null}

      {mostrar.map((r) => {
        const d = new Date(r.sesion.fechaHoraInicio);
        const canceladaCentro = r.sesion.estado === "CANCELADA";
        const est = TEXTO_ESTADO[r.estado];
        return (
          <Tarjeta key={r.id} onPress={() => router.push(`/clase/${r.sesion.id}`)}>
            <View style={{ flexDirection: "row", gap: espacio.m }}>
              <View style={e.fecha}>
                <Text style={e.diaSem}>{DIAS_ABREV[diaSemana(d) - 1].toUpperCase()}</Text>
                <Text style={e.num}>{d.getDate()}</Text>
                <Text style={e.diaSem}>{MESES_ABREV[d.getMonth()].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T variante="fuerte" estilo={{ fontSize: 16 }}>{r.sesion.programa}</T>
                <T variante="tenue" estilo={{ fontSize: 14, color: colores.texto }}>
                  {hora(r.sesion.fechaHoraInicio)} – {hora(r.sesion.fechaHoraFin)}
                </T>
                <T variante="tenue">{r.sesion.profesional} · {r.sesion.sala}</T>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {r.fija ? <Pastilla texto="Clase fija" color={colores.burdeos} fondo={colores.rosaClaro} /> : null}
                  {r.origen === "COMPENSACION" ? <Pastilla texto="Clase compensada" color={colores.verde} fondo={colores.verdeClaro} /> : null}
                  {canceladaCentro ? <Pastilla texto="Clase cancelada por el centro" color={colores.rojo} fondo={colores.rojoClaro} /> : pestana === "historial" ? <Pastilla texto={est.t} color={est.c} fondo={est.f} /> : null}
                </View>
              </View>
            </View>
            {pestana === "proximas" ? (
              <Boton
                titulo={r.fija ? "Liberar mi plaza" : "Cancelar"}
                variante="suave"
                pequeno
                estilo={{ marginTop: espacio.m }}
                cargando={cancelando === r.id}
                onPress={() => cancelar(r)}
              />
            ) : null}
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}

const e = StyleSheet.create({
  fecha: { width: 58, borderRadius: radios.m, backgroundColor: colores.rosaSuave, alignItems: "center", justifyContent: "center", paddingVertical: espacio.s },
  diaSem: { fontSize: 11, fontWeight: "700", color: colores.burdeos },
  num: { fontSize: 22, fontWeight: "700", color: colores.burdeos },
});
