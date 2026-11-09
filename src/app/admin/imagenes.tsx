// Fotos de las profesionales e imágenes de los programas.
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Platform, View } from "react-native";

import { Avatar, Miniatura } from "@/components/usuaria-ui";
import { Boton, CajaMensaje, Cabecera, Cargando, Pantalla, T, Tarjeta } from "@/components/ui";
import { espacio } from "@/constants/theme";
import { api, mensajeError } from "@/lib/api";
import { alerta, confirmar } from "@/lib/dialogos";
import type { Info } from "@/lib/tipos";
import { useDatos } from "@/lib/useDatos";

type Tipo = "profesional" | "programa";

export default function Imagenes() {
  const { datos, cargando, error, recargar } = useDatos(() => api.get<Info>("/api/info"));
  const [subiendo, setSubiendo] = useState<string | null>(null);

  async function elegir(tipo: Tipo, id: number, origen: "galeria" | "camara") {
    const opciones: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 };
    let r: ImagePicker.ImagePickerResult;
    if (origen === "camara") {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) return alerta("Sin permiso", "Activa el permiso de cámara en los ajustes del móvil.");
      r = await ImagePicker.launchCameraAsync(opciones);
    } else {
      r = await ImagePicker.launchImageLibraryAsync(opciones);
    }
    if (r.canceled || !r.assets[0]) return;
    setSubiendo(`${tipo}-${id}`);
    try {
      await api.subir(`/api/admin/imagenes/${tipo}/${id}`, r.assets[0].uri, r.assets[0].mimeType ?? "image/jpeg");
      await recargar();
    } catch (e) {
      alerta("No se ha podido subir", mensajeError(e));
    } finally {
      setSubiendo(null);
    }
  }

  async function quitar(tipo: Tipo, id: number) {
    if (!(await confirmar("Quitar imagen", "Se mostrará la inicial o el icono estándar en su lugar.", "Quitar", "Cancelar", true))) return;
    setSubiendo(`${tipo}-${id}`);
    try {
      await api.delete(`/api/admin/imagenes/${tipo}/${id}`);
      await recargar();
    } catch (e) {
      alerta("No se ha podido quitar", mensajeError(e));
    } finally {
      setSubiendo(null);
    }
  }

  const Acciones = ({ tipo, id, tiene }: { tipo: Tipo; id: number; tiene: boolean }) => (
    <View style={{ flexDirection: "row", gap: espacio.s, marginTop: espacio.m, flexWrap: "wrap" }}>
      <Boton titulo="Galería" icono="foto" variante="suave" pequeno cargando={subiendo === `${tipo}-${id}`} onPress={() => elegir(tipo, id, "galeria")} />
      {Platform.OS !== "web" ? <Boton titulo="Cámara" icono="camara" variante="suave" pequeno onPress={() => elegir(tipo, id, "camara")} /> : null}
      {tiene ? <Boton titulo="Quitar" variante="texto" pequeno onPress={() => quitar(tipo, id)} /> : null}
    </View>
  );

  return (
    <Pantalla>
      <Cabecera titulo="Fotos e imágenes" subtitulo="Se recortan cuadradas automáticamente" volver />
      {cargando && !datos ? <Cargando /> : null}
      {error && !datos ? <CajaMensaje tipo="error" texto={error} /> : null}
      {datos ? (
        <>
          <T variante="seccion">Profesionales</T>
          {datos.profesionales.map((p) => (
            <Tarjeta key={p.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
                <Avatar nombre={p.nombre} foto={p.foto} tam={64} />
                <T variante="fuerte">{p.nombre}</T>
              </View>
              <Acciones tipo="profesional" id={p.id} tiene={!!p.foto} />
            </Tarjeta>
          ))}
          <T variante="seccion">Programas</T>
          {datos.programas.map((p) => (
            <Tarjeta key={p.id}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: espacio.m }}>
                <Miniatura programa={p.nombre} imagen={p.imagen} tam={64} />
                <T variante="fuerte">{p.nombre}</T>
              </View>
              <Acciones tipo="programa" id={p.id} tiene={!!p.imagen} />
            </Tarjeta>
          ))}
        </>
      ) : null}
    </Pantalla>
  );
}
