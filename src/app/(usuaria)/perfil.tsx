import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { TarjetaPlan } from "@/components/tarjeta-plan";
import { Avatar } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, FilaMenu, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmar } from "@/lib/dialogos";
import type { Me } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function Perfil() {
  const router = useRouter();
  const { salir } = useAuth();
  const { datos: me, error, cargando, refrescando, refrescar } = useDatos(() => api.get<Me>("/api/me"));
  const [paso, setPaso] = useState<0 | 1>(0);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function onSalir() {
    if (await confirmar("Cerrar sesión", "¿Quieres salir de tu cuenta en este dispositivo?", "Cerrar sesión", "Cancelar")) {
      await salir();
      router.replace("/login");
    }
  }

  async function onEliminar() {
    setEliminando(true);
    setErrorEliminar(null);
    try {
      await api.delete("/api/me", { confirmar: true });
      await salir();
      router.replace("/login");
    } catch (e) {
      setErrorEliminar(mensajeError(e));
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Pantalla onRefrescar={refrescar} refrescando={refrescando}>
      <T variante="grande" estilo={{ fontSize: 28, marginTop: espacio.s, marginBottom: espacio.l }}>Mi perfil</T>
      {cargando && !me ? <Cargando /> : null}
      {error && !me ? <CajaMensaje tipo="error" texto={error} /> : null}
      {me ? (
        <>
          <Tarjeta>
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
              <Avatar nombre={me.usuario.nombre} tam={60} />
              <View style={{ flex: 1 }}>
                <T variante="fuerte">{me.usuario.nombre}</T>
                <T variante="tenue">{me.usuario.email}</T>
                {me.usuario.programa ? <T variante="tenue" estilo={{ color: colores.burdeos, fontWeight: "600", marginTop: 2 }}>Programa {me.usuario.programa.nombre}</T> : null}
              </View>
            </View>
          </Tarjeta>

          <TarjetaPlan me={me} titulo="Mi plan" />

          <Tarjeta estilo={{ paddingVertical: espacio.s }}>
            <FilaMenu icono="persona" titulo="Mis datos" onPress={() => router.push("/mis-datos")} />
            <FilaMenu icono="euro" titulo="Tarifas" subtitulo="Se pagan en la clínica" onPress={() => router.push("/tarifas")} />
            <FilaMenu icono="info" titulo="Más información" subtitulo="Centro, equipo, preguntas frecuentes" onPress={() => router.push("/mas")} />
            <FilaMenu icono="salir" titulo="Cerrar sesión" onPress={onSalir} />
          </Tarjeta>

          <View style={{ marginTop: espacio.xl }}>
            {paso === 0 ? (
              <Boton titulo="Eliminar mi cuenta" variante="texto" onPress={() => setPaso(1)} />
            ) : (
              <Tarjeta estilo={{ borderWidth: 1, borderColor: colores.rojo }}>
                <T variante="fuerte" estilo={{ color: colores.rojo }}>¿Eliminar tu cuenta?</T>
                <T estilo={{ marginTop: espacio.s }}>
                  Esto no se puede deshacer. Se cancelarán tus reservas futuras y tus clases fijas, saldrás de las listas de espera y se borrarán tu nombre, tu email y tu contraseña. Las clases que te debamos se perderán.
                </T>
                {errorEliminar ? <View style={{ marginTop: espacio.m }}><CajaMensaje tipo="error" texto={errorEliminar} /></View> : null}
                <View style={{ gap: espacio.s, marginTop: espacio.l }}>
                  <Boton titulo="Sí, eliminar mi cuenta" variante="peligro" onPress={onEliminar} cargando={eliminando} />
                  <Boton titulo="No, mantener mi cuenta" variante="secundario" onPress={() => setPaso(0)} />
                </View>
              </Tarjeta>
            )}
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}
