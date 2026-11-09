// Clases fijas: la profesora asigna a la usuaria huecos del horario base.
import { usuariaParaAdmin } from "@/server/admin";
import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { DIA } from "@/server/fechas";
import { cuerpo, entero, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";
import { asegurarSesiones } from "@/server/motor";

export const GET = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  return sql`
    SELECT f.id, f.plantilla_id, f.activa, p.dia_semana, p.hora_inicio, pg.nombre AS programa, pr.nombre AS profesional
    FROM asignaciones_fijas f
    JOIN plantilla_horario p ON p.id = f.plantilla_id
    JOIN programas pg ON pg.id = p.programa_id
    JOIN profesionales pr ON pr.id = p.profesional_id
    WHERE f.usuario_id = ${id}
    ORDER BY f.activa DESC, p.dia_semana, p.hora_inicio`;
});

/** Asignar: { plantillaId } */
export const POST = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const u = await usuariaParaAdmin(sql, await idDe(ctx));
  const plantillaId = entero((await cuerpo(req)).plantillaId, "plantillaId");
  const [p] = await sql<{ programaId: number; activa: boolean }[]>`SELECT programa_id, activa FROM plantilla_horario WHERE id = ${plantillaId}`;
  if (!p || !p.activa) throw new ErrorHttp(400, "Ese hueco del horario no existe.");
  if (p.programaId !== u.programaId) throw new ErrorHttp(400, "Las clases fijas tienen que ser de su programa.");
  await sql`INSERT INTO asignaciones_fijas (usuario_id, plantilla_id) VALUES (${u.id}, ${plantillaId})
            ON CONFLICT (usuario_id, plantilla_id) DO UPDATE SET activa = TRUE`;
  await asegurarSesiones(sql, new Date(), new Date(Date.now() + 14 * DIA));
  return { ok: true };
});

/** Activar/desactivar: { asignacionId, activa } */
export const PATCH = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const b = await cuerpo(req);
  await sql`UPDATE asignaciones_fijas SET activa = ${b.activa === true} WHERE id = ${entero(b.asignacionId, "asignacionId")} AND usuario_id = ${id}`;
  return { ok: true };
});
