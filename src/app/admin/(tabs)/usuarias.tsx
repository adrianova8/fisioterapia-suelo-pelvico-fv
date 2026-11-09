import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { CabeceraAdmin } from "@/components/admin-ui";
import { Avatar } from "@/components/usuaria-ui";
import { CajaMensaje, Campo, Cargando, Chips, Pantalla, Pastilla, T, Tarjeta, Vacio } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import type { UsuariaListado } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Usuarias() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("Todas");
  const { datos, error, cargando, refrescando, refrescar } = useDatos(() => api.get<UsuariaListado[]>("/api/admin/usuarios"));

  const programas = ["Todas", ...new Set((datos ?? []).map((u) => u.programa?.nombre).filter((x): x is string => !!x))];
  const q = busqueda.trim().toLowerCase();
  const lista = (datos ?? []).filter(
    (u) => (filtro === "Todas" || u.programa?.nombre === filtro) && (!q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <CabeceraAdmin titulo="Usuarias" />
      <Campo etiqueta="Buscar" value={busqueda} onChangeText={setBusqueda} placeholder="Nombre o email" autoCapitalize="none" />
      <Chips opciones={programas.map((p) => ({ valor: p, texto: p }))} valor={filtro} onCambio={setFiltro} />
      <View style={{ height: espacio.l }} />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos && lista.length === 0 ? <Vacio texto="No hay usuarias con ese filtro." icono="usuarias" /> : null}
      {lista.map((u) => {
        const m = u.mensualidadActual;
        return (
          <Tarjeta key={u.id} onPress={() => router.push(`/admin/usuaria/${u.id}`)} estilo={{ paddingVertical: espacio.m }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
              <Avatar nombre={u.nombre} tam={42} />
              <View style={{ flex: 1 }}>
                <T variante="fuerte" estilo={{ fontSize: 16 }}>{u.nombre}</T>
                <T variante="tenue">{u.programa?.nombre ?? "Sin programa"} · {u.email}</T>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                {m?.estado === "ACTIVA" ? (
                  <Pastilla texto={`${m.tarifa.sesionesSemana}/sem`} />
                ) : m?.estado === "PAUSADA" ? (
                  <Pastilla texto="En pausa" color={colores.ambar} fondo={colores.ambarClaro} />
                ) : (
                  <Pastilla texto="Sin plan" color={colores.textoSuave} fondo={colores.gris} />
                )}
                {u.saldoCompensacion > 0 ? <T variante="tenue" estilo={{ fontSize: 11, color: colores.verde }}>Le debemos {u.saldoCompensacion}</T> : null}
              </View>
            </View>
          </Tarjeta>
        );
      })}
    </Pantalla>
  );
}
