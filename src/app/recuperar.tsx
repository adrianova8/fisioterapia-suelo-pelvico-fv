import { useState } from "react";
import { Text } from "react-native";

import { Boton, CajaMensaje, Cabecera, Campo, Pantalla } from "@/components/ui";
import { colores } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";

export default function Recuperar() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enlaceDev, setEnlaceDev] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onEnviar() {
    setError(null);
    if (!email.trim()) return setError("Escribe tu email.");
    setEnviando(true);
    try {
      const r = await api.post<{ ok: boolean; enlaceDev?: string }>("/api/auth/recuperar", { email: email.trim().toLowerCase() });
      setEnlaceDev(r.enlaceDev ?? null);
      setEnviado(true);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla>
      <Cabecera titulo="Recuperar contraseña" subtitulo="Te enviaremos un enlace a tu email" volver />
      {error ? <CajaMensaje tipo="error" texto={error} /> : null}
      {enviado ? (
        <>
          <CajaMensaje
            tipo="ok"
            texto="Si hay una cuenta con ese email, te hemos enviado un enlace para crear una contraseña nueva. Caduca en 1 hora."
          />
          {enlaceDev ? <Text selectable style={{ color: colores.textoSuave, fontSize: 12 }}>Enlace (desarrollo): {enlaceDev}</Text> : null}
        </>
      ) : (
        <>
          <Campo etiqueta="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="tu@email.com" />
          <Boton titulo="Enviar enlace" onPress={onEnviar} cargando={enviando} />
        </>
      )}
    </Pantalla>
  );
}
