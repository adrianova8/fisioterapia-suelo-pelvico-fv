// MOTOR DE REGLAS (la única fuente de verdad del negocio).
// Ver RELEVO_IA_APP_EMBARAZO.md §2. Resumen:
// - Mensualidad del MES DE LA CLASE (no del mes actual) → da N clases por semana.
// - Semana = lunes 00:00 a lunes 00:00. No acumula.
// - Consumen cuota: CONFIRMADA, CANCELADA_SIN_CREDITO, ASISTIDA, NO_SHOW (solo origen SEMANAL).
// - Reserva abre 3 días antes a las 00:00. Cancelar ≥1 h recupera; <1 h la pierde.
// - Lista de espera solo con clase completa; se cierra 1 h antes; promoción automática.
// - Saldo de compensación (origen COMPENSACION): no consume cuota ni pide mensualidad.
// - Clases fijas: se reservan solas si la mensualidad del mes de la clase está ACTIVA.
// Las funciones que cambian datos reciben `tx` (dentro de sql.begin) y devuelven
// a quién hay que avisar; los avisos se mandan DESPUÉS del COMMIT.
import type { PendingQuery, Row } from "postgres";

import type { Db } from "./db";
import { aperturaReserva, claveMes, claveMesDe, diaSemana, DIA, HORA, lunes, ZONA } from "./fechas";
import { ErrorHttp, noEncontrado } from "./http";

export type EstadoReserva = "CONFIRMADA" | "CANCELADA_CON_CREDITO" | "CANCELADA_SIN_CREDITO" | "ASISTIDA" | "NO_SHOW";
export type Origen = "SEMANAL" | "COMPENSACION";
export type EstadoSesion =
  | "DISPONIBLE" | "FINALIZADA" | "RESERVADA" | "EN_LISTA_ESPERA" | "NO_ABIERTA" | "SIN_MENSUALIDAD"
  | "MENSUALIDAD_NO_ACTIVA" | "LIMITE_SEMANAL" | "LISTA_ESPERA_CERRADA" | "COMPLETA" | "CANCELADA";

export const CONSUMEN: EstadoReserva[] = ["CONFIRMADA", "CANCELADA_SIN_CREDITO", "ASISTIDA", "NO_SHOW"];
export const OCUPAN: EstadoReserva[] = ["CONFIRMADA", "ASISTIDA", "NO_SHOW"];

// ---------------------------------------------------------------- Lecturas

export interface SesionFila {
  id: number;
  programaId: number;
  programa: string;
  programaImagenAct: Date | null;
  profesionalId: number;
  profesional: string;
  profesionalFotoAct: Date | null;
  salaId: number;
  sala: string;
  fechaHoraInicio: Date;
  fechaHoraFin: Date;
  capacidad: number;
  plantillaId: number | null;
  estado: "ACTIVA" | "CANCELADA";
}

/** Sesiones con nombres de programa, profesional y sala. `donde` es un fragmento SQL sobre `s`. */
export function sesionesDonde(db: Db, donde: PendingQuery<Row[]>): Promise<SesionFila[]> {
  return db<SesionFila[]>`
    SELECT s.id, s.programa_id, p.nombre AS programa, p.imagen_actualizada AS programa_imagen_act,
           s.profesional_id, pr.nombre AS profesional, pr.foto_actualizada AS profesional_foto_act,
           s.sala_id, sa.nombre AS sala, s.fecha_hora_inicio, s.fecha_hora_fin, s.capacidad,
           s.plantilla_id, s.estado
    FROM sesiones s
    JOIN programas p ON p.id = s.programa_id
    JOIN profesionales pr ON pr.id = s.profesional_id
    JOIN salas sa ON sa.id = s.sala_id
    WHERE ${donde}
    ORDER BY s.fecha_hora_inicio, s.id`;
}

export async function sesionPorId(db: Db, id: number): Promise<SesionFila> {
  const [s] = await sesionesDonde(db, db`s.id = ${id}`);
  if (!s) throw noEncontrado("Clase no encontrada.");
  return s;
}

export interface MensualidadVista {
  id: number;
  anio: number;
  mes: number;
  estado: "ACTIVA" | "PAUSADA" | "FINALIZADA";
  fechaActivacion: Date;
  fechaPausa: Date | null;
  motivoPausa: string | null;
  tarifa: { id: number; nombre: string; sesionesSemana: number; precioCentimos: number; activa: boolean };
}

