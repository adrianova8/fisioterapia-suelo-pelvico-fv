// RECORDATORIOS DE CLASE (push + email), la víspera.
// Lo llama una tarea programada (Vercel Cron, ver vercel.json) cada día a las
// 18:00 (hora de Madrid en invierno; 19:00 en verano): avisa de todas las
// clases de MAÑANA a quien tenga plaza confirmada. Cada clase se avisa una vez.
// Protegido con CRON_SECRET (Vercel lo manda como "Authorization: Bearer ...").
// Prueba manual en desarrollo:
//   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/recordatorios
import type { NextRequest } from "next/server";

import { sql } from "@/server/db";
import { horaLegible } from "@/server/fechas";
import { ErrorHttp, ruta } from "@/server/http";
import { notificar } from "@/server/notificaciones";

export const GET = ruta(async (req: NextRequest) => {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) throw new ErrorHttp(401, "No autorizado.");

  const hoy = new Date();
  const manana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const pasado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 2);

  // Se marcan como enviadas dentro de la transacción (SKIP LOCKED evita duplicados
  // si la tarea se lanza dos veces a la vez) y se avisa después del COMMIT.
  const avisos = await sql.begin(async (tx) => {
    const sesiones = await tx<{ id: number; programa: string; profesional: string; sala: string; inicio: Date }[]>`
      SELECT s.id, p.nombre AS programa, pr.nombre AS profesional, sa.nombre AS sala, s.fecha_hora_inicio AS inicio
      FROM sesiones s
      JOIN programas p ON p.id = s.programa_id
      JOIN profesionales pr ON pr.id = s.profesional_id
      JOIN salas sa ON sa.id = s.sala_id
      WHERE s.estado = 'ACTIVA' AND NOT s.recordatorio_enviado
        AND s.fecha_hora_inicio >= ${manana} AND s.fecha_hora_inicio < ${pasado}
      FOR UPDATE OF s SKIP LOCKED`;
    const lista: { usuarioIds: number[]; s: (typeof sesiones)[number] }[] = [];
    for (const s of sesiones) {
      const filas = await tx<{ usuarioId: number }[]>`
        SELECT r.usuario_id FROM reservas r JOIN usuarios u ON u.id = r.usuario_id
        WHERE r.sesion_id = ${s.id} AND r.estado = 'CONFIRMADA' AND u.recordatorios AND u.eliminada_en IS NULL`;
      await tx`UPDATE sesiones SET recordatorio_enviado = TRUE WHERE id = ${s.id}`;
      if (filas.length) lista.push({ usuarioIds: filas.map((f) => f.usuarioId), s });
    }
    return lista;
  });

  let personas = 0;
  for (const { usuarioIds, s } of avisos) {
    personas += usuarioIds.length;
    await notificar(usuarioIds, {
      titulo: `Mañana: ${s.programa} a las ${horaLegible(s.inicio)}`,
      cuerpo: `Te recordamos tu clase de ${s.programa} mañana a las ${horaLegible(s.inicio)} con ${s.profesional} (${s.sala}). Si no puedes venir, libera tu plaza desde la app con al menos 1 hora de antelación y recuperarás la sesión.`,
      asuntoEmail: `Recordatorio: mañana tienes ${s.programa} a las ${horaLegible(s.inicio)}`,
      datos: { tipo: "recordatorio", sesionId: s.id },
    });
  }
  return { ok: true, clases: avisos.length, personas };
});
