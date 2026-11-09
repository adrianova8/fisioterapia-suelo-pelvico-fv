// Detalle de una clase: reservar, lista de espera, cancelar / liberar plaza.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icono, type NombreIcono } from "@/components/iconos";
import { Avatar, PastillaSesion, explicacionEstado } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cargando, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio, estiloDePrograma, radios, sombra } from "@/constants/theme";
import { api, mensajeError, urlCompleta } from "@/lib/api";
import { reservar, unirseLista } from "@/lib/acciones";
import { alerta, confirmar } from "@/lib/dialogos";
import { capitalizar, fechaLarga, hora, minutosEntre } from "@/lib/fechas";
import type { Sesion } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";
import { Image } from "expo-image";

const DESCRIPCION: Record<string, string> = {
  Embarazo: "Ejercicio terapéutico suave y seguro para mantenerte activa durante el embarazo, cuidar tu suelo pélvico y prepararte para el parto.",
  Postparto: "Recuperación del suelo pélvico y del abdomen tras el parto, a tu ritmo y acompañada por una fisioterapeuta.",
  "+50": "Movimiento, fuerza y cuidado del suelo pélvico adaptados a esta etapa, en un grupo reducido.",
};

const NECESITAS: { icono: NombreIcono; texto: string }[] = [
  { icono: "persona", texto: "Ropa cómoda" },
  { icono: "lista", texto: "Esterilla (o te la damos)" },
  { icono: "info", texto: "Botella de agua" },
];