interface MensualidadFila {
  id: number; anio: number; mes: number; estado: MensualidadVista["estado"]; fechaActivacion: Date;
  fechaPausa: Date | null; motivoPausa: string | null;
  tarifaId: number; tarifaNombre: string; sesionesSemana: number; precioCentimos: number; tarifaActiva: boolean;
}

const aVista = (m: MensualidadFila): MensualidadVista => ({
  id: m.id, anio: m.anio, mes: m.mes, estado: m.estado, fechaActivacion: m.fechaActivacion,
  fechaPausa: m.fechaPausa, motivoPausa: m.motivoPausa,
  tarifa: { id: m.tarifaId, nombre: m.tarifaNombre, sesionesSemana: m.sesionesSemana, precioCentimos: m.precioCentimos, activa: m.tarifaActiva },
});

export async function mensualidadesDe(db: Db, usuarioId: number): Promise<MensualidadVista[]> {
  const filas = await db<MensualidadFila[]>`
    SELECT m.id, m.anio, m.mes, m.estado, m.fecha_activacion, m.fecha_pausa, m.motivo_pausa,
           t.id AS tarifa_id, t.nombre AS tarifa_nombre, t.sesiones_semana, t.precio_centimos, t.activa AS tarifa_activa
    FROM suscripciones_mensuales m JOIN tarifas t ON t.id = m.tarifa_id
    WHERE m.usuario_id = ${usuarioId}
    ORDER BY m.anio DESC, m.mes DESC`;
  return filas.map(aVista);
}

export async function mensualidadDelMes(db: Db, usuarioId: number, fecha: Date): Promise<MensualidadVista | null> {
  const todas = await mensualidadesDe(db, usuarioId);
  return todas.find((m) => claveMes(m.anio, m.mes) === claveMesDe(fecha)) ?? null;
}

/** Clases de la cuota semanal ya usadas en la semana de `fecha`. */
export async function usadasSemana(db: Db, usuarioId: number, fecha: Date): Promise<number> {
  const l = lunes(fecha);
  const [{ n }] = await db<{ n: number }[]>`
    SELECT count(*)::int AS n FROM reservas r JOIN sesiones s ON s.id = r.sesion_id
    WHERE r.usuario_id = ${usuarioId} AND r.origen = 'SEMANAL' AND r.estado IN ${db(CONSUMEN)}
      AND s.fecha_hora_inicio >= ${l} AND s.fecha_hora_inicio < ${new Date(l.getTime() + 7 * DIA)}`;
  return n;
}

// ---------------------------------------------------------------- Contexto y elegibilidad

export interface UsuariaMotor {
  id: number;
  programaId: number;
  saldoCompensacion: number;
}

export interface Contexto {
  usuaria: UsuariaMotor;
  ahora: Date;
  reservas: Map<number, { id: number; estado: EstadoReserva; origen: Origen; fija: boolean }>;
  enEspera: Set<number>;
  mensualidades: Map<string, MensualidadVista>;
  usadasPorSemana: Map<number, number>;
  ocupadas: Map<number, number>;
}

