// Cambiar o quitar un hueco del horario base. Afecta a semanas aún no creadas;
// las clases ya generadas (que pueden tener reservas) no cambian.
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";

export const PATCH = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const b = await cuerpo(req);
  const [actual] = await sql`SELECT id FROM plantilla_horario WHERE id = ${id}`;
  if (!actual) throw new ErrorHttp(404, "Hueco no encontrado.");
  const cambios: Record<string, unknown> = {};
  if (b.diaSemana !== undefined) cambios.dia_semana = Number(b.diaSemana);
  if (b.horaInicio !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(b.horaInicio))) throw new ErrorHttp(400, "La hora debe ser HH:MM.");
    cambios.hora_inicio = String(b.horaInicio);
  }
  if (b.duracionMinutos !== undefined) cambios.duracion_minutos = Number(b.duracionMinutos);
  if (b.programaId !== undefined) cambios.programa_id = Number(b.programaId);
  if (b.profesionalId !== undefined) cambios.profesional_id = Number(b.profesionalId);
  if (b.salaId !== undefined) cambios.sala_id = Number(b.salaId);
  if (b.capacidad !== undefined) cambios.capacidad = Number(b.capacidad);
  if (typeof b.activa === "boolean") cambios.activa = b.activa;
  if (Object.keys(cambios).length) await sql`UPDATE plantilla_horario SET ${sql(cambios)} WHERE id = ${id}`;
  return { ok: true };
});

/** Quitar del horario (se desactiva; las clases ya creadas siguen). */
export const DELETE = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  await sql`UPDATE plantilla_horario SET activa = FALSE WHERE id = ${await idDe(ctx)}`;
  await sql`UPDATE asignaciones_fijas SET activa = FALSE WHERE plantilla_id = ${await idDe(ctx)}`;
  return { ok: true };
});
