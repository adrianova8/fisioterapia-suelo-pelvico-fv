import { useRouter } from "expo-router";
import { View } from "react-native";

import { Icono } from "@/components/iconos";
import { TarjetaPlan } from "@/components/tarjeta-plan";
import { Avatar } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { fechaCorta, hora } from "@/lib/fechas";
import type { Me, Reserva } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Inicio() {
  const router = useRouter();
  const { datos, error, cargando, refrescando, refrescar } = useDatos(async () => {
    const [me, reservas] = await Promise.all([api.get<Me>("/api/me"), api.get<Reserva[]>("/api/reservas")]);
    return { me, reservas };
  });

  const ahora = Date.now();
  const proxima = datos?.reservas
    .filter((r) => r.estado === "CONFIRMADA" && new Date(r.sesion.fechaHoraInicio).getTime() > ahora)
    .sort((a, b) => a.sesion.fechaHoraInicio.localeCompare(b.sesion.fechaHoraInicio))[0];
  const nombre = datos?.me.usuario.nombre.split(" ")[0] ?? "";

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <View style={{ marginBottom: espacio.l, marginTop: espacio.s }}>
        <T variante="grande" estilo={{ fontSize: 28 }}>Hola, {nombre} 👋</T>
        <T variante="tenue" estilo={{ fontSize: 15 }}>Qué bien tenerte aquí</T>
      </View>

      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}

      {datos ? (
        <>
          <TarjetaPlan me={datos.me} />

          <Tarjeta>
            <T variante="fuerte" estilo={{ fontSize: 15, marginBottom: espacio.m }}>Tu próxima clase</T>
            {proxima ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <T variante="tenue" estilo={{ fontSize: 14, color: colores.texto }}>
                      {fechaCorta(proxima.sesion.fechaHoraInicio)} · {hora(proxima.sesion.fechaHoraInicio)}
                    </T>
                    <T variante="grande" estilo={{ fontSize: 20 }}>{proxima.sesion.programa}</T>
                    <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                      <Icono nombre="persona" tam={14} />
                      <T variante="tenue">{proxima.sesion.profesional}</T>
                    </View>
                    <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
                      <Icono nombre="ubicacion" tam={14} />
                      <T variante="tenue">{proxima.sesion.sala}</T>
                    </View>
                    {proxima.fija ? <T variante="tenue" estilo={{ color: colores.burdeos, fontWeight: "600" }}>Tu clase fija</T> : null}
                  </View>
                  <Avatar nombre={proxima.sesion.profesional} foto={proxima.sesion.profesionalFoto} tam={52} />
                </View>
                <Boton titulo="Ver clase" onPress={() => router.push(`/clase/${proxima.sesion.id}`)} estilo={{ marginTop: espacio.l }} />
              </>
            ) : (
              <>
                <T variante="tenue" estilo={{ fontSize: 14 }}>No tienes ninguna clase reservada.</T>
                <Boton titulo="Ver clases" onPress={() => router.push("/clases")} estilo={{ marginTop: espacio.l }} />
              </>
            )}
          </Tarjeta>
        </>
      ) : null}
    </Pantalla>
  );
}
