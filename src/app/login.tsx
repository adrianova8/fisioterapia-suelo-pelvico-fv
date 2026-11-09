import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { BotonGoogle } from "@/components/boton-google";
import { IlustracionPortada } from "@/components/ilustracion";
import { Icono } from "@/components/iconos";
import { PIE_CLINICA } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Campo, Pantalla } from "@/components/ui";
import { colores, espacio, radios } from "@/constants/theme";
import { MODO_DEMO, mensajeError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useGoogle } from "@/lib/google";

export default function Login() {
  const router = useRouter();
  const { entrar, entrarConGoogle } = useAuth();
  const google = useGoogle();
  const [conGoogle, setConGoogle] = useState(false);
  // El dibujo va de borde a borde (la pantalla tiene 16 de margen a cada lado).
  const anchoDibujo = Math.min(useWindowDimensions().width, 560 + espacio.l * 2);
  const [modo, setModo] = useState<"portada" | "acceso">("portada");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onEntrar() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Escribe tu email y tu contraseña.");
      return;
    }
    setEnviando(true);
    try {
      await entrar(email, password);
      router.replace("/");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setConGoogle(true);
    try {
      const idToken = await google.pedir();
      if (!idToken) return; // canceló
      await entrarConGoogle(idToken);
      router.replace("/");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setConGoogle(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pantalla estilo={modo === "portada" ? { paddingTop: espacio.xl, paddingBottom: 0 } : { paddingTop: espacio.xl }}>
        <View style={est.marca}>
          <Icono nombre="corazon" color={colores.rosa} tam={34} />
          <Text style={est.titulo}>
            Mamá <Text style={est.en}>en</Text>
            {"\n"}movimiento
          </Text>
          <Text style={est.tagline}>Clases y apoyo para cada etapa{"\n"}de tu embarazo</Text>
        </View>

        {modo === "portada" ? (
          <>
            <View style={est.dibujo}>
              <IlustracionPortada ancho={anchoDibujo} />
            </View>
            <View style={est.panel}>
              <Boton titulo="Crear cuenta" onPress={() => router.push("/registro")} />
              <Boton titulo="Iniciar sesión" variante="secundario" onPress={() => setModo("acceso")} />
              <BotonGoogle onPress={onGoogle} cargando={conGoogle} />
              {error ? <CajaMensaje tipo="error" texto={error} /> : null}
              <Boton titulo="Continuar como invitada" variante="texto" onPress={() => router.push("/invitada")} />
              <Text style={[est.pie, { marginTop: espacio.s }]}>{PIE_CLINICA}</Text>
            </View>
          </>
        ) : (
          <View style={{ marginTop: espacio.xl }}>
            {error ? <CajaMensaje tipo="error" texto={error} /> : null}
            <Campo
              etiqueta="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="tu@email.com"
            />
            <Campo
              etiqueta="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="Tu contraseña"
              onSubmitEditing={onEntrar}
            />
            <Link href="/recuperar" asChild>
              <Pressable style={{ alignSelf: "flex-end", marginBottom: espacio.l }}>
                <Text style={est.enlace}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            </Link>
            <Boton titulo="Entrar" onPress={onEntrar} cargando={enviando} />
            <View style={est.separador}>
              <View style={est.linea} />
              <Text style={est.o}>o</Text>
              <View style={est.linea} />
            </View>
            <BotonGoogle onPress={onGoogle} cargando={conGoogle} />
            <Boton titulo="Volver" variante="texto" onPress={() => setModo("portada")} estilo={{ marginTop: espacio.s }} />
            {MODO_DEMO ? (
              <View style={{ marginTop: espacio.l }}>
                <CajaMensaje
                  texto={"Modo demostración. Prueba con:\n· Usuaria: laura@test.com / Password123\n· Profesora: admin@test.com / Admin12345"}
                />
              </View>
            ) : null}
          </View>
        )}

        {modo === "acceso" ? <Text style={est.pie}>{PIE_CLINICA}</Text> : null}
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

const est = StyleSheet.create({
  marca: { alignItems: "center", gap: espacio.s },
  // Título con letra serif y azul oscuro, como en MVP_0.png.
  titulo: {
    fontSize: 38,
    fontWeight: "600",
    color: "#22304A",
    textAlign: "center",
    lineHeight: 42,
    marginTop: espacio.xs,
    fontFamily: Platform.select({ ios: "Georgia", android: "serif", default: "Georgia, serif" }),
  },
  en: { fontSize: 24, fontWeight: "400" },
  tagline: { fontSize: 14, color: colores.textoSuave, textAlign: "center", lineHeight: 20 },
  // Ilustración a todo el ancho, pegada al panel blanco de los botones (como en MVP_0).
  dibujo: { marginHorizontal: -espacio.l, marginTop: espacio.l, alignItems: "center", overflow: "hidden" },
  panel: {
    marginHorizontal: -espacio.l,
    marginTop: -espacio.l,
    backgroundColor: colores.blanco,
    borderTopLeftRadius: radios.l,
    borderTopRightRadius: radios.l,
    paddingHorizontal: espacio.l,
    paddingTop: espacio.xl,
    paddingBottom: espacio.xxl * 2,
    gap: espacio.m,
  },
  separador: { flexDirection: "row", alignItems: "center", gap: espacio.m, marginVertical: espacio.l },
  linea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colores.borde },
  o: { color: colores.textoSuave, fontSize: 13 },
  enlace: { color: colores.burdeos, fontWeight: "600", fontSize: 14 },
  pie: { textAlign: "center", color: colores.morado, fontSize: 13, marginTop: espacio.xxl, fontWeight: "500" },
});
