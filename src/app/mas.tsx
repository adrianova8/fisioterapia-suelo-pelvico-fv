// Menú "Más": centro, equipo, tipos de clases, FAQ y legal.
// PENDIENTE (§14 Fase 1.4): datos reales del centro y textos legales.
import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { type NombreIcono } from "@/components/iconos";
import { Icono } from "@/components/iconos";
import { Avatar, CLINICA, Miniatura, PIE_CLINICA } from "@/components/usuaria-ui";
import { CajaMensaje, Cabecera, FilaMenu, Pantalla, T, Tarjeta } from "@/components/ui";
import { colores, espacio } from "@/constants/theme";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { confirmar } from "@/lib/dialogos";
import type { Info } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

const FAQ = [
  ["¿Cómo pago?", "En la clínica. Después, la profesora activa tu plan del mes y ya puedes reservar."],
  ["¿Qué pasa si un día no puedo ir a mi clase fija?", "Libera tu plaza desde la app con al menos 1 hora de antelación. Recuperas la sesión y puedes apuntarte otro día de esa semana."],
  ["¿Y si cancelo con menos de 1 hora?", "La sesión cuenta como usada y no puedes volver a reservar esa clase."],
  ["¿Se acumulan las clases que no uso?", "No. Cada semana (de lunes a domingo) tienes tus 1 o 2 clases; las que no uses se pierden."],
  ["¿Cuándo puedo reservar?", "Desde 3 días antes de la clase, a las 00:00."],
  ["¿Qué pasa cuando doy a luz?", "La profesora pausa tu plan y guarda las clases que ya pagaste. Cuando vuelvas, podrás usarlas en Postparto."],
];

const DESCRIPCIONES: Record<string, string> = {
  Embarazo: "Ejercicio terapéutico seguro durante el embarazo.",
  Postparto: "Recuperación del suelo pélvico y del abdomen tras el parto.",
  "+50": "Fuerza, movimiento y suelo pélvico a partir de los 50.",
};

export default function Mas() {
  const router = useRouter();
  const { salir } = useAuth();
  const { datos } = useDatos(() => api.get<Info>("/api/info"));
  const [abierta, setAbierta] = useState<string | null>(null);

  async function onSalir() {
    if (await confirmar("Cerrar sesión", "¿Quieres salir de tu cuenta en este dispositivo?", "Cerrar sesión", "Cancelar")) {
      await salir();
      router.replace("/login");
    }
  }

  const Seccion = ({ id, icono, titulo, subtitulo, children }: { id: string; icono: NombreIcono; titulo: string; subtitulo?: string; children: ReactNode }) => (
    <>
      <FilaMenu icono={icono} titulo={titulo} subtitulo={subtitulo} onPress={() => setAbierta(abierta === id ? null : id)} />
      {abierta === id ? <View style={{ paddingHorizontal: espacio.s, paddingBottom: espacio.m }}>{children}</View> : null}
    </>
  );

  return (
    <Pantalla>
      <Cabecera titulo="Más" volver />
      <Tarjeta estilo={{ paddingVertical: espacio.s }}>
        <Seccion id="centro" icono="ubicacion" titulo="Clínica Fátima Veiga" subtitulo="Dirección y contacto">
          <T>Fisioterapia de suelo pélvico · Santander</T>
          <Pressable onPress={() => void Linking.openURL(CLINICA.mapa)} style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m }}>
            <Icono nombre="ubicacion" tam={18} color={colores.burdeos} />
            <View style={{ flex: 1 }}>
              <T>{CLINICA.direccion}</T>
              <T variante="tenue">{CLINICA.localidad}</T>
              <Text style={{ color: colores.burdeos, fontWeight: "600", fontSize: 14, marginTop: 2 }}>Cómo llegar →</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(CLINICA.telefonoEnlace)} style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m, alignItems: "center" }}>
            <Icono nombre="telefono" tam={18} color={colores.burdeos} />
            <Text style={{ color: colores.burdeos, fontWeight: "600", fontSize: 15 }}>{CLINICA.telefono}</Text>
          </Pressable>
        </Seccion>
        <Seccion id="equipo" icono="equipo" titulo="Nuestro equipo" subtitulo="Conoce a nuestras profesionales">
          {(datos?.profesionales ?? []).map((p) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, marginBottom: espacio.s }}>
              <Avatar nombre={p.nombre} foto={p.foto} tam={44} />
              <T variante="fuerte" estilo={{ fontSize: 15 }}>{p.nombre}</T>
            </View>
          ))}
        </Seccion>
        <Seccion id="tipos" icono="clases" titulo="Tipos de clases" subtitulo="Embarazo, Postparto y +50">
          {(datos?.programas ?? []).map((p) => (
            <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: espacio.m, marginBottom: espacio.s }}>
              <Miniatura programa={p.nombre} imagen={p.imagen} tam={44} />
              <View style={{ flex: 1 }}>
                <T variante="fuerte" estilo={{ fontSize: 15 }}>{p.nombre}</T>
                <T variante="tenue">{DESCRIPCIONES[p.nombre] ?? ""}</T>
              </View>
            </View>
          ))}
        </Seccion>
        <Seccion id="faq" icono="pregunta" titulo="Preguntas frecuentes">
          {FAQ.map(([p, r]) => (
            <View key={p} style={{ marginBottom: espacio.m }}>
              <T variante="fuerte" estilo={{ fontSize: 14 }}>{p}</T>
              <T variante="tenue" estilo={{ fontSize: 14 }}>{r}</T>
            </View>
          ))}
        </Seccion>
        <Seccion id="terminos" icono="documento" titulo="Términos y condiciones">
          <CajaMensaje tipo="aviso" texto="Pendiente: texto legal definitivo de la clínica." />
        </Seccion>
        <Seccion id="privacidad" icono="candado" titulo="Política de privacidad">
          <CajaMensaje tipo="aviso" texto="Pendiente: política de privacidad (RGPD) definitiva. Puedes eliminar tu cuenta en cualquier momento desde tu perfil." />
        </Seccion>
        <FilaMenu icono="salir" titulo="Cerrar sesión" onPress={onSalir} />
      </Tarjeta>
      <T variante="tenue" estilo={{ textAlign: "center", color: colores.morado, marginTop: espacio.xl }}>{PIE_CLINICA}</T>
    </Pantalla>
  );
}
