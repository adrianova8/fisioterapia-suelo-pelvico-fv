// Clase concreta (admin): asistentes, asistencia, editar y cancelar.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Contador } from "@/components/admin-ui";
import { Avatar, Miniatura } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cabecera, Campo, Cargando, Chips, Pantalla, Pastilla, T, Tarjeta, Vacio } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta } from "@/lib/dialogos";
import { capitalizar, fechaLarga, hora, minutosEntre } from "@/lib/fechas";
import type { AsistenteSesion, OpcionesCalendario, SesionAdmin } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function SesionAdminPantalla() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [sesion, asistentes, opciones] = await Promise.all([
      api.get<SesionAdmin>(`/api/admin/sesiones/${id}`),
      api.get<AsistenteSesion[]>(`/api/admin/sesiones/${id}/reservas`),
      api.get<OpcionesCalendario>("/api/admin/calendario-opciones"),
    ]);
    return { sesion, asistentes, opciones };
  }, [id]);

  const [modo, setModo] = useState<null | "editar" | "cancelar">(null);
  const [horaTxt, setHoraTxt] = useState("");
  const [duracion, setDuracion] = useState(60);
  const [profesionalId, setProfesionalId] = useState(0);
  const [capacidad, setCapacidad] = useState(8);
  const [enviando, setEnviando] = useState(false);
  const [marcando, setMarcando] = useState<number | null>(null);

  if (cargando && !datos) return <Pantalla><Cargando /></Pantalla>;
  if (!datos) return <Pantalla><Cabecera titulo="Clase" volver /><CajaMensaje tipo="error" texto={error ?? "No encontrada"} /></Pantalla>;

  const { sesion: s, asistentes, opciones } = datos;
  const cancelada = s.estado === "CANCELADA";
  const empezada = new Date(s.fechaHoraInicio).getTime() <= Date.now();

  function abrirEditar() {
    setHoraTxt(hora(s.fechaHoraInicio));
    setDuracion(minutosEntre(s.fechaHoraInicio, s.fechaHoraFin));
    setProfesionalId(s.profesionalId);
    setCapacidad(s.capacidad);
    setModo("editar");
  }

  async function guardar() {
    const m = /^(\d{1,2}):(\d{2})$/.exec(horaTxt.trim());
    if (!m) return alerta("Hora no válida", "Escribe la hora como 18:00.");
    const d = new Date(s.fechaHoraInicio);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    setEnviando(true);
    try {
      await api.patch(`/api/admin/sesiones/${id}`, { fechaHoraInicio: d.toISOString(), duracionMinutos: duracion, profesionalId, capacidad });
      setModo(null);
      await recargar();
    } catch (e) {
      alerta("No se ha podido guardar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarClase() {
    setEnviando(true);
    try {
      await api.delete(`/api/admin/sesiones/${id}`);
      setModo(null);
      await recargar();
      alerta("Clase cancelada", "Hemos avisado a las usuarias afectadas.");
    } catch (e) {
      alerta("No se ha podido cancelar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function marcar(a: AsistenteSesion, estado: "ASISTIDA" | "NO_SHOW") {
    setMarcando(a.reservaId);
    try {
      await api.post(`/api/admin/sesiones/${id}/asistencia`, { reservaId: a.reservaId, estado });
      await recargar();
    } catch (e) {
      alerta("No se ha podido marcar", mensajeError(e));
    } finally {
      setMarcando(null);
    }
  }

  const activos = asistentes.filter((a) => a.estado !== "CANCELADA_CON_CREDITO");

  return (
    <Pantalla>
      <Cabecera titulo={s.programa} subtitulo={`${capitalizar(fechaLarga(s.fechaHoraInicio))} · ${hora(s.fechaHoraInicio)}–${hora(s.fechaHoraFin)}`} volver />

      <Tarjeta>
        <View style={{ flexDirection: "row", gap: espacio.m, alignItems: "center" }}>
          <Miniatura programa={s.programa} imagen={s.programaImagen} tam={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
              <Avatar nombre={s.profesional} foto={s.profesionalFoto} tam={20} />
              <T>{s.profesional}</T>
            </View>
            <T variante="tenue">{s.sala}</T>
            <T variante="tenue">{s.ocupadas}/{s.capacidad} plazas · {s.enEspera} en lista de espera</T>
          </View>
          {cancelada ? <Pastilla texto="Cancelada" color={colores.rojo} fondo={colores.rojoClaro} /> : null}
        </View>
      </Tarjeta>

      {cancelada ? <CajaMensaje tipo="error" texto="Esta clase está cancelada. No se volverá a generar desde el horario base." /> : null}

      <T variante="seccion">Asistentes</T>
      {activos.length === 0 ? <Vacio texto="Nadie ha reservado esta clase." icono="usuarias" /> : null}
      {activos.map((a) => (
        <Tarjeta key={a.reservaId} estilo={{ paddingVertical: espacio.m }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
            <Avatar nombre={a.nombre} tam={36} />
            <View style={{ flex: 1 }}>
              <T variante="fuerte" estilo={{ fontSize: 15 }}>{a.nombre}</T>
              <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                {a.fija ? <Pastilla texto="Fija" color={colores.burdeos} fondo={colores.rosaClaro} /> : null}
                {a.origen === "COMPENSACION" ? <Pastilla texto="Saldo" color={colores.verde} fondo={colores.verdeClaro} /> : null}
                {a.estado === "CANCELADA_SIN_CREDITO" ? <Pastilla texto="Canceló tarde" color={colores.ambar} fondo={colores.ambarClaro} /> : null}
              </View>
            </View>
          </View>
          {!cancelada && a.estado !== "CANCELADA_SIN_CREDITO" ? (
            <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m }}>
              <Boton
                titulo="Vino"
                pequeno
                variante={a.estado === "ASISTIDA" ? "primario" : "secundario"}
                estilo={{ flex: 1 }}
                cargando={marcando === a.reservaId}
                onPress={() => marcar(a, "ASISTIDA")}
              />
              <Boton
                titulo="No vino"
                pequeno
                variante={a.estado === "NO_SHOW" ? "peligro" : "secundario"}
                estilo={{ flex: 1 }}
                cargando={marcando === a.reservaId}
                onPress={() => marcar(a, "NO_SHOW")}
              />
            </View>
          ) : null}
        </Tarjeta>
      ))}

      {!cancelada && !empezada ? (
        <>
          <T variante="seccion">Gestionar esta clase</T>
          {modo === "editar" ? (
            <Tarjeta>
              <T variante="tenue" estilo={{ marginBottom: espacio.m }}>Solo cambia esta clase de este día; el horario base no se toca.</T>
              <Campo etiqueta="Hora de inicio" value={horaTxt} onChangeText={setHoraTxt} placeholder="18:00" keyboardType="numbers-and-punctuation" />
              <T variante="tenue">Duración (minutos)</T>
              <View style={{ marginVertical: espacio.s }}>
                <Chips opciones={[45, 60, 75, 90].map((n) => ({ valor: n, texto: `${n}` }))} valor={duracion} onCambio={setDuracion} />
              </View>
              <T variante="tenue">Profesional</T>
              <View style={{ marginVertical: espacio.s }}>
                <Chips opciones={opciones.profesionales.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={profesionalId} onCambio={setProfesionalId} />
              </View>
              <T variante="tenue">Aforo</T>
              <View style={{ marginVertical: espacio.s }}>
                <Contador valor={capacidad} onCambio={setCapacidad} min={Math.max(1, s.ocupadas)} />
              </View>
              <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m }}>
                <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
                <Boton titulo="Guardar cambios" pequeno estilo={{ flex: 2 }} cargando={enviando} onPress={guardar} />
              </View>
            </Tarjeta>
          ) : modo === "cancelar" ? (
            <Tarjeta estilo={{ borderWidth: 1, borderColor: colores.rojo }}>
              <T variante="fuerte" estilo={{ color: colores.rojo }}>¿Cancelar esta clase?</T>
              <T estilo={{ marginTop: espacio.s }}>
                Las {s.ocupadas} usuarias con plaza recuperan la sesión (o su clase de saldo), la lista de espera se cierra y se les avisa. La clase no se borra y no se vuelve a generar.
              </T>
              <View style={{ gap: espacio.s, marginTop: espacio.l }}>
                <Boton titulo="Sí, cancelar la clase" variante="peligro" cargando={enviando} onPress={cancelarClase} />
                <Boton titulo="No, mantenerla" variante="secundario" onPress={() => setModo(null)} />
              </View>
            </Tarjeta>
          ) : (
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              <Boton titulo="Editar" variante="suave" estilo={{ flex: 1 }} onPress={abrirEditar} />
              <Boton titulo="Cancelar clase" variante="peligro" estilo={{ flex: 1 }} onPress={() => setModo("cancelar")} />
            </View>
          )}
        </>
      ) : null}
      <Boton titulo="Volver al calendario" variante="texto" estilo={{ marginTop: espacio.l }} onPress={() => router.back()} />
    </Pantalla>
  );
}
