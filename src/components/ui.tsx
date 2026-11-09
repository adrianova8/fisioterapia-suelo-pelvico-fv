// Piezas de interfaz comunes (look&feel del MVP).
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colores, espacio, radios, sombra } from "@/constants/theme";

import { AvisoDemo, AvisoSinConexion } from "./aviso-sin-conexion";
import { Icono, type NombreIcono } from "./iconos";

export function Pantalla({
  children,
  scroll = true,
  onRefrescar,
  refrescando = false,
  pie,
  estilo,
  sinBordeSuperior = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  onRefrescar?: () => void;
  refrescando?: boolean;
  pie?: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  sinBordeSuperior?: boolean;
}) {
  return (
    <SafeAreaView style={e.pantalla} edges={sinBordeSuperior ? ["left", "right"] : ["top", "left", "right"]}>
      <AvisoDemo />
      <AvisoSinConexion />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[e.contenido, estilo]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefrescar ? <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={colores.rosa} /> : undefined}
        >
          <View style={e.ancho}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[e.contenido, { flex: 1 }, estilo]}>
          <View style={[e.ancho, { flex: 1 }]}>{children}</View>
        </View>
      )}
      {pie ? <View style={e.pie}><View style={e.ancho}>{pie}</View></View> : null}
    </SafeAreaView>
  );
}