/** Carga de una vez todo lo necesario para decidir sobre varias sesiones (pocas consultas). */
export async function cargarContexto(
  db: Db,
  usuaria: UsuariaMotor,
  sesiones: SesionFila[],
  opciones: { ignorarEspera?: boolean } = {},
): Promise<Contexto> {
  const ctx: Contexto = {
    usuaria,
    ahora: new Date(),
    reservas: new Map(),
    enEspera: new Set(),
    mensualidades: new Map(),
    usadasPorSemana: new Map(),
    ocupadas: new Map(),
  };
  for (const m of await mensualidadesDe(db, usuaria.id)) ctx.mensualidades.set(claveMes(m.anio, m.mes), m);
  if (sesiones.length === 0) return ctx;

  const ids = sesiones.map((s) => s.id);
  const reservas = await db<{ id: number; sesionId: number; estado: EstadoReserva; origen: Origen; fija: boolean }[]>`
    SELECT id, sesion_id, estado, origen, (asignacion_fija_id IS NOT NULL) AS fija
    FROM reservas WHERE usuario_id = ${usuaria.id} AND sesion_id IN ${db(ids)}`;
  for (const r of reservas) ctx.reservas.set(r.sesionId, r);

  if (!opciones.ignorarEspera) {
    const espera = await db<{ sesionId: number }[]>`
      SELECT sesion_id FROM lista_espera
      WHERE usuario_id = ${usuaria.id} AND estado = 'ESPERANDO' AND sesion_id IN ${db(ids)}`;
    for (const e of espera) ctx.enEspera.add(e.sesionId);
  }

  const ocup = await db<{ sesionId: number; n: number }[]>`
    SELECT sesion_id, count(*)::int AS n FROM reservas
    WHERE sesion_id IN ${db(ids)} AND estado IN ${db(OCUPAN)} GROUP BY sesion_id`;
  for (const o of ocup) ctx.ocupadas.set(o.sesionId, o.n);

  const desde = lunes(new Date(Math.min(...sesiones.map((s) => s.fechaHoraInicio.getTime()))));
  const hasta = new Date(lunes(new Date(Math.max(...sesiones.map((s) => s.fechaHoraInicio.getTime())))).getTime() + 7 * DIA);
  const usadas = await db<{ inicio: Date }[]>`
    SELECT s.fecha_hora_inicio AS inicio FROM reservas r JOIN sesiones s ON s.id = r.sesion_id
    WHERE r.usuario_id = ${usuaria.id} AND r.origen = 'SEMANAL' AND r.estado IN ${db(CONSUMEN)}
      AND s.fecha_hora_inicio >= ${desde} AND s.fecha_hora_inicio < ${hasta}`;
  for (const u of usadas) {
    const k = lunes(u.inicio).getTime();
    ctx.usadasPorSemana.set(k, (ctx.usadasPorSemana.get(k) ?? 0) + 1);
  }
  return ctx;
}

export interface Elegibilidad {
  estado: EstadoSesion;
  puedeReservar: boolean;
  puedeUnirse: boolean;
  origen?: Origen;
  mensualidad: MensualidadVista | null;
}

/** ¿Qué puede hacer esta usuaria con esta sesión? (función pura sobre el contexto) */
export function elegibilidad(ctx: Contexto, s: SesionFila): Elegibilidad {
  const { ahora, usuaria } = ctx;
  const m = ctx.mensualidades.get(claveMesDe(s.fechaHoraInicio)) ?? null;
  const no = (estado: EstadoSesion): Elegibilidad => ({ estado, puedeReservar: false, puedeUnirse: false, mensualidad: m });
  const mia = ctx.reservas.get(s.id);

  if (s.estado === "CANCELADA") return no("CANCELADA");
  if (s.fechaHoraInicio <= ahora) return no("FINALIZADA");
  if (mia?.estado === "CONFIRMADA") return no("RESERVADA");
  if (ctx.enEspera.has(s.id)) return no("EN_LISTA_ESPERA");
  if (ahora < aperturaReserva(s.fechaHoraInicio)) return no("NO_ABIERTA");
  if (mia?.estado === "CANCELADA_SIN_CREDITO") return no("LIMITE_SEMANAL");

  // Pausada = baja deliberada: no reserva aunque tenga saldo (§2.8).
  if (m?.estado === "PAUSADA") return no("MENSUALIDAD_NO_ACTIVA");

  let origen: Origen = "SEMANAL";
  const usadas = ctx.usadasPorSemana.get(lunes(s.fechaHoraInicio).getTime()) ?? 0;
  const semanalOk = m?.estado === "ACTIVA" && usadas < m.tarifa.sesionesSemana;
  if (!semanalOk) {
    if (usuaria.saldoCompensacion > 0) origen = "COMPENSACION";
    else if (!m) return no("SIN_MENSUALIDAD");
    else if (m.estado !== "ACTIVA") return no("MENSUALIDAD_NO_ACTIVA");
    else return no("LIMITE_SEMANAL");
  }

  if ((ctx.ocupadas.get(s.id) ?? 0) >= s.capacidad) {
    if (s.fechaHoraInicio.getTime() - ahora.getTime() < HORA) return no("LISTA_ESPERA_CERRADA");
    return { estado: "COMPLETA", puedeReservar: false, puedeUnirse: true, mensualidad: m };
  }
  return { estado: "DISPONIBLE", puedeReservar: true, puedeUnirse: false, origen, mensualidad: m };
}

