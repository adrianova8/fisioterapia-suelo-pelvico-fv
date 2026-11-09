import { Redirect } from "expo-router";

import { useAuth } from "@/lib/auth";

export default function Index() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.rol === "ADMIN") return <Redirect href="/admin" />;
  return <Redirect href="/inicio" />;
}