export default function DetalleClase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const { datos: s, error, cargando, recargar } = useDatos(() => api.get<Sesion>(`/api/sesiones/${id}`), [id]);

  async function onReservar() {
    if (!s) return;
    setEnviando(true);
    try {
      await reservar(router, s.id);
    } catch (e) {
      alerta("No se ha podido reservar", mensajeError(e));
      void recargar();
    } finally {
      setEnviando(false);
    }
  }

  async function onUnirse() {
    if (!s) return;
    setEnviando(true);
    try {
      await unirseLista(router, s.id);
    } catch (e) {
      alerta("No te has podido apuntar", mensajeError(e));
      void recargar();
    } finally {
      setEnviando(false);
    }
  }

  async function onSalirLista() {
    if (!s) return;
    const ok = await confirmar("Salir de la lista de espera", "Dejarás de estar en la cola de esta clase y no te avisaremos si se libera una plaza.", "Salir de la lista", "No");
    if (!ok) return;
    setEnviando(true);
    try {
      await api.patch("/api/lista-espera", { sesionId: s.id });
      await recargar();
    } catch (e) {
      alerta("No se ha podido completar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function onCancelar() {
    if (!s?.miReservaId) return;
    const aTiempo = new Date(s.fechaHoraInicio).getTime() - Date.now() >= 3600_000;
    const verbo = s.miReservaFija ? "Liberar mi plaza" : "Cancelar reserva";
    const mensaje = aTiempo
      ? "Faltan más de 1 hora para la clase: recuperas la sesión y podrás reservar otro día de esta semana. La plaza quedará libre para otra compañera."
      : "Falta menos de 1 hora para la clase: la sesión cuenta como usada y no podrás volver a reservar esta clase.";
    const ok = await confirmar(verbo, mensaje, verbo, "Mantener mi plaza", true);
    if (!ok) return;
    setEnviando(true);
    try {
      await api.patch("/api/reservas", { reservaId: s.miReservaId });
      await recargar();
      alerta(s.miReservaFija ? "Has liberado tu plaza" : "Reserva cancelada", aTiempo ? "Has recuperado la sesión para otro día de esta semana." : "La sesión cuenta como usada.");
    } catch (e) {
      alerta("No se ha podido cancelar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function onCompartir() {
    if (!s) return;
    const texto = `${s.programa} · ${capitalizar(fechaLarga(s.fechaHoraInicio))} a las ${hora(s.fechaHoraInicio)} con ${s.profesional} (${s.sala}). Mamá en movimiento.`;
    try {
      if (Platform.OS === "web") {
        const nav = globalThis.navigator as Navigator | undefined;
        if (nav?.share) await nav.share({ text: texto });
        else {
          await nav?.clipboard?.writeText(texto);
          alerta("Copiado", "Hemos copiado los datos de la clase.");
        }
      } else await Share.share({ message: texto });
    } catch {}
  }

  if (cargando && !s) return <Pantalla><Cargando /></Pantalla>;
  if (!s) return <Pantalla><CajaMensaje tipo="error" texto={error ?? "No se ha encontrado la clase."} /><Boton titulo="Volver" variante="secundario" onPress={() => router.back()} /></Pantalla>;

  const libres = Math.max(0, s.capacidad - s.ocupadas);
  const explicacion = explicacionEstado(s);
  const imagen = urlCompleta(s.programaImagen);
  const estProg = estiloDePrograma(s.programa);
  const yaEmpezo = new Date(s.fechaHoraInicio).getTime() <= Date.now();

  let pie = null;
  if (s.estado === "RESERVADA" && !yaEmpezo) pie = <Boton titulo={s.miReservaFija ? "Liberar mi plaza" : "Cancelar reserva"} variante="peligro" onPress={onCancelar} cargando={enviando} />;
  else if (s.puedeReservar) pie = <Boton titulo="Reservar clase" onPress={onReservar} cargando={enviando} />;
  else if (s.puedeUnirseListaEspera) pie = <Boton titulo="Unirme a la lista de espera" variante="secundario" onPress={onUnirse} cargando={enviando} />;
  else if (s.estado === "EN_LISTA_ESPERA") pie = <Boton titulo="Salir de la lista de espera" variante="texto" onPress={onSalirLista} cargando={enviando} />;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <Pantalla pie={pie} sinBordeSuperior estilo={{ paddingTop: 0, paddingHorizontal: 0 }}>
        <View style={[est.hero, { backgroundColor: estProg.color }]}>
          {imagen ? <Image source={{ uri: imagen }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={{ fontSize: 96 }}>{estProg.icono}</Text>}
          <SafeAreaView edges={["top"]} style={est.botonesHero}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/clases"))} style={est.botonRedondo} accessibilityLabel="Volver">
              <Icono nombre="volver" color={colores.texto} />
            </Pressable>
            <Pressable onPress={onCompartir} style={est.botonRedondo} accessibilityLabel="Compartir">
              <Icono nombre="compartir" color={colores.texto} />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={est.cuerpo}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m }}>
            <T variante="grande" estilo={{ fontSize: 26, flex: 1 }}>{s.programa}</T>
            <PastillaSesion s={s} />
          </View>

          <View style={{ gap: 10, marginTop: espacio.m }}>
            <Fila icono="reloj" texto={`${capitalizar(fechaLarga(s.fechaHoraInicio))} · ${hora(s.fechaHoraInicio)} – ${hora(s.fechaHoraFin)} (${minutosEntre(s.fechaHoraInicio, s.fechaHoraFin)} min)`} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
              <Avatar nombre={s.profesional} foto={s.profesionalFoto} tam={26} />
              <T>{s.profesional}</T>
            </View>
            <Fila icono="ubicacion" texto={s.sala} />
            <Fila icono="plazas" texto={`${s.capacidad} plazas · ${libres} ${libres === 1 ? "disponible" : "disponibles"}`} />
          </View>

          {s.miReservaFija && s.estado === "RESERVADA" ? (
            <View style={{ marginTop: espacio.l }}>
              <CajaMensaje texto="Es tu clase fija: la tienes reservada cada semana. Si un día no puedes venir, libera tu plaza con más de 1 hora de antelación y recuperarás la sesión para otro día de la semana." />
            </View>
          ) : null}
          {explicacion ? (
            <View style={{ marginTop: espacio.l }}>
              <CajaMensaje tipo={s.estado === "EN_LISTA_ESPERA" ? "info" : "aviso"} texto={explicacion} />
            </View>
          ) : null}
          {s.puedeReservar && s.mensualidad?.estado !== "ACTIVA" ? (
            <CajaMensaje tipo="ok" icono="corazon" texto="Esta clase se pagará con una de las clases que te debemos (saldo)." />
          ) : null}

          <Text style={est.descripcion}>{s.descripcion ?? DESCRIPCION[s.programa] ?? ""}</Text>

          <Tarjeta estilo={{ marginTop: espacio.l }}>
            <T variante="fuerte" estilo={{ fontSize: 15, marginBottom: espacio.m }}>Qué necesitas</T>
            <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
              {NECESITAS.map((n) => (
                <View key={n.texto} style={{ alignItems: "center", gap: 6, flex: 1 }}>
                  <Icono nombre={n.icono} color={colores.burdeos} />
                  <T variante="tenue" estilo={{ textAlign: "center", fontSize: 12 }}>{n.texto}</T>
                </View>
              ))}
            </View>
          </Tarjeta>
        </View>
      </Pantalla>
    </View>
  );
}

function Fila({ icono, texto }: { icono: NombreIcono; texto: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.s }}>
      <Icono nombre={icono} tam={20} />
      <T estilo={{ flex: 1 }}>{texto}</T>
    </View>
  );
}

const est = StyleSheet.create({
  hero: { height: 260, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  botonesHero: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", padding: espacio.l },
  botonRedondo: { width: 42, height: 42, borderRadius: 21, backgroundColor: colores.blanco, alignItems: "center", justifyContent: "center", ...sombra },
  cuerpo: { backgroundColor: colores.fondo, borderTopLeftRadius: radios.l, borderTopRightRadius: radios.l, marginTop: -radios.l, padding: espacio.l },
  descripcion: { fontSize: 15, color: colores.textoSuave, lineHeight: 22, marginTop: espacio.l },
});