export function mensajeEstado(e: EstadoSesion): string {
  switch (e) {
    case "NO_ABIERTA": return "Esta clase todavía no está abierta para reservar.";
    case "SIN_MENSUALIDAD": return "No tienes activado el plan del mes de esta clase.";
    case "MENSUALIDAD_NO_ACTIVA": return "Tu plan de ese mes no está activo.";
    case "LIMITE_SEMANAL": return "Ya has usado tus clases de esta semana.";
    case "COMPLETA": return "La clase está completa.";
    case "LISTA_ESPERA_CERRADA": return "La lista de espera se cierra 1 hora antes de la clase.";
    case "RESERVADA": return "Ya tienes plaza en esta clase.";
    case "EN_LISTA_ESPERA": return "Ya estás en la lista de espera.";
    case "FINALIZADA": return "Esta clase ya ha pasado.";
    case "CANCELADA": return "Esta clase ha sido cancelada por el centro.";
    default: return "No se puede reservar esta clase.";
  }
}

// ---------------------------------------------------------------- Horario base → sesiones

const MAX_DIAS_RANGO = 70;

/** Crea (si faltan) las sesiones del horario base entre dos fechas y reserva las clases fijas. */
export async function asegurarSesiones(db: Db, desde: Date, hasta: Date) {
  if (hasta.getTime() - desde.getTime() > MAX_DIAS_RANGO * DIA) hasta = new Date(desde.getTime() + MAX_DIAS_RANGO * DIA);
  const plantilla = await db<{ id: number; diaSemana: number; horaInicio: string; duracionMinutos: number; programaId: number; profesionalId: number; salaId: number; capacidad: number }[]>`
    SELECT id, dia_semana, hora_inicio, duracion_minutos, programa_id, profesional_id, sala_id, capacidad
    FROM plantilla_horario WHERE activa`;
  const filas: Record<string, unknown>[] = [];
  for (let d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate()); d < hasta; d.setDate(d.getDate() + 1)) {
    for (const p of plantilla) {
      if (p.diaSemana !== diaSemana(d)) continue;
      const [hh, mm] = p.horaInicio.split(":").map(Number);
      const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
      filas.push({
        programa_id: p.programaId,
        profesional_id: p.profesionalId,
        sala_id: p.salaId,
        fecha_hora_inicio: inicio,
        fecha_hora_fin: new Date(inicio.getTime() + p.duracionMinutos * 60_000),
        capacidad: p.capacidad,
        plantilla_id: p.id,
        slot_inicio: inicio,
      });
    }
  }
  if (filas.length) {
    await db`INSERT INTO sesiones ${db(filas)}
             ON CONFLICT (plantilla_id, slot_inicio) WHERE plantilla_id IS NOT NULL DO NOTHING`;
  }
  await asegurarReservasFijas(db, desde, hasta);
}

/** Reserva las clases fijas futuras del rango si la mensualidad del mes de la clase está ACTIVA. */
export async function asegurarReservasFijas(db: Db, desde: Date, hasta: Date) {
  await db`
    INSERT INTO reservas (usuario_id, sesion_id, suscripcion_mensual_id, estado, origen, asignacion_fija_id)
    SELECT f.usuario_id, s.id, m.id, 'CONFIRMADA', 'SEMANAL', f.id
    FROM asignaciones_fijas f
    JOIN usuarios u ON u.id = f.usuario_id AND u.eliminada_en IS NULL
    JOIN sesiones s ON s.plantilla_id = f.plantilla_id AND s.estado = 'ACTIVA'
                   AND s.programa_id = u.programa_id
                   AND s.fecha_hora_inicio > now()
                   AND s.fecha_hora_inicio >= ${desde} AND s.fecha_hora_inicio < ${hasta}
    JOIN suscripciones_mensuales m ON m.usuario_id = f.usuario_id AND m.estado = 'ACTIVA'
                   AND m.anio = extract(year FROM s.fecha_hora_inicio AT TIME ZONE ${ZONA})
                   AND m.mes = extract(month FROM s.fecha_hora_inicio AT TIME ZONE ${ZONA})
    WHERE f.activa
      AND (SELECT count(*) FROM reservas r WHERE r.sesion_id = s.id AND r.estado IN ${db(OCUPAN)}) < s.capacidad
    ON CONFLICT (usuario_id, sesion_id) DO NOTHING`;
}

