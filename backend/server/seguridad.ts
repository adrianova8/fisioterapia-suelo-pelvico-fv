// Límites anti-abuso (guardados en la base para funcionar en serverless).
import { sql } from "./db";
import { ErrorHttp } from "./http";

const MAX_FALLOS = 5;
const VENTANA_MIN = 15;

export async function comprobarLimiteLogin(email: string) {
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM intentos_login
    WHERE email = ${email} AND fecha > now() - make_interval(mins => ${VENTANA_MIN})`;
  if (n >= MAX_FALLOS) {
    throw new ErrorHttp(429, `Demasiados intentos fallidos. Espera ${VENTANA_MIN} minutos y vuelve a probar.`);
  }
}

export async function registrarFallo(email: string) {
  await sql`INSERT INTO intentos_login (email) VALUES (${email})`;
}

export async function limpiarFallos(email: string) {
  await sql`DELETE FROM intentos_login WHERE email = ${email}`;
}

/** Máximo 3 enlaces de recuperación por hora y usuaria. */
export async function puedeRecuperar(usuarioId: number): Promise<boolean> {
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM tokens_recuperacion
    WHERE usuario_id = ${usuarioId} AND fecha_creacion > now() - interval '1 hour'`;
  return n < 3;
}
