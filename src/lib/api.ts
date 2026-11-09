// Cliente de la API del backend (`fv`). Envía el token como Bearer,
// guarda copia sin conexión de las consultas de la usuaria y, si no hay
// EXPO_PUBLIC_API_URL (o vale "demo"), usa el modo demostración local.
import { useSyncExternalStore } from "react";

import { guardarCopia, leerCopia, sePuedeGuardar } from "./copiaOffline";
import { peticionDemo } from "./demo";
import { leerToken } from "./token";

const URL_ENV = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
export const MODO_DEMO = URL_ENV === "" || URL_ENV.toLowerCase() === "demo";
export const API_URL = MODO_DEMO ? "" : URL_ENV;

export const MENSAJE_SIN_CONEXION =
  "No hay conexión a internet. Para reservar, cancelar o liberar una plaza necesitas estar conectada.";

export class ErrorApi extends Error {
  status: number;
  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

// --- Estado "sin conexión" (para la franja de aviso) ---
let sinConexion = false;
const oyentes = new Set<() => void>();
function marcarSinConexion(valor: boolean) {
  if (sinConexion === valor) return;
  sinConexion = valor;
  oyentes.forEach((o) => o());
}
export function useSinConexion() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => sinConexion,
    () => false,
  );
}

/** Convierte una ruta relativa de imagen de la API en URL completa. */
export function urlCompleta(ruta?: string | null): string | null {
  if (!ruta) return null;
  if (/^(https?:|data:|file:)/.test(ruta)) return ruta;
  return MODO_DEMO ? null : API_URL + ruta;
}

type Metodo = "GET" | "POST" | "PATCH" | "DELETE";

async function peticion<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = await leerToken();

  if (MODO_DEMO) {
    const r = await peticionDemo(metodo, ruta, cuerpo, token);
    if (r.status >= 400) throw new ErrorApi((r.datos as { error?: string })?.error ?? "Error", r.status);
    return r.datos as T;
  }

  let res: Response;
  try {
    res = await fetch(API_URL + ruta, {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    // Sin red: en consultas devolvemos la copia guardada, si la hay.
    if (metodo === "GET" && sePuedeGuardar(ruta)) {
      const copia = await leerCopia<T>(ruta);
      if (copia !== null) {
        marcarSinConexion(true);
        return copia;
      }
    }
    marcarSinConexion(true);
    throw new ErrorApi(MENSAJE_SIN_CONEXION, 0);
  }

  marcarSinConexion(false);
  let datos: unknown = null;
  const texto = await res.text();
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }
  if (!res.ok) {
    const msg =
      (datos as { error?: string; mensaje?: string } | null)?.error ??
      (datos as { mensaje?: string } | null)?.mensaje ??
      (res.status === 429
        ? "Demasiados intentos. Espera unos minutos y vuelve a probar."
        : "Algo no ha ido bien. Inténtalo de nuevo.");
    throw new ErrorApi(msg, res.status);
  }
  if (metodo === "GET" && sePuedeGuardar(ruta)) void guardarCopia(ruta, datos);
  return datos as T;
}

/** Subida multipart (fotos). Campo `imagen`. */
async function subir<T>(ruta: string, uri: string, tipoMime = "image/jpeg"): Promise<T> {
  if (MODO_DEMO) throw new ErrorApi("En el modo demostración no se pueden subir fotos.", 400);
  const token = await leerToken();
  const form = new FormData();
  if (uri.startsWith("blob:") || uri.startsWith("data:")) {
    const blob = await (await fetch(uri)).blob();
    form.append("imagen", blob, "imagen");
  } else {
    // React Native acepta este objeto como fichero.
    form.append("imagen", { uri, name: "imagen.jpg", type: tipoMime } as unknown as Blob);
  }
  let res: Response;
  try {
    res = await fetch(API_URL + ruta, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  } catch {
    throw new ErrorApi(MENSAJE_SIN_CONEXION, 0);
  }
  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new ErrorApi((datos as { error?: string } | null)?.error ?? "No se pudo subir la imagen.", res.status);
  return datos as T;
}

export const api = {
  get: <T>(ruta: string) => peticion<T>("GET", ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("POST", ruta, cuerpo ?? {}),
  patch: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("PATCH", ruta, cuerpo ?? {}),
  delete: <T>(ruta: string, cuerpo?: unknown) => peticion<T>("DELETE", ruta, cuerpo),
  subir,
};

export function mensajeError(e: unknown): string {
  if (e instanceof ErrorApi) return e.message;
  return "Algo no ha ido bien. Inténtalo de nuevo.";
}