// ---------------------------------------------------------------- Reservas

async function bloquearSesion(tx: Db, sesionId: number) {
  const [s] = await tx`SELECT id FROM sesiones WHERE id = ${sesionId} FOR UPDATE`;
  if (!s) throw noEncontrado("Clase no encontrada.");
}

async function usuariaBloqueada(tx: Db, usuarioId: number): Promise<UsuariaMotor & { eliminada: boolean }> {
  const [u] = await tx<(UsuariaMotor & { eliminada: boolean })[]>`
    SELECT id, programa_id, saldo_compensacion, (eliminada_en IS NOT NULL) AS eliminada
    FROM usuarios WHERE id = ${usuarioId} FOR UPDATE`;
  if (!u) throw noEncontrado("Usuaria no encontrada.");
  return u;
}

async function crearReservaInterna(tx: Db, usuarioId: number, sesionId: number, e: Elegibilidad): Promise<number> {
  const origen = e.origen ?? "SEMANAL";
  const suscripcionId = origen === "SEMANAL" ? (e.mensualidad?.id ?? null) : null;
  const [r] = await tx<{ id: number }[]>`
    INSERT INTO reservas (usuario_id, sesion_id, suscripcion_mensual_id, estado, origen)
    VALUES (${usuarioId}, ${sesionId}, ${suscripcionId}, 'CONFIRMADA', ${origen})
    ON CONFLICT (usuario_id, sesion_id) DO UPDATE
      SET estado = 'CONFIRMADA', origen = EXCLUDED.origen, suscripcion_mensual_id = EXCLUDED.suscripcion_mensual_id,
          fecha_reserva = now(), fecha_cancelacion = NULL
    RETURNING id`;
  if (origen === "COMPENSACION") {
    await tx`UPDATE usuarios SET saldo_compensacion = saldo_compensacion - 1 WHERE id = ${usuarioId}`;
  }
  return r.id;
}

export async function reservar(tx: Db, usuarioId: number, sesionId: number) {
  await bloquearSesion(tx, sesionId);
  const u = await usuariaBloqueada(tx, usuarioId);
  const s = await sesionPorId(tx, sesionId);
  if (s.programaId !== u.programaId) throw new ErrorHttp(400, "Esta clase no es de tu programa.");
  const ctx = await cargarContexto(tx, u, [s]);
  const e = elegibilidad(ctx, s);
  if (!e.puedeReservar) throw new ErrorHttp(400, mensajeEstado(e.estado));
  const reservaId = await crearReservaInterna(tx, u.id, s.id, e);
  return { reservaId, origen: e.origen ?? "SEMANAL" };
}

export interface Promocion {
  usuarioId: number;
  sesion: SesionFila;
}

/** Cancelar o liberar plaza (también la fija). ≥1 h antes recupera la sesión. */
export async function cancelarReserva(tx: Db, usuarioId: number, reservaId: number) {
  const [r] = await tx<{ id: number; usuarioId: number; sesionId: number; estado: EstadoReserva; origen: Origen }[]>`
    SELECT id, usuario_id, sesion_id, estado, origen FROM reservas WHERE id = ${reservaId}`;
  if (!r || r.usuarioId !== usuarioId || r.estado !== "CONFIRMADA") throw new ErrorHttp(400, "No se puede cancelar esta reserva.");
  await bloquearSesion(tx, r.sesionId);
  await usuariaBloqueada(tx, usuarioId);
  const s = await sesionPorId(tx, r.sesionId);
  const ahora = Date.now();
  if (s.fechaHoraInicio.getTime() <= ahora) throw new ErrorHttp(400, "La clase ya ha empezado.");
  const aTiempo = s.fechaHoraInicio.getTime() - ahora >= HORA;
  await tx`UPDATE reservas SET estado = ${aTiempo ? "CANCELADA_CON_CREDITO" : "CANCELADA_SIN_CREDITO"}, fecha_cancelacion = now()
           WHERE id = ${r.id}`;
  if (aTiempo && r.origen === "COMPENSACION") {
    await tx`UPDATE usuarios SET saldo_compensacion = saldo_compensacion + 1 WHERE id = ${usuarioId}`;
  }
  const promociones = await promocionarListaEspera(tx, s.id);
  return { recuperaSesion: aTiempo, promociones };
}

