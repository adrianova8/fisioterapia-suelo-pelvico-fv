// Añadir una clase suelta (solo ese día).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Contador } from "@/components/admin-ui";
import { Boton, CajaMensaje, Cabecera, Campo, Cargando, Chips, Pantalla, T, Tarjeta } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta } from "@/lib/dialogos";
import { capitalizar, fechaLarga, sumarDias } from "@/lib/fechas";
import type { OpcionesCalendario } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

export default function NuevaClase() {
  const { dia } = useLocalSearchParams<{ dia?: string }>();
  const router = useRouter();
  const inicial = dia ? new Date(`${dia}T00:00:00`) : new Date();
  const [fecha, setFecha] = useState(new Date(inicial.getFullYear(), inicial.getMonth(), inicial.getDate()));
  const [horaTxt, setHoraTxt] = useState("18:00");
  const [duracion, setDuracion] = useState(60);
  const [programaId, setProgramaId] = useState(0);
  const [profesionalId, setProfesionalId] = useState(0);
  const [salaId, setSalaId] = useState(0);
  const [capacidad, setCapacidad] = useState(8);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { datos: op, cargando } = useDatos(async () => {
    const o = await api.get<OpcionesCalendario>("/api/admin/calendario-opciones");
    setProgramaId((v) => v || o.programas[0]?.id || 0);
    setProfesionalId((v) => v || o.profesionales[0]?.id || 0);
    setSalaId((v) => v || o.salas[0]?.id || 0);
    return o;
  });

  async function crear() {
    setError(null);
    const m = /^(\d{1,2}):(\d{2})$/.exec(horaTxt.trim());
    if (!m) return setError("Escribe la hora como 18:00.");
    const inicio = new Date(fecha);
    inicio.setHours(Number(m[1]), Number(m[2]), 0, 0);
    if (inicio.getTime() < Date.now()) return setError("La clase no puede ser en el pasado.");
    setEnviando(true);
    try {
      await api.post("/api/admin/sesiones", { fechaHoraInicio: inicio.toISOString(), duracionMinutos: duracion, programaId, profesionalId, salaId, capacidad });
      alerta("Clase creada");
      router.back();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla>
      <Cabecera titulo="Nueva clase" subtitulo="Clase suelta, solo para ese día" volver />
      {cargando && !op ? <Cargando /> : null}
      {op ? (
        <Tarjeta>
          {error ? <CajaMensaje tipo="error" texto={error} /> : null}
          <T variante="tenue">Día</T>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: espacio.s }}>
            <Boton titulo="‹" variante="suave" pequeno onPress={() => setFecha(sumarDias(fecha, -1))} />
            <T variante="fuerte">{capitalizar(fechaLarga(fecha))}</T>
            <Boton titulo="›" variante="suave" pequeno onPress={() => setFecha(sumarDias(fecha, 1))} />
          </View>
          <Campo etiqueta="Hora de inicio" value={horaTxt} onChangeText={setHoraTxt} placeholder="18:00" keyboardType="numbers-and-punctuation" />
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
          <Boton titulo="Crear clase" onPress={crear} cargando={enviando} estilo={{ marginTop: espacio.l }} />
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}
