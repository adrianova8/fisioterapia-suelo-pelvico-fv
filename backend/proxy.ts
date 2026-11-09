// CORS para /api/*: qué webs pueden llamar a la API desde el navegador.
// - Desarrollo: cualquiera (la app Expo en el navegador va desde :8081).
// - Producción: solo las de CORS_ORIGENES (separadas por comas), p. ej. la web
//   de la app en Vercel. La app nativa (Android/iPhone) no necesita CORS.
import { NextResponse, type NextRequest } from "next/server";

const BASE = {
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

function origenPermitido(origen: string | null): string | null {
  if (!origen) return null;
  if (process.env.NODE_ENV !== "production") return origen;
  const lista = (process.env.CORS_ORIGENES ?? "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);
  return lista.includes(origen) ? origen : null;
}

export function proxy(request: NextRequest) {
  const origen = origenPermitido(request.headers.get("origin"));
  const cabeceras: Record<string, string> = origen ? { ...BASE, "Access-Control-Allow-Origin": origen } : { Vary: "Origin" };
  if (request.method === "OPTIONS") return new NextResponse(null, { status: origen ? 204 : 403, headers: cabeceras });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(cabeceras)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
