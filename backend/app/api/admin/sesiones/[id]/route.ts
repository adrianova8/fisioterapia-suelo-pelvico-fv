import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, idDe, ruta, type CtxId } from "@/server/http";
import { cancelarSesion, comprobarSolape, promocionarListaEspera, sesionPorId, type Promocion } from "@/server/motor";
import { avisarCancelacionClase, avisarPromociones } from "@/server/notificaciones";
import { verSesionesAdmin } from "@/server/vistas";

export const GET = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const [v] = await verSesionesAdmin(sql, [await sesionPorId(sql, await idDe(ctx))]);
  return v;
});

/** Editar SOLO la clase de ese día: hora, duración, profesional, aforo. */
export const PATCH = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const b = await cuerpo(req);
  const promos = await sql.begin(async (tx) => {
    await tx`SELECT id FROM sesiones WHERE id = ${id} FOR UPDATE`;
    const s = await sesionPorId(tx, id);
    if (s.estado === "CANCELADA") throw new ErrorHttp(400, "La clase está cancelada.");
    let inicio = s.fechaHoraInicio;
    let fin = s.fechaHoraFin;
    if (b.fechaHoraInicio) {
      inicio = new Date(String(b.fechaHoraInicio));
      if (Number.isNaN(inicio.getTime())) throw new ErrorHttp(400, "Fecha no válida.");
      const dur = Number(b.duracionMinutos) * 60_000 || s.fechaHoraFin.getTime() - s.fechaHoraInicio.getTime();
      fin = new Date(inicio.getTime() + dur);
    }
    const profesionalId = Number(b.profesionalId) || s.profesionalId;
    const capacidad = Number(b.capacidad) || s.capacidad;
    if (capacidad < 1) throw new ErrorHttp(400, "El aforo debe ser al menos 1.");
    await comprobarSolape(tx, { id, salaId: s.salaId, profesionalId, inicio, fin });
    await tx`UPDATE sesiones SET fecha_hora_inicio = ${inicio}, fecha_hora_fin = ${fin}, profesional_id = ${profesionalId}, capacidad = ${capacidad}
             WHERE id = ${id}`;
    // Si sube el aforo, entran las de la lista de espera.
    return capacidad > s.capacidad ? promocionarListaEspera(tx, id) : ([] as Promocion[]);
  });
  avisarPromociones(promos);
  return { ok: true };
});

/** Cancelar la clase (nunca se borra). Avisa a las afectadas. */
export const DELETE = ruta<CtxId>(async (req, ctx) => {
  await requerirAdmin(req);
  const id = await idDe(ctx);
  const r = await sql.begin((tx) => cancelarSesion(tx, id));
  avisarCancelacionClase(r.sesion, r.avisar);
  return { ok: true };
});
