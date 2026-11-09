// Verifica un id_token de Google con el servicio oficial de Google
// y comprueba que es para alguno de nuestros client IDs (GOOGLE_CLIENT_IDS).
import { ErrorHttp } from "./http";

export interface IdentidadGoogle {
  email: string;
  nombre: string;
}

export async function verificarIdTokenGoogle(idToken: string): Promise<IdentidadGoogle> {
  const permitidos = (process.env.GOOGLE_CLIENT_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!permitidos.length) throw new ErrorHttp(503, "Entrar con Google aún no está configurado en el servidor.");
  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!r.ok) throw new ErrorHttp(401, "Google no ha validado tu cuenta. Inténtalo de nuevo.");
  const t = (await r.json()) as { aud?: string; email?: string; email_verified?: string | boolean; name?: string; exp?: string; iss?: string };
  const verificado = t.email_verified === true || t.email_verified === "true";
  const emisorOk = t.iss === "accounts.google.com" || t.iss === "https://accounts.google.com";
  if (!t.aud || !permitidos.includes(t.aud) || !emisorOk || !t.email || !verificado || Number(t.exp) * 1000 < Date.now()) {
    throw new ErrorHttp(401, "No se ha podido verificar tu cuenta de Google.");
  }
  return { email: t.email.toLowerCase(), nombre: t.name?.trim() || t.email.split("@")[0] };
}
