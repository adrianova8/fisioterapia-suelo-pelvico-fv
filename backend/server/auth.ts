// Sesiones propias: token aleatorio que la app guarda y manda como
// "Authorization: Bearer <token>" (o cookie session_token en navegador).
// En la base solo se guarda el hash SHA-256 del token.
import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { sql } from "./db";
import { ErrorHttp } from "./http";

const DIAS_SESION = 30;

export interface UsuarioActual {
  id: number;
  nombre: string;
  email: string;
  rol: "USUARIO" | "ADMIN";
  programaId: number;
  saldoCompensacion: number;
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function crearSesion(usuarioId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + DIAS_SESION * 24 * 3600_000);
  await sql`INSERT INTO sesiones_auth (usuario_id, token_hash, fecha_expiracion) VALUES (${usuarioId}, ${hashToken(token)}, ${expira})`;
  return token;
}

export function tokenDe(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7).trim() || null;
  return req.cookies.get("session_token")?.value ?? null;
}

export async function usuarioActual(req: NextRequest): Promise<UsuarioActual | null> {
  const token = tokenDe(req);
  if (!token) return null;
  const [u] = await sql<UsuarioActual[]>`
    SELECT u.id, u.nombre, u.email, u.rol, u.programa_id, u.saldo_compensacion
    FROM sesiones_auth s JOIN usuarios u ON u.id = s.usuario_id
    WHERE s.token_hash = ${hashToken(token)} AND s.fecha_expiracion > now() AND u.eliminada_en IS NULL`;
  return u ?? null;
}

export async function requerirUsuario(req: NextRequest): Promise<UsuarioActual> {
  const u = await usuarioActual(req);
  if (!u) throw new ErrorHttp(401, "Tu sesión ha caducado. Vuelve a entrar.");
  return u;
}

/** Solo clientas (la profesora no reserva clases). */
export async function requerirUsuaria(req: NextRequest): Promise<UsuarioActual> {
  const u = await requerirUsuario(req);
  if (u.rol !== "USUARIO") throw new ErrorHttp(403, "Esta parte es solo para clientas.");
  return u;
}

export async function requerirAdmin(req: NextRequest): Promise<UsuarioActual> {
  const u = await requerirUsuario(req);
  if (u.rol !== "ADMIN") throw new ErrorHttp(403, "No tienes permiso.");
  return u;
}

export async function cerrarSesion(req: NextRequest) {
  const token = tokenDe(req);
  if (token) await sql`DELETE FROM sesiones_auth WHERE token_hash = ${hashToken(token)}`;
}

/** Respuesta de login: token en JSON (app) y en cookie httpOnly (navegador). */
export function respuestaLogin(token: string, usuario: unknown): Response {
  const res = Response.json({ token, usuario });
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS_SESION * 86400}${seguro}`,
  );
  return res;
}
