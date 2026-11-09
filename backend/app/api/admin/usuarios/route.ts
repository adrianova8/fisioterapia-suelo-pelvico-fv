import { requerirAdmin } from "@/server/auth";
import { sql } from "@/server/db";
import { ruta } from "@/server/http";
import { mensualidadDelMes } from "@/server/motor";
import { verMensualidad, verUsuario } from "@/server/vistas";

export const GET = ruta(async (req) => {
  await requerirAdmin(req);
  const filas = await sql<{ id: number; nombre: string; email: string; rol: string; programaId: number; saldoCompensacion: number }[]>`
    SELECT id, nombre, email, rol, programa_id, saldo_compensacion FROM usuarios
    WHERE rol = 'USUARIO' AND eliminada_en IS NULL ORDER BY nombre`;
  const ahora = new Date();
  return Promise.all(
    filas.map(async (u) => ({
      ...(await verUsuario(sql, u)),
      mensualidadActual: verMensualidad(await mensualidadDelMes(sql, u.id, ahora)),
      saldoCompensacion: u.saldoCompensacion,
    })),
  );
});
