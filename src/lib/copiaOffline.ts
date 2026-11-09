// Copia sin conexión de las consultas de la usuaria.
// Móvil: ficheros JSON (expo-file-system). Web: localStorage.
// Nunca se guarda nada de /api/admin ni /api/auth.
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const PREFIJO = "copia_";
const RUTAS_GUARDABLES = ["/api/me", "/api/reservas", "/api/sesiones", "/api/info", "/api/programas"];

export function sePuedeGuardar(ruta: string): boolean {
  if (ruta.startsWith("/api/admin") || ruta.startsWith("/api/auth")) return false;
  return RUTAS_GUARDABLES.some((r) => ruta === r || ruta.startsWith(r + "?") || ruta.startsWith(r + "/"));
}

function nombre(ruta: string) {
  return PREFIJO + ruta.replace(/[^a-zA-Z0-9]/g, "_") + ".json";
}

function carpeta() {
  return new Directory(Paths.document, "copia_offline");
}

export async function guardarCopia(ruta: string, datos: unknown): Promise<void> {
  try {
    const texto = JSON.stringify(datos);
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(nombre(ruta), texto);
      return;
    }
    const dir = carpeta();
    if (!dir.exists) dir.create({ intermediates: true });
    const f = new File(dir, nombre(ruta));
    if (f.exists) f.delete();
    f.create();
    f.write(texto);
  } catch {
    // La copia es una ayuda: si falla, no rompe nada.
  }
}

export async function leerCopia<T>(ruta: string): Promise<T | null> {
  try {
    if (Platform.OS === "web") {
      const t = globalThis.localStorage?.getItem(nombre(ruta));
      return t ? (JSON.parse(t) as T) : null;
    }
    const f = new File(carpeta(), nombre(ruta));
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

export async function borrarCopias(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      const ls = globalThis.localStorage;
      if (!ls) return;
      const claves: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k?.startsWith(PREFIJO)) claves.push(k);
      }
      claves.forEach((k) => ls.removeItem(k));
      return;
    }
    const dir = carpeta();
    if (dir.exists) dir.delete();
  } catch {}
}
