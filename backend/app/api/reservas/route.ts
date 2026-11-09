import { requerirUsuaria } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, entero, ruta } from "@/server/http";
import { cancelarReserva, reservar } from "@/server/motor";
import { avisarPromociones } from "@/server/notificaciones";
import { urlImagen } from "@/server/vistas";

/** Mis reservas (todas: próximas e historial). */
export const GET = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  const filas = await sql<{
    id: number; estado: string; origen: string; fija: boolean; fechaReserva: Date; fechaCancelacion: Date | null;
    sesionId: number; programaId: number; programa: string; programaImagenAct: Date | null;
    profesionalId: number; profesional: string; profesionalFotoAct: Date | null; sala: string;
    fechaHoraInicio: Date; fechaHoraFin: Date; sesionEstado: "ACTIVA" | "CANCELADA";
  }[]>`
    SELECT r.id, r.estado, r.origen, (r.asignacion_fija_id IS NOT NULL) AS fija, r.fecha_reserva, r.fecha_cancelacion,
           s.id AS sesion_id, s.programa_id, p.nombre AS programa, p.imagen_actualizada AS programa_imagen_act,
           s.profesional_id, pr.nombre AS profesional, pr.foto_actualizada AS profesional_foto_act, sa.nombre AS sala,
           s.fecha_hora_inicio, s.fecha_hora_fin, s.estado AS sesion_estado
    FROM reservas r
    JOIN sesiones s ON s.id = r.sesion_id
    JOIN programas p ON p.id = s.programa_id
    JOIN profesionales pr ON pr.id = s.profesional_id
    JOIN salas sa ON sa.id = s.sala_id
    WHERE r.usuario_id = ${u.id}
    ORDER BY s.fecha_hora_inicio`;
  return filas.map((r) => ({
    id: r.id,
    estado: r.estado,
    origen: r.origen,
    fija: r.fija,
    fechaReserva: r.fechaReserva.toISOString(),
    fechaCancelacion: r.fechaCancelacion?.toISOString() ?? null,
    sesion: {
      id: r.sesionId,
      programa: r.programa,
      programaImagen: urlImagen("programa", r.programaId, r.programaImagenAct),
      profesional: r.profesional,
      profesionalFoto: urlImagen("profesional", r.profesionalId, r.profesionalFotoAct),
      sala: r.sala,
      fechaHoraInicio: r.fechaHoraInicio.toISOString(),
      fechaHoraFin: r.fechaHoraFin.toISOString(),
      estado: r.sesionEstado,
    },
  }));
});

/** Reservar: { sesionId } */
export const POST = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  const sesionId = entero((await cuerpo(req)).sesionId, "sesionId");
  const r = await sql.begin((tx) => reservar(tx, u.id, sesionId));
  return { ok: true, ...r };
});

/** Cancelar / liberar plaza: { reservaId } */
export const PATCH = ruta(async (req) => {
  const u = await requerirUsuaria(req);
  const reservaId = entero((await cuerpo(req)).reservaId, "reservaId");
  const r = await sql.begin((tx) => cancelarReserva(tx, u.id, reservaId));
  avisarPromociones(r.promociones);
  return { ok: true, recuperaSesion: r.recuperaSesion };
});
