// Contraseñas con scrypt (sal aleatoria). Formato guardado: "sal:hash".
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (p: string, s: string, n: number) => Promise<Buffer>;

export async function hashPassword(password: string): Promise<string> {
  const sal = randomBytes(16).toString("hex");
  const h = await scryptAsync(password, sal, 64);
  return `${sal}:${h.toString("hex")}`;
}

export async function comprobarPassword(password: string, guardado: string): Promise<boolean> {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const h = await scryptAsync(password, sal, esperado.length);
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}

export const PASSWORD_MINIMA = 8;
