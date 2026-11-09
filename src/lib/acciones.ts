// Acciones de reserva compartidas por varias pantallas.
import type { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;

import { api } from "./api";

export async function reservar(router: Router, sesionId: number) {
  const r = await api.post<{ ok: boolean; origen?: "SEMANAL" | "COMPENSACION" }>("/api/reservas", { sesionId });
  router.push({ pathname: "/clase/confirmada", params: { id: String(sesionId), origen: r.origen ?? "SEMANAL" } });
}

export async function unirseLista(router: Router, sesionId: number) {
  const r = await api.post<{ ok: boolean; posicion?: number }>("/api/lista-espera", { sesionId });
  router.push({ pathname: "/clase/lista-espera", params: { id: String(sesionId), posicion: String(r.posicion ?? "") } });
}
