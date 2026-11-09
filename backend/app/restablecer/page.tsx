"use client";
// Página que abre el enlace del email "Cambia tu contraseña".
import { useState } from "react";

export default function Restablecer() {
  const [password, setPassword] = useState("");
  const [repetir, setRepetir] = useState("");
  const [estado, setEstado] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (password !== repetir) return setEstado({ tipo: "error", texto: "Las contraseñas no coinciden." });
    setEnviando(true);
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const r = await fetch("/api/auth/restablecer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const d = await r.json().catch(() => ({}));
    setEnviando(false);
    setEstado(r.ok ? { tipo: "ok", texto: "¡Listo! Ya puedes entrar en la app con tu contraseña nueva." } : { tipo: "error", texto: d.error ?? "No se ha podido cambiar." });
  }

  const campo = { width: "100%", boxSizing: "border-box" as const, padding: 14, borderRadius: 12, border: "1px solid #EEDFDB", fontSize: 16, marginBottom: 12 };
  return (
    <main style={{ maxWidth: 420, margin: "60px auto", padding: 20 }}>
      <div style={{ textAlign: "center", color: "#C97878", fontSize: 30 }}>♥</div>
      <h1 style={{ textAlign: "center", fontFamily: "Georgia, serif", color: "#22304A", fontWeight: 600 }}>Nueva contraseña</h1>
      {estado?.tipo === "ok" ? (
        <p style={{ background: "#E6F2EA", padding: 14, borderRadius: 12 }}>{estado.texto}</p>
      ) : (
        <form onSubmit={enviar}>
          <input type="password" placeholder="Contraseña nueva (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} style={campo} minLength={8} required />
          <input type="password" placeholder="Repite la contraseña" value={repetir} onChange={(e) => setRepetir(e.target.value)} style={campo} minLength={8} required />
          {estado ? <p style={{ color: "#B3261E" }}>{estado.texto}</p> : null}
          <button disabled={enviando} style={{ width: "100%", padding: 14, borderRadius: 999, border: 0, background: "#C97878", color: "#fff", fontSize: 16, fontWeight: 600 }}>
            {enviando ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
    </main>
  );
}
