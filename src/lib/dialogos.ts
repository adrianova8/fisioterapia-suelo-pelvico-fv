// Diálogos que funcionan en móvil y en web
// (Alert.alert con botones no funciona en react-native-web).
import { Alert, Platform } from "react-native";

export function alerta(titulo: string, mensaje?: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    return;
  }
  Alert.alert(titulo, mensaje);
}

/** Pregunta sí/no. Devuelve true si la usuaria confirma. */
export function confirmar(
  titulo: string,
  mensaje: string,
  textoSi = "Sí",
  textoNo = "No",
  destructivo = false,
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: textoNo, style: "cancel", onPress: () => resolve(false) },
        { text: textoSi, style: destructivo ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
