// "Añadir a mi calendario": genera un .ics y lo abre/comparte.
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { alerta } from "./dialogos";
import { generarIcs } from "./fechas";

export async function anadirACalendario(titulo: string, inicio: string, fin: string, lugar: string) {
  const ics = generarIcs(titulo, inicio, fin, lugar);
  try {
    if (Platform.OS === "web") {
      const blob = new Blob([ics], { type: "text/calendar" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clase.ics";
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const f = new File(Paths.cache, "clase.ics");
    if (f.exists) f.delete();
    f.create();
    f.write(ics);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(f.uri, { mimeType: "text/calendar", UTI: "com.apple.ical.ics", dialogTitle: "Añadir a mi calendario" });
    } else {
      alerta("No disponible", "Este dispositivo no permite añadir el evento automáticamente.");
    }
  } catch {
    alerta("No se ha podido crear el evento");
  }
}