/** Da la plaza libre a la primera de la cola que siga cumpliendo las reglas. La sesión debe estar bloqueada. */
export async function promocionarListaEspera(tx: Db, sesionId: number): Promise<Promocion[]> {
  const s = await sesionPorId(tx, sesionId);
  if (s.estado !== "ACTIVA" || s.fechaHoraInicio.getTime() - Date.now() < HORA) return [];
  const cola = await tx<{ id: number; usuarioId: number }[]>`
    SELECT id, usuario_id FROM lista_espera WHERE sesion_id = ${sesionId} AND estado = 'ESPERANDO'
    ORDER BY fecha_entrada, id`;
  const promos: Promocion[] = [];
  for (const e of cola) {
    const [{ n }] = await tx<{ n: number }[]>`SELECT count(*)::int AS n FROM reservas WHERE sesion_id = ${sesionId} AND estado IN ${tx(OCUPAN)}`;
    if (n >= s.capacidad) break;
    const u = await usuariaBloqueada(tx, e.usuarioId);
    if (u.eliminada) continue;
    const ctx = await cargarContexto(tx, u, [s], { ignorarEspera: true });
    const el = elegibilidad(ctx, s);
    if (!el.puedeReservar) continue; // sigue esperando (p. ej. ya gastó su cuota)
    await tx`UPDATE lista_espera SET estado = 'PROMOCIONADA' WHERE id = ${e.id}`;
    await crearReservaInterna(tx, u.id, s.id, el);
    promos.push({ usuarioId: u.id, sesion: s });
  }
  return promos;
}

export async function unirseListaEspera(tx: Db, usuarioId: number, sesionId: number) {
  await bloquearSesion(tx, sesionId);
  const u = await usuariaBloqueada(tx, usuarioId);
  const s = await sesionPorId(tx, sesionId);
  const e = elegibilidad(await cargarContexto(tx, u, [s]), s);
  if (!e.puedeUnirse) throw new ErrorHttp(400, mensajeEstado(e.estado));
  await tx`INSERT INTO lista_espera (usuario_id, sesion_id, estado) VALUES (${u.id}, ${s.id}, 'ESPERANDO')
           ON CONFLICT (usuario_id, sesion_id) DO UPDATE SET estado = 'ESPERANDO', fecha_entrada = now()`;
  const [{ n }] = await tx<{ n: number }[]>`
    SELECT count(*)::int AS n FROM lista_espera
    WHERE sesion_id = ${s.id} AND estado = 'ESPERANDO'
      AND fecha_entrada <= (SELECT fecha_entrada FROM lista_espera WHERE usuario_id = ${u.id} AND sesion_id = ${s.id})`;
  return { posicion: n };
}

export async function salirListaEspera(db: Db, usuarioId: number, sesionId: number) {
  await db`UPDATE lista_espera SET estado = 'CANCELADA' WHERE usuario_id = ${usuarioId} AND sesion_id = ${sesionId} AND estado = 'ESPERANDO'`;
}

/** El centro cancela una clase: nunca se borra; se liberan reservas (recuperan sesión / saldo). */
export async function cancelarSesion(tx: Db, sesionId: number) {
  await bloquearSesion(tx, sesionId);
  const s = await sesionPorId(tx, sesionId);
  if (s.estado === "CANCELADA") return { sesion: s, avisar: [] as number[] };
  await tx`UPDATE sesiones SET estado = 'CANCELADA' WHERE id = ${sesionId}`;
  const liberadas = await tx<{ usuarioId: number; origen: Origen }[]>`
    UPDATE reservas SET estado = 'CANCELADA_CON_CREDITO', fecha_cancelacion = now()
    WHERE sesion_id = ${sesionId} AND estado = 'CONFIRMADA'
    RETURNING usuario_id, origen`;
  for (const r of liberadas.filter((x) => x.origen === "COMPENSACION")) {
    await tx`UPDATE usuarios SET saldo_compensacion = saldo_compensacion + 1 WHERE id = ${r.usuarioId}`;
  }
  const esperando = await tx<{ usuarioId: number }[]>`
    UPDATE lista_espera SET estado = 'CANCELADA' WHERE sesion_id = ${sesionId} AND estado = 'ESPERANDO' RETURNING usuario_id`;
  const avisar = [...new Set([...liberadas, ...esperando].map((x) => x.usuarioId))];
  return { sesion: { ...s, estado: "CANCELADA" as const }, avisar };
}

