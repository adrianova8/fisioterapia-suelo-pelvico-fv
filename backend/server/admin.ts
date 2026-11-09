// Ayudas comunes de las rutas de administración.
import type { Db } from "./db";
import { noEncontrado } from "./http";

export async function usuariaParaAdmin(db: Db, id: number) {
  const [u] = await db<{ id: number; nombre: string; email: string; rol: string; programaId: number; saldoCompensacion: number }[]>`
    SELECT id, nombre, email, rol, programa_id, saldo_compensacion FROM usuarios
    WHERE id = ${id} AND rol = 'USUARIO' AND eliminada_en IS NULL`;
  if (!u) throw noEncontrado("Usuaria no encontrada.");
  return u;
}

export async function apuntarHistorial(
  db: Db,
  h: { usuarioId: number; adminId: number; tipo: "ACTIVACION" | "PAUSA" | "REACTIVACION" | "CAMBIO_PROGRAMA" | "AJUSTE"; suscripcionId?: number | null; motivo?: string | null; antes?: unknown; despues?: unknown },
) {
  await db`INSERT INTO historial_suscripciones (usuario_id, suscripcion_id, admin_id, tipo, motivo, datos_anteriores, datos_nuevos)
           VALUES (${h.usuarioId}, ${h.suscripcionId ?? null}, ${h.adminId}, ${h.tipo}, ${h.motivo ?? null},
                   ${h.antes === undefined ? null : JSON.stringify(h.antes)}, ${h.despues === undefined ? null : JSON.stringify(h.despues)})`;
}