export function Cabecera({ titulo, subtitulo, volver = false, derecha }: { titulo: string; subtitulo?: string; volver?: boolean; derecha?: ReactNode }) {
  const router = useRouter();
  return (
    <View style={e.cabecera}>
      {volver ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
          style={e.botonVolver}
          hitSlop={10}
        >
          <Icono nombre="volver" color={colores.texto} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={e.titulo}>{titulo}</Text>
        {subtitulo ? <Text style={e.subtitulo}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

type Variante = "primario" | "secundario" | "suave" | "peligro" | "texto";

export function Boton({
  titulo,
  onPress,
  variante = "primario",
  deshabilitado = false,
  cargando = false,
  icono,
  estilo,
  pequeno = false,
}: {
  titulo: string;
  onPress?: () => void;
  variante?: Variante;
  deshabilitado?: boolean;
  cargando?: boolean;
  icono?: NombreIcono;
  estilo?: StyleProp<ViewStyle>;
  pequeno?: boolean;
}) {
  const v = variantes[variante];
  const off = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        e.boton,
        pequeno && e.botonPequeno,
        { backgroundColor: v.fondo, borderColor: v.borde },
        off && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={v.texto} />
      ) : (
        <View style={e.filaCentro}>
          {icono ? <Icono nombre={icono} color={v.texto} tam={18} /> : null}
          <Text style={[e.textoBoton, pequeno && { fontSize: 14 }, { color: v.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

const variantes: Record<Variante, { fondo: string; borde: string; texto: string }> = {
  primario: { fondo: colores.rosa, borde: colores.rosa, texto: colores.blanco },
  secundario: { fondo: colores.blanco, borde: colores.rosa, texto: colores.burdeos },
  suave: { fondo: colores.rosaSuave, borde: colores.rosaSuave, texto: colores.burdeos },
  peligro: { fondo: colores.rojoClaro, borde: colores.rojoClaro, texto: colores.rojo },
  texto: { fondo: "transparent", borde: "transparent", texto: colores.textoSuave },
};

export function Tarjeta({ children, estilo, onPress }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [e.tarjeta, estilo, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[e.tarjeta, estilo]}>{children}</View>;
}

export function Campo({ etiqueta, error, ...props }: TextInputProps & { etiqueta: string; error?: string | null }) {
  return (
    <View style={{ marginBottom: espacio.m }}>
      <Text style={e.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={colores.textoTenue}
        {...props}
        style={[e.campo, error ? { borderColor: colores.rojo } : null, props.style]}
      />
      {error ? <Text style={e.error}>{error}</Text> : null}
    </View>
  );
}

export function Pastilla({ texto, color = colores.verde, fondo = colores.verdeClaro, icono, onPress, estilo }: { texto: string; color?: string; fondo?: string; icono?: NombreIcono; onPress?: () => void; estilo?: StyleProp<ViewStyle> }) {
  const contenido = (
    <View style={e.filaCentro}>
      <Text style={[e.textoPastilla, { color }]}>{texto}</Text>
      {icono ? <Icono nombre={icono} tam={13} color={color} grosor={2.2} /> : null}
    </View>
  );
  const est = [e.pastilla, { backgroundColor: fondo, borderColor: fondo }, estilo];
  return onPress ? (
    <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [est, pressed && { opacity: 0.7 }]}>
      {contenido}
    </Pressable>
  ) : (
    <View style={est}>{contenido}</View>
  );
}

export function Cargando({ texto }: { texto?: string }) {
  return (
    <View style={{ padding: espacio.xxl, alignItems: "center", gap: espacio.m }}>
      <ActivityIndicator color={colores.rosa} size="large" />
      {texto ? <Text style={e.tenue}>{texto}</Text> : null}
    </View>
  );
}

export function CajaMensaje({ texto, tipo = "info", icono }: { texto: string; tipo?: "info" | "ok" | "aviso" | "error"; icono?: NombreIcono }) {
  const c = {
    info: { f: colores.rosaSuave, t: colores.burdeos },
    ok: { f: colores.verdeClaro, t: colores.verde },
    aviso: { f: colores.ambarClaro, t: colores.ambar },
    error: { f: colores.rojoClaro, t: colores.rojo },
  }[tipo];
  return (
    <View style={[e.caja, { backgroundColor: c.f }]}>
      <Icono nombre={icono ?? (tipo === "ok" ? "check" : tipo === "info" ? "info" : "alerta")} color={c.t} tam={18} />
      <Text style={[e.textoCaja, { color: c.t }]}>{texto}</Text>
    </View>
  );
}

export function FilaMenu({ icono, titulo, subtitulo, onPress, color }: { icono: NombreIcono; titulo: string; subtitulo?: string; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [e.filaMenu, pressed && { backgroundColor: colores.rosaSuave }]}>
      <Icono nombre={icono} color={color ?? colores.texto} />
      <View style={{ flex: 1 }}>
        <Text style={[e.textoFila, color ? { color } : null]}>{titulo}</Text>
        {subtitulo ? <Text style={e.tenue}>{subtitulo}</Text> : null}
      </View>
      <Icono nombre="chevron" tam={18} color={colores.textoTenue} />
    </Pressable>
  );
}

export function Segmentos<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <View style={e.segmentos}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable key={o.valor} onPress={() => onCambio(o.valor)} style={[e.segmento, activo && e.segmentoActivo]}>
            <Text style={[e.textoSegmento, activo && { color: colores.burdeos, fontWeight: "700" }]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chips<T extends string | number>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: espacio.s }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable key={String(o.valor)} onPress={() => onCambio(o.valor)} style={[e.chip, activo && e.chipActivo]}>
            <Text style={[e.textoChip, activo && { color: colores.blanco }]}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Vacio({ texto, icono = "info" }: { texto: string; icono?: NombreIcono }) {
  return (
    <View style={{ alignItems: "center", padding: espacio.xxl, gap: espacio.m }}>
      <Icono nombre={icono} tam={36} color={colores.textoTenue} />
      <Text style={[e.tenue, { textAlign: "center", fontSize: 15 }]}>{texto}</Text>
    </View>
  );
}

export function T({ children, estilo, variante = "normal", lineas }: { children: ReactNode; estilo?: StyleProp<TextStyle>; variante?: "normal" | "tenue" | "fuerte" | "seccion" | "grande"; lineas?: number }) {
  const v = { normal: e.normal, tenue: e.tenue, fuerte: e.fuerte, seccion: e.seccion, grande: e.grande }[variante];
  return <Text numberOfLines={lineas} style={[v, estilo]}>{children}</Text>;
}

export const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio.l, paddingBottom: espacio.xxl * 2, alignItems: "center" },
  ancho: { width: "100%", maxWidth: 560 },
  pie: { padding: espacio.l, paddingTop: espacio.s, backgroundColor: colores.fondo, alignItems: "center" },
  cabecera: { flexDirection: "row", alignItems: "center", gap: espacio.m, marginBottom: espacio.l, marginTop: espacio.s },
  botonVolver: { width: 40, height: 40, borderRadius: 20, backgroundColor: colores.blanco, alignItems: "center", justifyContent: "center", ...sombra },
  titulo: { fontSize: 26, fontWeight: "700", color: colores.texto },
  subtitulo: { fontSize: 14, color: colores.textoSuave, marginTop: 2 },
  boton: { minHeight: 50, borderRadius: radios.pastilla, borderWidth: 1.5, alignItems: "center", justifyContent: "center", paddingHorizontal: espacio.xl },
  botonPequeno: { minHeight: 38, paddingHorizontal: espacio.l },
  textoBoton: { fontSize: 16, fontWeight: "600" },
  filaCentro: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tarjeta: { backgroundColor: colores.fondoTarjeta, borderRadius: radios.l, padding: espacio.l, marginBottom: espacio.m, ...sombra },
  etiqueta: { fontSize: 13, fontWeight: "600", color: colores.textoSuave, marginBottom: 6 },
  campo: { backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde, borderRadius: radios.m, paddingHorizontal: espacio.l, paddingVertical: 13, fontSize: 16, color: colores.texto },
  error: { color: colores.rojo, fontSize: 13, marginTop: 4 },
  pastilla: { borderRadius: radios.pastilla, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: "flex-start" },
  textoPastilla: { fontSize: 12, fontWeight: "700" },
  caja: { flexDirection: "row", gap: espacio.s, alignItems: "flex-start", borderRadius: radios.m, padding: espacio.m, marginBottom: espacio.m },
  textoCaja: { flex: 1, fontSize: 14, lineHeight: 20 },
  filaMenu: { flexDirection: "row", alignItems: "center", gap: espacio.m, paddingVertical: 14, paddingHorizontal: espacio.s, borderRadius: radios.s },
  textoFila: { fontSize: 15, fontWeight: "600", color: colores.texto },
  segmentos: { flexDirection: "row", backgroundColor: colores.blanco, borderRadius: radios.m, padding: 4, marginBottom: espacio.l, ...sombra },
  segmento: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radios.s },
  segmentoActivo: { backgroundColor: colores.rosaSuave },
  textoSegmento: { fontSize: 15, color: colores.textoSuave, fontWeight: "500" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radios.pastilla, backgroundColor: colores.blanco, borderWidth: 1, borderColor: colores.borde },
  chipActivo: { backgroundColor: colores.rosa, borderColor: colores.rosa },
  textoChip: { fontSize: 14, color: colores.texto, fontWeight: "500" },
  normal: { fontSize: 15, color: colores.texto, lineHeight: 21 },
  tenue: { fontSize: 13, color: colores.textoSuave, lineHeight: 18 },
  fuerte: { fontSize: 17, color: colores.texto, fontWeight: "700" },
  seccion: { fontSize: 15, color: colores.texto, fontWeight: "700", marginBottom: espacio.s, marginTop: espacio.s },
  grande: { fontSize: 22, color: colores.texto, fontWeight: "700" },
});
