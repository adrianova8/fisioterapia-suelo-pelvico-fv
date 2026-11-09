// Horario Base — Clases con recurrencia semanal.
import { useRouter } from "expo-router";
import { View } from "react-native";

import { CabeceraAdmin } from "@/components/admin-ui";
import { Miniatura } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, Pastilla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { DIAS, capitalizar } from "@/lib/fechas";
import type { PlantillaHueco } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function HorarioBase() {
  const router = useRouter();
  const { datos, error, cargando, refrescando, refrescar } = useDatos(() => api.get<PlantillaHueco[]>("/api/admin/plantilla"));
  const activos = (datos ?? []).filter((p) => p.activa);

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <CabeceraAdmin titulo="Horario Base" />
      <T variante="tenue" estilo={{ marginTop: -espacio.m, marginBottom: espacio.l, fontSize: 15 }}>Clases con recurrencia semanal</T>
      <CajaMensaje texto="Los cambios afectan a las semanas que aún no se han generado. Las clases ya creadas (que pueden tener reservas) no cambian: para tocar un día concreto, usa el Calendario." />
      <Boton titulo="Añadir clase al horario" icono="mas" variante="suave" onPress={() => router.push("/admin/editar-horario")} estilo={{ marginBottom: espacio.l }} />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const del = activos.filter((p) => p.diaSemana === d).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
        if (del.length === 0) return null;
        return (
          <View key={d}>
            <T variante="seccion">{capitalizar(DIAS[d - 1])}</T>
            {del.map((p) => (
              <Tarjeta key={p.id} onPress={() => router.push({ pathname: "/admin/editar-horario", params: { id: String(p.id) } })} estilo={{ paddingVertical: espacio.m }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
                  <Miniatura programa={p.programa} tam={44} />
                  <View style={{ flex: 1 }}>
                    <T variante="fuerte" estilo={{ fontSize: 16 }}>{p.horaInicio} · {p.programa}</T>
                    <T variante="tenue">{p.duracionMinutos} min · {p.profesional} · {p.sala}</T>
                  </View>
                  <Pastilla texto={`${p.capacidad} plazas`} color={colores.burdeos} fondo={colores.rosaSuave} />
                </View>
              </Tarjeta>
            ))}
          </View>
        );
      })}
    </Pantalla>
  );
}
