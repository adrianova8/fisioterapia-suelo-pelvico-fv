import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { Boton, CajaMensaje, Cabecera, Campo, Chips, Pantalla, T } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Programa } from "@/lib/tipos";

export default function Registro() {
  const router = useRouter();
  const { registrar } = useAuth();
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [programaId, setProgramaId] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api
      .get<Programa[]>("/api/programas")
      .then((p) => {
        setProgramas(p);
        if (p[0]) setProgramaId(p[0].id);
      })
      .catch((e) => setError(mensajeError(e)));
  }, []);

  async function onCrear() {
    setError(null);
    if (!nombre.trim() || !email.trim()) return setError("Escribe tu nombre y tu email.");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (!programaId) return setError("Elige tu programa.");
    setEnviando(true);
    try {
      await registrar({ nombre: nombre.trim(), email, password, programaId });
      router.replace("/");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pantalla>
        <Cabecera titulo="Crear cuenta" subtitulo="Te damos la bienvenida a Mamá en movimiento" volver />
        {error ? <CajaMensaje tipo="error" texto={error} /> : null}
        <Campo etiqueta="Nombre y apellidos" value={nombre} onChangeText={setNombre} autoComplete="name" placeholder="Laura Martínez" />
        <Campo etiqueta="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="tu@email.com" />
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <T variante="seccion">¿En qué etapa estás?</T>
        <Chips opciones={programas.map((p) => ({ valor: p.id, texto: p.nombre }))} valor={programaId} onCambio={setProgramaId} />
        <View style={{ height: espacio.xl }} />
        <CajaMensaje texto="Las clases se pagan en la clínica. Cuando pagues, la profesora activará tu plan y podrás reservar." />
        <Boton titulo="Crear cuenta" onPress={onCrear} cargando={enviando} />
      </Pantalla>
    </KeyboardAvoidingView>
  );
}
