// Utilidades para las rutas de la API: errores con código HTTP y respuestas JSON.
import type { NextRequest } from "next/server";

export class ErrorHttp extends Error {
  constructor(
    public status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export const noEncontrado = (que = "No encontrado.") => new ErrorHttp(404, que);
export const peticionMala = (msg: string) => new ErrorHttp(400, msg);

/** Envuelve un manejador: lo que devuelva se manda como JSON; los ErrorHttp, con su código. */
export function ruta<C = unknown>(fn: (req: NextRequest, ctx: C) => Promise<unknown>) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      const r = await fn(req, ctx);
      return r instanceof Response ? r : Response.json(r ?? { ok: true });
    } catch (e) {
      if (e instanceof ErrorHttp) return Response.json({ error: e.message }, { status: e.status });
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return Response.json({ error: "Error interno del servidor. Inténtalo de nuevo." }, { status: 500 });
    }
  };
}

/** Cuerpo JSON de la petición (objeto vacío si no hay o no es válido). */
export async function cuerpo(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Entero positivo obligatorio. */
export function entero(v: unknown, campo: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw peticionMala(`Falta o no es válido: ${campo}.`);
  return n;
}

export type CtxId = { params: Promise<{ id: string }> };
export async function idDe(ctx: CtxId): Promise<number> {
  return entero((await ctx.params).id, "id");
}
