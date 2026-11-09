// CORS para /api/* SOLO en desarrollo: la app Expo en el navegador va desde
// otro puerto (8081). En producción la app nativa no necesita CORS.
import { NextResponse, type NextRequest } from "next/server";

const CABECERAS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.next();
  if (request.method === "OPTIONS") return new NextResponse(null, { status: 204, headers: CABECERAS });
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(CABECERAS)) res.headers.set(k, v);
  return res;
}

export const config = { matcher: "/api/:path*" };
