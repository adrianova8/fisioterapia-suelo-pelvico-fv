// El backend es solo API; esta portada evita un 404 al abrir la URL.
export default function Inicio() {
  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 20, textAlign: "center" }}>
      <div style={{ color: "#C97878", fontSize: 30 }}>♥</div>
      <h1 style={{ fontFamily: "Georgia, serif", color: "#22304A", fontWeight: 600 }}>Mamá en movimiento</h1>
      <p>Servidor de la app. Descarga la app para reservar tus clases.</p>
    </main>
  );
}
