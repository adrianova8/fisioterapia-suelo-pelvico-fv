// Crear o editar un hueco del Horario Base.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Contador } from "@/components/admin-ui";
import { Boton, CajaMensaje, Cabecera, Campo, Cargando, Chips, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta } from "@/lib/dialogos";
import { DIAS_ABREV } from "@/lib/fechas";
import type { OpcionesCalendario, PlantillaHueco } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function EditarHorario() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const [diaSemana, setDiaSemana] = useState(1);
  const [horaTxt, setHoraTxt] = useState("18:00");
  const [duracion, setDuracion] = useState(60);
  const [programaId, setProgramaId] = useState(0);
  const [profesionalId, setProfesionalId] = useState(0);
  const [salaId, setSalaId] = useState(0);
  const [capacidad, setCapacidad] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);

  const { datos, cargando } = useDatos(async () => {
    const [op, plantilla] = await Promise.all([
      api.get<OpcionesCalendario>("/api/admin/calendario-opciones"),
      id ? api.get<PlantillaHueco[]>("/api/admin/plantilla") : Promise.resolve([] as PlantillaHueco[]),
    ]);
    const h = plantilla.find((p) => String(p.id) === id);
    if (h) {
      setDiaSemana(h.diaSemana);
      setHoraTxt(h.horaInicio);
      setDuracion(h.duracionMinutos);
      setProgramaId(h.programaId);
      setProfesionalId(h.profesionalId);
      setSalaId(h.salaId);
      setCapacidad(h.capacidad);
    } else {
      setProgramaId((v) => v || op.programas[0]?.id || 0);
      setProfesionalId((v) => v || op.profesionales[0]?.id || 0);
      setSalaId((v) => v || op.salas[0]?.id || 0);
    }
    return { op };
  }, [id]);

  async function guardar() {
    setError(null);
    if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(horaTxt.trim())) return setError("Escribe la hora como 18:00.");
    const h = horaTxt.trim().padStart(5, "0");
    const cuerpo = { diaSemana, horaInicio: h, duracionMinutos: duracion, programaId, profesionalId, salaId, capacidad };
    setEnviando(true);
    try {
      if (id) await api.patch(`/api/admin/plantilla/${id}`, cuerpo);
      else await api.post("/api/admin/plantilla", cuerpo);
      router.back();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function borrar() {
    setEnviando(true);
    try {
      await api.delete(`/api/admin/plantilla/${id}`);
      router.back();
    } catch (e) {
      alerta("No se ha podido quitar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const op = datos?.op;
  return (
    <Pantalla>
      <Cabecera titulo={id ? "Editar clase del horario" : "Nueva clase del horario"} subtitulo="Horario Base · se repite cada semana" volver />
      {cargando && !op ? <Cargando /> : null}
      {op ? (
        <Tarjeta>
          {error ? <CajaMensaje tipo="error" texto={error} /> : null}
          <T variante="tenue">Día de la semana</T>
          <View style={{ marginVertical: espacio.s }}>
            <Chips opciones={DIAS_ABREV.map((d, i) => ({ valor: i + 1, texto: d }))} valor={diaSemana} onCambio={setDiaSemana} />
          </View>
          <Campo etiqueta="Hora de inicio (hora del centro)" value={horaTxt} onChangeText={setHoraTxt} placeholder="18:00" keyboardType="numbers-and-punctuation" />
          <T variante="tenue">Duración (minutos)</T>
          <View style={{ marginVertical: espacio.s }}>
            <Chips opciones={[45, 60, 75, 90].map((n) => ({ valor: n, texto: `${n}` }))} valor={duracion} onCambio={setDuracion} />
          </View>
          <T variante="tenue">Programa</T>
          <View style={{ marginVertical: espacio.s }}>
            <Chips opciones={op.programas.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={programaId} onCambio={setProgramaId} />
          </View>
          <T variante="tenue">Profesional</T>
          <View style={{ marginVertical: espacio.s }}>
            <Chips opciones={op.profesionales.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={profesionalId} onCambio={setProfesionalId} />
          </View>
          {op.salas.length > 1 ? (
            <>
              <T variante="tenue">Sala</T>
              <View style={{ marginVertical: espacio.s }}>
                <Chips opciones={op.salas.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={salaId} onCambio={setSalaId} />
              </View>
            </>
          ) : null}
          <T variante="tenue">Aforo</T>
          <View style={{ marginVertical: espacio.s }}>
            <Contador valor={capacidad} onCambio={setCapacidad} min={1} />
          </View>
          <Boton titulo="Guardar" onPress={guardar} cargando={enviando} estilo={{ marginTop: espacio.l }} />
        </Tarjeta>
      ) : null}
      {id && op ? (
        confirmandoBorrar ? (
          <Tarjeta estilo={{ borderWidth: 1, borderColor: colores.rojo }}>
            <T>Se dejará de generar esta clase en las semanas futuras. Las clases ya creadas y sus reservas no cambian.</T>
            <View style={{ gap: espacio.s, marginTop: espacio.m }}>
              <Boton titulo="Sí, quitar del horario" variante="peligro" cargando={enviando} onPress={borrar} />
              <Boton titulo="No" variante="secundario" onPress={() => setConfirmandoBorrar(false)} />
            </View>
          </Tarjeta>
        ) : (
          <Boton titulo="Quitar del horario" variante="texto" onPress={() => setConfirmandoBorrar(true)} />
        )
      ) : null}
    </Pantalla>
  );
}
