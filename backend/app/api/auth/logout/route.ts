import { cerrarSesion } from "@/server/auth";
import { ruta } from "@/server/http";

export const POST = ruta(async (req) => {
  await cerrarSesion(req);
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", "session_token=; Path=/; HttpOnly; Max-Age=0");
  return res;
});
