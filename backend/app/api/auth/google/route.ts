// Entrar con Google. Si el email no existe, se crea la usuaria con el
// programa por defecto y sin plan, para que la profesora la gestione (§2.11).
import { crearSesion, respuestaLogin } from "@/server/auth";
import { sql } from "@/server/db";
import { cuerpo, ErrorHttp, ruta } from "@/server/http";
import { verificarIdTokenGoogle } from "@/server/google";
import { verUsuario } from "@/server/vistas";

export const POST = ruta(async (req) => {
  const idToken = String((await cuerpo(req)).idToken ?? "");
  if (!idToken) throw new ErrorHttp(400, "Falta el token de Google.");
  const g = await verificarIdTokenGoogle(idToken);
  const u = await sql.begin(async (tx) => {
    const [existe] = await tx<{ id: number; nombre: string; email: string; rol: string; programaId: number; eliminadaEn: Date | null }[]>`
      SELECT id, nombre, email, rol, programa_id, eliminada_en FROM usuarios WHERE email = ${g.email}`;
    if (existe) return existe;
    const [nuevo] = await tx<{ id: number; nombre: string; email: string; rol: string; programaId: number; eliminadaEn: Date | null }[]>`
      INSERT INTO usuarios (nombre, email, programa_id)
      VALUES (${g.nombre}, ${g.email}, (SELECT min(id) FROM programas))
      RETURNING id, nombre, email, rol, programa_id, eliminada_en`;
    return nuevo;
  });
  if (u.eliminadaEn) throw new ErrorHttp(403, "Esta cuenta fue eliminada.");
  return respuestaLogin(await crearSesion(u.id), await verUsuario(sql, u));
});
