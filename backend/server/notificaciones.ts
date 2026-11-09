// Avisos a las usuarias: push (Expo) + email. Se llaman DESPUÉS del COMMIT y
// nunca lanzan error (no pueden romper la operación que los provoca).
import { sql } from "./db";
import { enviarEmail } from "./email";
import { fechaLegible } from "./fechas";
import type { Promocion, SesionFila } from "./motor";

interface Mensaje {
  titulo: string;
  cuerpo: string;
  datos?: Record<string, unknown>;
}

export async function enviarPush(usuarioIds: number[], m: Mensaje): Promise<void> {
  if (!usuarioIds.length) return;
  try {
    const filas = await sql<{ token: string }[]>`SELECT token FROM push_tokens WHERE usuario_id IN ${sql(usuarioIds)}`;
    const tokens = filas.map((f) => f.token).filter((t) => t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken"));
    for (let i = 0; i < tokens.length; i += 100) {
      const lote = tokens.slice(i, i + 100);
      const r = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(lote.map((to) => ({ to, title: m.titulo, body: m.cuerpo, data: m.datos ?? {}, sound: "default" }))),
      });
      const json = (await r.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
      // Tokens de móviles que ya no existen: se borran.
      const muertos = (json?.data ?? []).map((d, j) => (d.details?.error === "DeviceNotRegistered" ? lote[j] : null)).filter(Boolean) as string[];
      if (muertos.length) await sql`DELETE FROM push_tokens WHERE token IN ${sql(muertos)}`;
    }
  } catch (e) {
    console.error("[push] No se pudo enviar", e);
  }
}

async function emailsDe(usuarioIds: number[]) {
  if (!usuarioIds.length) return [];
  return sql<{ id: number; nombre: string; email: string }[]>`
    SELECT id, nombre, email FROM usuarios WHERE id IN ${sql(usuarioIds)} AND eliminada_en IS NULL`;
}

/** Push + email a varias usuarias. */
export async function notificar(usuarioIds: number[], m: Mensaje & { asuntoEmail?: string }): Promise<void> {
  try {
    await enviarPush(usuarioIds, m);
    for (const u of await emailsDe(usuarioIds)) {
      await enviarEmail(u.email, m.asuntoEmail ?? m.titulo, `Hola, ${u.nombre.split(" ")[0]}:\n\n${m.cuerpo}`);
    }
  } catch (e) {
    console.error("[notificar]", e);
  }
}

export function avisarPromociones(promos: Promocion[]) {
  for (const p of promos) {
    void notificar([p.usuarioId], {
      titulo: "¡Tienes plaza!",
      cuerpo: `Se ha liberado una plaza y ya está reservada para ti: ${p.sesion.programa}, ${fechaLegible(p.sesion.fechaHoraInicio)}. Si no puedes ir, libérala desde la app.`,
      asuntoEmail: "¡Tienes plaza en tu clase!",
      datos: { tipo: "promocion", sesionId: p.sesion.id },
    });
  }
}

export function avisarCancelacionClase(sesion: SesionFila, usuarioIds: number[]) {
  void notificar(usuarioIds, {
    titulo: "Clase cancelada",
    cuerpo: `El centro ha cancelado la clase de ${sesion.programa} del ${fechaLegible(sesion.fechaHoraInicio)}. Recuperas la sesión para otro día de esa semana.`,
    asuntoEmail: "Se ha cancelado una de tus clases",
    datos: { tipo: "cancelacion", sesionId: sesion.id },
  });
}
