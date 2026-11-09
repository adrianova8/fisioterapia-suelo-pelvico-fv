// Contexto de sesión: quién ha entrado y con qué rol.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ErrorApi } from "./api";
import { borrarCopias } from "./copiaOffline";
import { registrarPush } from "./notificaciones";
import type { Me, Usuario } from "./tipos";
import { borrarToken, guardarToken, leerToken } from "./token";

interface ContextoAuth {
  cargando: boolean;
  usuario: Usuario | null;
  entrar: (email: string, password: string) => Promise<void>;
  registrar: (datos: { nombre: string; email: string; password: string; programaId: number }) => Promise<void>;
  entrarConToken: (token: string) => Promise<void>;
  salir: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<ContextoAuth | null>(null);

interface RespuestaLogin {
  token: string;
  usuario?: Usuario;
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const cargarYo = useCallback(async () => {
    const token = await leerToken();
    if (!token) {
      setUsuario(null);
      return;
    }
    try {
      const me = await api.get<Me>("/api/me");
      setUsuario(me.usuario);
    } catch (e) {
      if (e instanceof ErrorApi && e.status === 401) {
        await borrarToken();
        await borrarCopias();
        setUsuario(null);
      }
      // Sin conexión y sin copia: dejamos la sesión como estaba.
    }
  }, []);

  useEffect(() => {
    void cargarYo().finally(() => setCargando(false));
  }, [cargarYo]);

  const entrarConToken = useCallback(
    async (token: string) => {
      await borrarCopias();
      await guardarToken(token);
      await cargarYo();
      void registrarPush();
    },
    [cargarYo],
  );

  const entrar = useCallback(
    async (email: string, password: string) => {
      const r = await api.post<RespuestaLogin>("/api/auth/login", { email: email.trim().toLowerCase(), password });
      await entrarConToken(r.token);
    },
    [entrarConToken],
  );

  const registrar = useCallback(
    async (datos: { nombre: string; email: string; password: string; programaId: number }) => {
      const r = await api.post<RespuestaLogin>("/api/auth/registro", {
        ...datos,
        email: datos.email.trim().toLowerCase(),
      });
      await entrarConToken(r.token);
    },
    [entrarConToken],
  );

  const salir = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    await borrarToken();
    await borrarCopias();
    setUsuario(null);
  }, []);

  return (
    <Ctx.Provider value={{ cargando, usuario, entrar, registrar, entrarConToken, salir, refrescar: cargarYo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): ContextoAuth {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fuera de ProveedorAuth");
  return c;
}
