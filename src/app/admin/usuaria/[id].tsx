// Ficha de una usuaria: mensualidad por mes, pausa con compensación,
// saldo, programa, clases fijas, historial y eliminación (RGPD).
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Contador } from "@/components/admin-ui";
import { Avatar } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cabecera, Campo, Cargando, Chips, Pantalla, Pastilla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta, confirmar } from "@/lib/dialogos";
import { DIAS_ABREV, MESES, capitalizar, euros, mesAnio } from "@/lib/fechas";
import type { AsignacionFija, FichaUsuaria, MovimientoHistorial, OpcionesCalendario, PlantillaHueco, Tarifa } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

const TIPO_HISTORIAL: Record<MovimientoHistorial["tipo"], string> = {
  ACTIVACION: "Activación",
  PAUSA: "Pausa",
  REACTIVACION: "Reactivación",
  CAMBIO_PROGRAMA: "Cambio de programa",
  AJUSTE: "Ajuste de saldo",
};

export default function FichaUsuariaPantalla() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const hoy = new Date();
  const meses = [-1, 0, 1, 2].map((n) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + n, 1);
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 };
  });
  const [mesSel, setMesSel] = useState(`${hoy.getFullYear()}-${hoy.getMonth() + 1}`);
  const [anio, mes] = mesSel.split("-").map(Number);

  const { datos, error, cargando, recargar } = useDatos(async () => {
    const [ficha, historial, fijas, tarifas, plantilla, opciones] = await Promise.all([
      api.get<FichaUsuaria>(`/api/admin/usuarios/${id}?anio=${anio}&mes=${mes}`),
      api.get<MovimientoHistorial[]>(`/api/admin/usuarios/${id}/plan/historial`),
      api.get<AsignacionFija[]>(`/api/admin/usuarios/${id}/fijas`),
      api.get<Tarifa[]>("/api/admin/tarifas"),
      api.get<PlantillaHueco[]>("/api/admin/plantilla"),
      api.get<OpcionesCalendario>("/api/admin/calendario-opciones"),
    ]);
    return { ficha, historial, fijas, tarifas: tarifas.filter((t) => t.activa !== false), plantilla, opciones };
  }, [id, anio, mes]);

  // Formularios
  const [modo, setModo] = useState<null | "activar" | "pausar" | "reactivar" | "saldo" | "programa" | "fija" | "eliminar">(null);
  const [tarifaId, setTarifaId] = useState<number>(0);
  const [motivo, setMotivo] = useState("");
  const [numero, setNumero] = useState(0);
  const [programaId, setProgramaId] = useState<number>(0);
  const [plantillaId, setPlantillaId] = useState<number>(0);
  const [enviando, setEnviando] = useState(false);

  if (cargando && !datos) return <Pantalla><Cargando /></Pantalla>;
  if (!datos) return <Pantalla><Cabecera titulo="Usuaria" volver /><CajaMensaje tipo="error" texto={error ?? "No encontrada"} /></Pantalla>;

  const { ficha, historial, fijas, tarifas, plantilla, opciones } = datos;
  const u = ficha.usuario;
  const m = ficha.mensualidades.find((x) => x.anio === anio && x.mes === mes) ?? null;
  const huecosPrograma = plantilla.filter((p) => p.activa && p.programaId === u.programa?.id && !fijas.some((f) => f.activa && f.plantillaId === p.id));

  function abrir(m2: typeof modo) {
    setModo(m2);
    setMotivo("");
    if (m2 === "activar" || m2 === "reactivar") setTarifaId(m?.tarifa.id ?? tarifas[0]?.id ?? 0);
    if (m2 === "pausar") setNumero(ficha.sugerenciaCompensacion);
    if (m2 === "saldo") setNumero(ficha.saldoCompensacion);
    if (m2 === "programa") setProgramaId(u.programa?.id ?? 0);
    if (m2 === "fija") setPlantillaId(huecosPrograma[0]?.id ?? 0);
  }

  async function enviar(fn: () => Promise<unknown>, exito?: string) {
    setEnviando(true);
    try {
      await fn();
      setModo(null);
      await recargar();
      if (exito) alerta(exito);
    } catch (e) {
      alerta("No se ha podido guardar", mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  const nombreMes = `${MESES[mes - 1]} ${anio}`;

  return (
    <Pantalla>
      <Cabecera titulo={u.nombre} subtitulo={u.email} volver />

      <Tarjeta>
        <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
          <Avatar nombre={u.nombre} tam={48} />
          <View style={{ flex: 1 }}>
            <T variante="tenue">Programa</T>
            <T variante="fuerte">{u.programa?.nombre ?? "Sin programa"}</T>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T variante="tenue">Clases adeudadas</T>
            <T variante="fuerte" estilo={{ color: ficha.saldoCompensacion > 0 ? colores.verde : colores.texto }}>{ficha.saldoCompensacion}</T>
          </View>
        </View>
      </Tarjeta>

      {/* ---------- Mensualidad ---------- */}
      <T variante="seccion">Mensualidad</T>
      <Chips
        opciones={meses.map((x) => ({ valor: `${x.anio}-${x.mes}`, texto: capitalizar(MESES[x.mes - 1]) }))}
        valor={mesSel}
        onCambio={(v) => { setMesSel(v); setModo(null); }}
      />
      <Tarjeta estilo={{ marginTop: espacio.m }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <T variante="fuerte">{mesAnio(anio, mes)}</T>
            <T variante="tenue">{m ? `${m.tarifa.nombre} · ${euros(m.tarifa.precioCentimos)}` : "Sin mensualidad"}</T>
            {m?.estado === "PAUSADA" && m.motivoPausa ? <T variante="tenue">Motivo: {m.motivoPausa}</T> : null}
          </View>
          {m?.estado === "ACTIVA" ? <Pastilla texto="Activa" /> : m?.estado === "PAUSADA" ? <Pastilla texto="Pausada" color={colores.ambar} fondo={colores.ambarClaro} /> : m ? <Pastilla texto="Finalizada" color={colores.textoSuave} fondo={colores.gris} /> : <Pastilla texto="No activada" color={colores.textoSuave} fondo={colores.gris} />}
        </View>

        {modo === null ? (
          <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.l }}>
            {!m || m.estado === "FINALIZADA" ? <Boton titulo={`Activar ${MESES[mes - 1]}`} pequeno estilo={{ flex: 1 }} onPress={() => abrir("activar")} /> : null}
            {m?.estado === "ACTIVA" ? <Boton titulo="Pausar" variante="suave" pequeno estilo={{ flex: 1 }} onPress={() => abrir("pausar")} /> : null}
            {m?.estado === "PAUSADA" ? <Boton titulo="Reactivar" pequeno estilo={{ flex: 1 }} onPress={() => abrir("reactivar")} /> : null}
          </View>
        ) : null}

        {modo === "activar" || modo === "reactivar" ? (
          <View style={{ marginTop: espacio.l }}>
            <T variante="tenue" estilo={{ marginBottom: espacio.s }}>Tarifa (pagada en la clínica)</T>
            <Chips opciones={tarifas.map((t) => ({ valor: t.id, texto: `${t.sesionesSemana} día${t.sesionesSemana > 1 ? "s" : ""}/sem · ${euros(t.precioCentimos)}` }))} valor={tarifaId} onCambio={setTarifaId} />
            <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.l }}>
              <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
              <Boton
                titulo={modo === "activar" ? "Confirmar pago y activar" : "Reactivar"}
                pequeno
                estilo={{ flex: 2 }}
                cargando={enviando}
                onPress={() =>
                  enviar(
                    () =>
                      modo === "activar"
                        ? api.post(`/api/admin/usuarios/${id}/plan`, { anio, mes, tarifaId })
                        : api.patch(`/api/admin/usuarios/${id}/plan/estado`, { anio, mes, accion: "REACTIVAR", tarifaId }),
                    modo === "activar" ? `Plan de ${nombreMes} activado` : "Plan reactivado",
                  )
                }
              />
            </View>
          </View>
        ) : null}

        {modo === "pausar" ? (
          <View style={{ marginTop: espacio.l }}>
            <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Parto, baja…" />
            <T variante="tenue">Clases a compensar (ya pagadas y sin usar). Sugerencia: {ficha.sugerenciaCompensacion}</T>
            <View style={{ marginVertical: espacio.m }}>
              <Contador valor={numero} onCambio={setNumero} />
            </View>
            <CajaMensaje texto={`Mientras esté en pausa no podrá reservar. Se sumarán ${numero} clases a su saldo; no caducan y valen para cualquier programa.`} />
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
              <Boton
                titulo="Pausar plan"
                variante="peligro"
                pequeno
                estilo={{ flex: 2 }}
                cargando={enviando}
                onPress={() => enviar(() => api.patch(`/api/admin/usuarios/${id}/plan/estado`, { anio, mes, accion: "PAUSAR", motivo: motivo.trim() || null, clasesCompensadas: numero }), "Plan pausado")}
              />
            </View>
          </View>
        ) : null}
      </Tarjeta>

      {/* ---------- Saldo ---------- */}
      <T variante="seccion">Clases adeudadas (saldo)</T>
      <Tarjeta>
        <T>Le debemos <T variante="fuerte">{ficha.saldoCompensacion}</T> {ficha.saldoCompensacion === 1 ? "clase" : "clases"}.</T>
        {modo === "saldo" ? (
          <View style={{ marginTop: espacio.m }}>
            <View style={{ marginBottom: espacio.m }}>
              <Contador valor={numero} onCambio={setNumero} />
            </View>
            <Campo etiqueta="Motivo (obligatorio)" value={motivo} onChangeText={setMotivo} placeholder="Reembolso, corrección…" />
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
              <Boton
                titulo="Guardar saldo"
                pequeno
                estilo={{ flex: 2 }}
                deshabilitado={!motivo.trim()}
                cargando={enviando}
                onPress={() => enviar(() => api.post(`/api/admin/usuarios/${id}/saldo`, { saldo: numero, motivo: motivo.trim() }), "Saldo actualizado")}
              />
            </View>
          </View>
        ) : (
          <Boton titulo="Ajustar saldo" variante="suave" pequeno estilo={{ marginTop: espacio.m }} onPress={() => abrir("saldo")} />
        )}
      </Tarjeta>

      {/* ---------- Programa ---------- */}
      <T variante="seccion">Programa</T>
      <Tarjeta>
        {modo === "programa" ? (
          <>
            <Chips opciones={opciones.programas.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={programaId} onCambio={setProgramaId} />
            <View style={{ height: espacio.m }} />
            <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} placeholder="Ha dado a luz…" />
            <CajaMensaje texto="Sus reservas futuras se mantienen y la mensualidad sigue igual. Desde ahora solo podrá reservar clases del nuevo programa." />
            <View style={{ flexDirection: "row", gap: espacio.s }}>
              <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
              <Boton
                titulo="Cambiar programa"
                pequeno
                estilo={{ flex: 2 }}
                deshabilitado={programaId === u.programa?.id}
                cargando={enviando}
                onPress={() => enviar(() => api.patch(`/api/admin/usuarios/${id}/programa`, { programaId, motivo: motivo.trim() || null }), "Programa cambiado")}
              />
            </View>
          </>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <T variante="fuerte">{u.programa?.nombre ?? "Sin programa"}</T>
            <Boton titulo="Cambiar" variante="suave" pequeno onPress={() => abrir("programa")} />
          </View>
        )}
      </Tarjeta>

      {/* ---------- Clases fijas ---------- */}
      <T variante="seccion">Clases fijas</T>
      <Tarjeta>
        <T variante="tenue" estilo={{ marginBottom: espacio.m }}>
          Se le reservan solas cada semana si tiene activado el plan del mes de la clase.
        </T>
        {fijas.filter((f) => f.activa).length === 0 ? <T variante="tenue">No tiene clases fijas.</T> : null}
        {fijas.filter((f) => f.activa).map((f) => (
          <View key={f.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: espacio.s }}>
            <View>
              <T variante="fuerte" estilo={{ fontSize: 15 }}>{DIAS_ABREV[f.diaSemana - 1]} {f.horaInicio}</T>
              <T variante="tenue">{f.programa} · {f.profesional}</T>
            </View>
            <Boton
              titulo="Quitar"
              variante="texto"
              pequeno
              onPress={async () => {
                if (await confirmar("Quitar clase fija", `Ya no se le reservará automáticamente el ${DIAS_ABREV[f.diaSemana - 1]} a las ${f.horaInicio}. Las reservas ya hechas se mantienen.`, "Quitar", "Cancelar", true)) {
                  void enviar(() => api.patch(`/api/admin/usuarios/${id}/fijas`, { asignacionId: f.id, activa: false }));
                }
              }}
            />
          </View>
        ))}
        {modo === "fija" ? (
          <View style={{ marginTop: espacio.m }}>
            {huecosPrograma.length === 0 ? (
              <T variante="tenue">No hay más huecos del horario base de su programa.</T>
            ) : (
              <Chips
                opciones={huecosPrograma.map((p) => ({ valor: p.id, texto: `${DIAS_ABREV[p.diaSemana - 1]} ${p.horaInicio} · ${p.profesional}` }))}
                valor={plantillaId}
                onCambio={setPlantillaId}
              />
            )}
            <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m }}>
              <Boton titulo="Cancelar" variante="texto" pequeno estilo={{ flex: 1 }} onPress={() => setModo(null)} />
              <Boton
                titulo="Asignar"
                pequeno
                estilo={{ flex: 2 }}
                deshabilitado={!plantillaId}
                cargando={enviando}
                onPress={() => enviar(() => api.post(`/api/admin/usuarios/${id}/fijas`, { plantillaId }), "Clase fija asignada")}
              />
            </View>
          </View>
        ) : (
          <Boton titulo="Asignar clase fija" variante="suave" pequeno icono="mas" estilo={{ marginTop: espacio.m }} onPress={() => abrir("fija")} />
        )}
      </Tarjeta>

      {/* ---------- Historial ---------- */}
      <T variante="seccion">Historial</T>
      <Tarjeta>
        {historial.length === 0 ? <T variante="tenue">Sin movimientos.</T> : null}
        {historial.map((h) => (
          <View key={h.id} style={{ marginBottom: espacio.m }}>
            <T variante="fuerte" estilo={{ fontSize: 14 }}>{TIPO_HISTORIAL[h.tipo]}</T>
            <T variante="tenue">
              {new Date(h.fecha).toLocaleDateString()} {h.admin ? `· ${h.admin}` : ""} {h.motivo ? `· ${h.motivo}` : ""}
            </T>
          </View>
        ))}
      </Tarjeta>

      {/* ---------- Eliminar ---------- */}
      <View style={{ marginTop: espacio.xl }}>
        {modo === "eliminar" ? (
          <Tarjeta estilo={{ borderWidth: 1, borderColor: colores.rojo }}>
            <T variante="fuerte" estilo={{ color: colores.rojo }}>¿Eliminar la cuenta de {u.nombre}?</T>
            <T estilo={{ marginTop: espacio.s }}>
              No se puede deshacer. Se anonimiza: se cancelan sus reservas futuras (las plazas pasan a la lista de espera), sale de las listas, se desactivan sus clases fijas, su saldo pasa a 0 y se borran su nombre, email y contraseña. El historial contable se conserva.
            </T>
            <View style={{ gap: espacio.s, marginTop: espacio.l }}>
              <Boton
                titulo="Sí, eliminar cuenta"
                variante="peligro"
                cargando={enviando}
                onPress={async () => {
                  setEnviando(true);
                  try {
                    await api.delete(`/api/admin/usuarios/${id}`);
                    alerta("Cuenta eliminada");
                    router.back();
                  } catch (e) {
                    alerta("No se ha podido eliminar", mensajeError(e));
                  } finally {
                    setEnviando(false);
                  }
                }}
              />
              <Boton titulo="No, mantener" variante="secundario" onPress={() => setModo(null)} />
            </View>
          </Tarjeta>
        ) : (
          <Boton titulo="Eliminar cuenta (RGPD)" variante="texto" onPress={() => abrir("eliminar")} />
        )}
      </View>
    </Pantalla>
  );
}
