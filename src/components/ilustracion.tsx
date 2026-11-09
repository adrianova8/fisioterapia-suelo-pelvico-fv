// Ilustración de la portada: la imagen original del diseño (MVP_0), recortada
// y escalada en assets/images/portada.png. Va de borde a borde de la pantalla.
import { Image } from "expo-image";

const PORTADA = require("../../assets/images/portada.png");
const PROPORCION = 1272 / 1237; // ancho / alto de portada.png

export function IlustracionPortada({ ancho = 320 }: { ancho?: number }) {
  return <Image source={PORTADA} style={{ width: ancho, height: ancho / PROPORCION }} contentFit="cover" />;
}
