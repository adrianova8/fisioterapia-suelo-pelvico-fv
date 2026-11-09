// Calendario de la profesora: clases concretas de todos los programas.
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CabeceraAdmin, TarjetaSesionAdmin } from "@/components/admin-ui";
import { Icono } from "@/components/iconos";
import { Boton, CajaMensaje, Cargando, Pantalla, T, Vacio } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { DIAS_CORTOS, capitalizar, claveDia, fechaLarga, inicioDia, lunesDe, mesAnio, mismoDia, sumarDias } from "@/lib/fechas";
import type { SesionAdmin } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function CalendarioAdmin() {
  const router = useRouter();
  const hoy = inicioDia(new Date());
  const [lunes, setLunes] = useState(lunesDe(hoy));
  const [dia, setDia] = useState(hoy);

  const { datos, error, cargando, refrescando, refrescar } = useDatos(
    () => api.get<SesionAdmin[]>(`/api/admin/sesiones?desde=${encodeURIComponent(lunes.toISOString())}&hasta=${encodeURIComponent(sumarDias(lunes, 7).toISOString())}`),
    [lunes.getTime()],
  );
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const delDia = (datos ?? []).filter((s) => mismoDia(new Date(s.fechaHoraInicio), dia));

  function semana(n: number) {
    const l = sumarDias(lunes, 7 * n);
    setLunes(l);
    setDia(mismoDia(lunesDe(hoy), l) ? hoy : l);
  }

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <CabeceraAdmin titulo="Calendario" />
      <View style={est.nav}>
        <Pressable onPress={() => semana(-1)} hitSlop={12} style={{ transform: [{ scaleX: -1 }] }} accessibilityLabel="Semana anterior">
          <Icono nombre="chevron" color={colores.texto} />
        </Pressable>
        <Text style={est.mes}>{mesAnio(dia.getFullYear(), dia.getMonth() + 1)}</Text>
        <Pressable onPress={() => semana(1)} hitSlop={12} accessibilityLabel="Semana siguiente">
          <Icono nombre="chevron" color={colores.texto} />
        </Pressable>
      </View>
      <View style={est.semana}>
        {dias.map((d, i) => {
          const sel = mismoDia(d, dia);
          const n = (datos ?? []).filter((s) => mismoDia(new Date(s.fechaHoraInicio), d) && s.estado === "ACTIVA").length;
          return (
            <Pressable key={i} onPress={() => setDia(d)} style={{ alignItems: "center", flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 12, color: colores.textoSuave }}>{DIAS_CORTOS[i]}</Text>
              <View style={[est.num, sel && { backgroundColor: colores.rosa }]}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: sel ? colores.blanco : colores.texto }}>{d.getDate()}</Text>
              </View>
              <Text style={{ fontSize: 10, color: colores.textoTenue }}>{n > 0 ? `${n} cl.` : " "}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <T variante="seccion">{capitalizar(fechaLarga(dia))}</T>
        <Boton titulo="Nueva clase" icono="mas" variante="suave" pequeno onPress={() => router.push({ pathname: "/admin/nueva-clase", params: { dia: claveDia(dia) } })} />
      </View>
      <View style={{ height: espacio.s }} />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos && delDia.length === 0 ? <Vacio texto="No hay clases este día." icono="calendario" /> : null}
      {delDia.map((s) => (
        <TarjetaSesionAdmin key={s.id} s={s} onPress={() => router.push(`/admin/sesion/${s.id}`)} />
      ))}
    </Pantalla>
  );
}

const est = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: espacio.s, marginBottom: espacio.m },
  mes: { fontSize: 17, fontWeight: "600", color: colores.texto },
  semana: { flexDirection: "row", marginBottom: espacio.l },
  num: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
