// Forma de las respuestas JSON (deben coincidir con src/lib/tipos.ts de la app).
import type { Db } from "./db";
import { aperturaReserva } from "./fechas";
import { cargarContexto, elegibilidad, type Contexto, type MensualidadVista, type SesionFila, type UsuariaMotor } from "./motor";

export const urlImagen = (tipo: "programa" | "profesional", id: number, actualizada: Date | null) =>
  actualizada ? `/api/imagenes/${tipo}/${id}?v=${actualizada.getTime()}` : null;

export function verMensualidad(m: MensualidadVista | null | undefined) {
  if (!m) return null;
  return {
    id: m.id,
    anio: m.anio,
    mes: m.mes,
    estado: m.estado,
    tarifa: m.tarifa,
    fechaActivacion: m.fechaActivacion.toISOString(),
    fechaPausa: m.fechaPausa?.toISOString() ?? null,
    motivoPausa: m.motivoPausa,
  };
}

export async function verUsuario(db: Db, u: { id: number; nombre: string; email: string; rol: string; programaId: number }) {
  const [p] = await db<{ id: number; nombre: string; imagenActualizada: Date | null }[]>`
    SELECT id, nombre, imagen_actualizada FROM programas WHERE id = ${u.programaId}`;
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    programa: p ? { id: p.id, nombre: p.nombre, imagen: urlImagen("programa", p.id, p.imagenActualizada) } : null,
  };
}

function base(s: SesionFila, ocupadas: number) {
  return {
    id: s.id,
    programaId: s.programaId,
    programa: s.programa,
    programaImagen: urlImagen("programa", s.programaId, s.programaImagenAct),
    profesionalId: s.profesionalId,
    profesional: s.profesional,
    profesionalFoto: urlImagen("profesional", s.profesionalId, s.profesionalFotoAct),
    sala: s.sala,
    fechaHoraInicio: s.fechaHoraInicio.toISOString(),
    fechaHoraFin: s.fechaHoraFin.toISOString(),
    capacidad: s.capacidad,
    ocupadas,
    aperturaReserva: aperturaReserva(s.fechaHoraInicio).toISOString(),
  };
}

/** Sesión vista por una usuaria (con lo que puede hacer). */
export function verSesionUsuaria(s: SesionFila, ctx: Contexto) {
  const e = elegibilidad(ctx, s);
  const mia = ctx.reservas.get(s.id);
  const confirmada = mia?.estado === "CONFIRMADA" ? mia : null;
  return {
    ...base(s, ctx.ocupadas.get(s.id) ?? 0),
    estado: e.estado,
    puedeReservar: e.puedeReservar,
    puedeUnirseListaEspera: e.puedeUnirse,
    miReservaId: confirmada?.id ?? null,
    miReservaFija: !!confirmada?.fija,
    mensualidad: verMensualidad(e.mensualidad),
  };
}

export async function verSesionesUsuaria(db: Db, u: UsuariaMotor, sesiones: SesionFila[]) {
  const ctx = await cargarContexto(db, u, sesiones);
  return sesiones.map((s) => verSesionUsuaria(s, ctx));
}

async function ocupadasDe(db: Db, ids: number[]) {
  const m = new Map<number, number>();
  if (!ids.length) return m;
  const filas = await db<{ sesionId: number; n: number }[]>`
    SELECT sesion_id, count(*)::int AS n FROM reservas
    WHERE sesion_id IN ${db(ids)} AND estado IN ('CONFIRMADA','ASISTIDA','NO_SHOW') GROUP BY sesion_id`;
  for (const f of filas) m.set(f.sesionId, f.n);
  return m;
}

/** Sesiones públicas (invitada): solo lectura. */
export async function verSesionesInvitada(db: Db, sesiones: SesionFila[]) {
  const ocup = await ocupadasDe(db, sesiones.map((s) => s.id));
  const ahora = new Date();
  return sesiones.map((s) => ({
    ...base(s, ocup.get(s.id) ?? 0),
    estado: s.estado === "CANCELADA" ? "CANCELADA" : s.fechaHoraInicio <= ahora ? "FINALIZADA" : "NO_ABIERTA",
    puedeReservar: false,
    puedeUnirseListaEspera: false,
  }));
}

/** Sesiones vistas por la administración (con lista de espera). */
export async function verSesionesAdmin(db: Db, sesiones: SesionFila[]) {
  const ids = sesiones.map((s) => s.id);
  const ocup = await ocupadasDe(db, ids);
  const espera = new Map<number, number>();
  if (ids.length) {
    for (const f of await db<{ sesionId: number; n: number }[]>`
      SELECT sesion_id, count(*)::int AS n FROM lista_espera WHERE sesion_id IN ${db(ids)} AND estado = 'ESPERANDO' GROUP BY sesion_id`) {
      espera.set(f.sesionId, f.n);
    }
  }
  return sesiones.map((s) => ({
    ...base(s, ocup.get(s.id) ?? 0),
    estado: s.estado,
    puedeReservar: false,
    puedeUnirseListaEspera: false,
    enEspera: espera.get(s.id) ?? 0,
  }));
}
