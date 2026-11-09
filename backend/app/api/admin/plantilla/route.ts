// Horario Base — clases con recurrencia semanal.
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, entero, ErrorHttp, ruta } from "@/server/http";

const LISTAR_PLANTILLA = `
  SELECT p.id, p.dia_semana, p.hora_inicio, p.duracion_minutos, p.programa_id, pg.nombre AS programa,
         p.profesional_id, pr.nombre AS profesional, p.sala_id, sa.nombre AS sala, p.capacidad, p.activa
  FROM plantilla_horario p
  JOIN programas pg ON pg.id = p.programa_id
  JOIN profesionales pr ON pr.id = p.profesional_id
  JOIN salas sa ON sa.id = p.sala_id`;

export const GET = ruta(async (req) => {
  await requerirAdmin(req);
  return sql.unsafe(`${LISTAR_PLANTILLA} WHERE p.activa ORDER BY p.dia_semana, p.hora_inicio`);
});

function validarHueco(b: Record<string, unknown>) {
  const hora = String(b.horaInicio ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) throw new ErrorHttp(400, "La hora debe ser HH:MM.");
  const dia = entero(b.diaSemana, "diaSemana");
  if (dia > 7) throw new ErrorHttp(400, "Día no válido.");
  return {
    dia_semana: dia,
    hora_inicio: hora,
    duracion_minutos: Number(b.duracionMinutos) || 60,
    programa_id: entero(b.programaId, "programaId"),
    profesional_id: entero(b.profesionalId, "profesionalId"),
    sala_id: Number(b.salaId) || 1,
    capacidad: Number(b.capacidad) || 8,
  };
}

export const POST = ruta(async (req) => {
  await requerirAdmin(req);
  const h = validarHueco(await cuerpo(req));
  const [n] = await sql<{ id: number }[]>`INSERT INTO plantilla_horario ${sql(h)} RETURNING id`;
  return { ok: true, id: n.id };
});
