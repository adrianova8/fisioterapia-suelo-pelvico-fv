// Panel de la profesora: clases de hoy y resumen.
import { useRouter } from "expo-router";
import { View } from "react-native";

import { CabeceraAdmin, Estadistica, TarjetaSesionAdmin } from "@/components/admin-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T, Vacio } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmar } from "@/lib/dialogos";
import { capitalizar, fechaLarga, inicioDia, sumarDias } from "@/lib/fechas";
import type { SesionAdmin, UsuariaListado } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Panel() {
  const router = useRouter();
  const { salir } = useAuth();
  const hoy = inicioDia(new Date());
  const { datos, error, cargando, refrescando, refrescar } = useDatos(async () => {
    const [sesiones, usuarias] = await Promise.all([
      api.get<SesionAdmin[]>(`/api/admin/sesiones?desde=${encodeURIComponent(hoy.toISOString())}&hasta=${encodeURIComponent(sumarDias(hoy, 1).toISOString())}`),
      api.get<UsuariaListado[]>("/api/admin/usuarios"),
    ]);
    return { sesiones, usuarias };
  });

  const activas = datos?.usuarias.filter((u) => u.mensualidadActual?.estado === "ACTIVA").length ?? 0;
  const sinPlan = datos?.usuarias.filter((u) => !u.mensualidadActual).length ?? 0;
  const plazasHoy = datos?.sesiones.filter((s) => s.estado === "ACTIVA").reduce((n, s) => n + s.ocupadas, 0) ?? 0;

  async function onSalir() {
    if (await confirmar("Cerrar sesión", "¿Quieres salir de la cuenta de administración?", "Salir", "Cancelar")) {
      await salir();
      router.replace("/login");
    }
  }

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <CabeceraAdmin />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos ? (
        <>
          <View style={{ flexDirection: "row", gap: espacio.s, marginBottom: espacio.l }}>
            <Estadistica valor={activas} texto="con plan activo este mes" />
            <Estadistica valor={sinPlan} texto="sin plan este mes" />
            <Estadistica valor={plazasHoy} texto="plazas ocupadas hoy" />
          </View>
          <T variante="seccion">Hoy · {capitalizar(fechaLarga(hoy))}</T>
          {datos.sesiones.length === 0 ? <Vacio texto="Hoy no hay clases." icono="calendario" /> : null}
          {datos.sesiones.map((s) => (
            <TarjetaSesionAdmin key={s.id} s={s} onPress={() => router.push(`/admin/sesion/${s.id}`)} />
          ))}
        </>
      ) : null}
      <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.xl }}>
        <Boton titulo="Fotos" icono="foto" variante="suave" estilo={{ flex: 1 }} onPress={() => router.push("/admin/imagenes")} />
        <Boton titulo="Salir" icono="salir" variante="secundario" estilo={{ flex: 1 }} onPress={onSalir} />
      </View>
    </Pantalla>
  );
}