/** RGPD: se anonimiza (no se borran filas). Devuelve promociones de lista de espera a avisar. */
export async function eliminarCuenta(tx: Db, usuarioId: number): Promise<Promocion[]> {
  const [u] = await tx<{ rol: string; eliminadaEn: Date | null }[]>`SELECT rol, eliminada_en FROM usuarios WHERE id = ${usuarioId}`;
  if (!u || u.eliminadaEn) throw noEncontrado("Usuaria no encontrada.");
  if (u.rol === "ADMIN") throw new ErrorHttp(400, "Las cuentas de administración no se pueden eliminar así.");

  const futuras = await tx<{ sesionId: number }[]>`
    UPDATE reservas r SET estado = 'CANCELADA_CON_CREDITO', fecha_cancelacion = now()
    FROM sesiones s
    WHERE r.sesion_id = s.id AND r.usuario_id = ${usuarioId} AND r.estado = 'CONFIRMADA' AND s.fecha_hora_inicio > now()
    RETURNING r.sesion_id`;
  await tx`UPDATE lista_espera SET estado = 'CANCELADA' WHERE usuario_id = ${usuarioId} AND estado = 'ESPERANDO'`;
  await tx`UPDATE asignaciones_fijas SET activa = FALSE WHERE usuario_id = ${usuarioId}`;
  await tx`UPDATE usuarios SET nombre = 'Usuaria eliminada', email = ${`eliminada-${usuarioId}@anonimizada.invalid`},
             saldo_compensacion = 0, recordatorios = FALSE, eliminada_en = now()
           WHERE id = ${usuarioId}`;
  await tx`DELETE FROM credenciales WHERE usuario_id = ${usuarioId}`;
  await tx`DELETE FROM sesiones_auth WHERE usuario_id = ${usuarioId}`;
  await tx`DELETE FROM push_tokens WHERE usuario_id = ${usuarioId}`;
  await tx`DELETE FROM tokens_recuperacion WHERE usuario_id = ${usuarioId}`;

  const promos: Promocion[] = [];
  for (const { sesionId } of futuras) {
    await bloquearSesion(tx, sesionId);
    promos.push(...(await promocionarListaEspera(tx, sesionId)));
  }
  return promos;
}

// ---------------------------------------------------------------- Admin

/** Clases pagadas y no gastadas al pausar: lo que queda de esta semana + cuota × semanas restantes del mes. */
export async function sugerenciaCompensacion(db: Db, usuarioId: number, anio: number, mes: number): Promise<number> {
  const m = (await mensualidadesDe(db, usuarioId)).find((x) => x.anio === anio && x.mes === mes);
  if (!m) return 0;
  const cuota = m.tarifa.sesionesSemana;
  const ahora = new Date();
  const finMes = new Date(anio, mes, 1);
  if (ahora >= finMes) return 0;
  const restanteSemana = Math.max(0, cuota - (await usadasSemana(db, usuarioId, ahora)));
  let semanas = 0;
  for (let l = lunes(ahora); ; ) {
    l = new Date(l.getFullYear(), l.getMonth(), l.getDate() + 7);
    if (l >= finMes) break;
    semanas++;
  }
  return restanteSemana + cuota * semanas;
}

/** No puede haber dos clases a la vez en la misma sala ni con la misma profesional. */
export async function comprobarSolape(
  db: Db,
  s: { id?: number; salaId: number; profesionalId: number; inicio: Date; fin: Date },
) {
  const [choca] = await db`
    SELECT id FROM sesiones
    WHERE estado = 'ACTIVA' AND id <> ${s.id ?? 0}
      AND fecha_hora_inicio < ${s.fin} AND ${s.inicio} < fecha_hora_fin
      AND (sala_id = ${s.salaId} OR profesional_id = ${s.profesionalId})
    LIMIT 1`;
  if (choca) throw new ErrorHttp(400, "Ya hay otra clase a esa hora en la misma sala o con la misma profesional.");
}
