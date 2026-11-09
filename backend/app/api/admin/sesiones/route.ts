import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { DIA, fechaParam } from "@/server/fechas";
import { cuerpo, entero, ErrorHttp, ruta } from "@/server/http";
import { asegurarSesiones, comprobarSolape, sesionesDonde } from "@/server/motor";
import { verSesionesAdmin } from "@/server/vistas";

/** Calendario de la clínica: ?desde&hasta */
export const GET = ruta(async (req) => {
  await requerirAdmin(req);
  const q = req.nextUrl.searchParams;
  const desde = fechaParam(q.get("desde"), new Date());
  const hasta = fechaParam(q.get("hasta"), new Date(desde.getTime() + 7 * DIA));
  await asegurarSesiones(sql, desde, hasta);
  return verSesionesAdmin(sql, await sesionesDonde(sql, sql`s.fecha_hora_inicio >= ${desde} AND s.fecha_hora_inicio < ${hasta}`));
});

/** Clase suelta (fuera del horario base). */
export const POST = ruta(async (req) => {
  await requerirAdmin(req);
  const b = await cuerpo(req);
  const inicio = new Date(String(b.fechaHoraInicio ?? ""));
  if (Number.isNaN(inicio.getTime())) throw new ErrorHttp(400, "Fecha no válida.");
  const duracion = Number(b.duracionMinutos) || 60;
  const fin = new Date(inicio.getTime() + duracion * 60_000);
  const datos = {
    programaId: entero(b.programaId, "programaId"),
    profesionalId: entero(b.profesionalId, "profesionalId"),
    salaId: Number(b.salaId) || 1,
    capacidad: Number(b.capacidad) || 8,
  };
  const id = await sql.begin(async (tx) => {
    await comprobarSolape(tx, { salaId: datos.salaId, profesionalId: datos.profesionalId, inicio, fin });
    const [s] = await tx<{ id: number }[]>`
      INSERT INTO sesiones (programa_id, profesional_id, sala_id, fecha_hora_inicio, fecha_hora_fin, capacidad)
      VALUES (${datos.programaId}, ${datos.profesionalId}, ${datos.salaId}, ${inicio}, ${fin}, ${datos.capacidad})
      RETURNING id`;
    return s.id;
  });
  return { ok: true, id };
});
