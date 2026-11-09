// Calendario de clases de la usuaria (solo su programa).
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icono } from "@/components/iconos";
import { TarjetaClase } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T, Vacio } from "@/components/ui";
import { colores, espacio, radios } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { reservar, unirseLista } from "@/lib/acciones";
import { alerta } from "@/lib/dialogos";
import { DIAS_CORTOS, MESES, capitalizar, fechaLarga, inicioDia, lunesDe, mesAnio, mismoDia, sumarDias } from "@/lib/fechas";
import type { RespuestaSesiones } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Clases() {
  const router = useRouter();
  const hoy = inicioDia(new Date());
  const [lunes, setLunes] = useState(lunesDe(hoy));
  const [dia, setDia] = useState(hoy);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);

  const { datos, error, cargando, refrescando, refrescar, recargar } = useDatos(
    () =>
      api.get<RespuestaSesiones>(
        `/api/sesiones?desde=${encodeURIComponent(lunes.toISOString())}&hasta=${encodeURIComponent(sumarDias(lunes, 7).toISOString())}`,
      ),
    [lunes.getTime()],
  );

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const delDia = (datos?.sesiones ?? []).filter((s) => mismoDia(new Date(s.fechaHoraInicio), dia));
  const mesDia = datos?.mensualidades.find((m) => m.anio === dia.getFullYear() && m.mes === dia.getMonth() + 1);
  const planMes = mesDia?.mensualidad;

  function cambiarSemana(n: number) {
    const nuevo = sumarDias(lunes, 7 * n);
    setLunes(nuevo);
    setDia(n > 0 || nuevo > hoy ? nuevo : mismoDia(lunesDe(hoy), nuevo) ? hoy : nuevo);
    setAbierta(null);
  }

  async function ejecutar(accion: "reservar" | "unirse", id: number) {
    setEnviando(true);
    try {
      if (accion === "reservar") await reservar(router, id);
      else await unirseLista(router, id);
      setAbierta(null);
    } catch (e) {
      alerta("No se ha podido completar", mensajeError(e));
      void recargar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <T variante="grande" estilo={{ fontSize: 28, marginTop: espacio.s, marginBottom: espacio.m }}>Clases</T>

      <View style={est.navMes}>
        <Pressable onPress={() => cambiarSemana(-1)} hitSlop={12} accessibilityLabel="Semana anterior" style={{ transform: [{ scaleX: -1 }] }}>
          <Icono nombre="chevron" color={colores.texto} />
        </Pressable>
        <Text style={est.mes}>{mesAnio(dia.getFullYear(), dia.getMonth() + 1)}</Text>
        <Pressable onPress={() => cambiarSemana(1)} hitSlop={12} accessibilityLabel="Semana siguiente">
          <Icono nombre="chevron" color={colores.texto} />
        </Pressable>
      </View>

      <View style={est.semana}>
        {dias.map((d, i) => {
          const sel = mismoDia(d, dia);
          const pasado = d < hoy;
          const hay = (datos?.sesiones ?? []).some((s) => mismoDia(new Date(s.fechaHoraInicio), d));
          return (
            <Pressable key={i} onPress={() => { setDia(d); setAbierta(null); }} style={est.dia}>
              <Text style={est.letra}>{DIAS_CORTOS[i]}</Text>
              <View style={[est.numero, sel && est.numeroSel]}>
                <Text style={[est.textoNumero, pasado && { color: colores.textoTenue }, sel && { color: colores.blanco }]}>{d.getDate()}</Text>
              </View>
              <View style={[est.punto, { opacity: hay && !sel ? 1 : 0 }]} />
            </Pressable>
          );
        })}
      </View>

      {datos && !planMes ? (
        <CajaMensaje tipo="aviso" texto={`Tu plan de ${MESES[dia.getMonth()]} no está activado. Paga en la clínica y la profesora lo activará para que puedas reservar.`} />
      ) : null}
      {planMes && planMes.estado !== "ACTIVA" ? (
        <CajaMensaje tipo="aviso" texto={`Tu plan de ${MESES[dia.getMonth()]} está ${planMes.estado === "PAUSADA" ? "en pausa" : "finalizado"}.`} />
      ) : null}

      <T variante="seccion">{capitalizar(fechaLarga(dia))}</T>

      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos && delDia.length === 0 ? <Vacio texto="No hay clases de tu programa este día." icono="calendario" /> : null}

      {delDia.map((s) => (
        <View key={s.id}>
          <TarjetaClase
            s={s}
            onPress={() => router.push(`/clase/${s.id}`)}
            onPastilla={s.puedeReservar || s.puedeUnirseListaEspera ? () => setAbierta(abierta === s.id ? null : s.id) : undefined}
          />
          {abierta === s.id ? (
            <View style={est.accion}>
              {s.puedeReservar ? (
                <Boton titulo="Reservar" pequeno estilo={{ flex: 1 }} cargando={enviando} onPress={() => ejecutar("reservar", s.id)} />
              ) : (
                <Boton titulo="Unirme a la lista de espera" variante="secundario" pequeno estilo={{ flex: 1 }} cargando={enviando} onPress={() => ejecutar("unirse", s.id)} />
              )}
              <Pressable onPress={() => setAbierta(null)} style={est.cerrar} accessibilityLabel="Cerrar">
                <Icono nombre="cerrar" color={colores.textoSuave} />
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </Pantalla>
  );
}

const est = StyleSheet.create({
  navMes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: espacio.s, marginBottom: espacio.m },
  mes: { fontSize: 17, fontWeight: "600", color: colores.texto },
  semana: { flexDirection: "row", justifyContent: "space-between", marginBottom: espacio.l },
  dia: { alignItems: "center", gap: 6, flex: 1 },
  letra: { fontSize: 12, color: colores.textoSuave },
  numero: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  numeroSel: { backgroundColor: colores.rosa },
  textoNumero: { fontSize: 16, fontWeight: "600", color: colores.texto },
  punto: { width: 5, height: 5, borderRadius: 3, backgroundColor: colores.rosa },
  accion: { flexDirection: "row", gap: espacio.s, alignItems: "center", marginBottom: espacio.m, paddingHorizontal: espacio.s },
  cerrar: { width: 38, height: 38, borderRadius: radios.pastilla, backgroundColor: colores.blanco, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colores.borde },
});
