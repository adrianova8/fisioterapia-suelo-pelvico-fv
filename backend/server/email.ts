// Envío de emails con Resend (https://resend.com). Sin RESEND_API_KEY se
// escriben en la consola del servidor (útil en desarrollo).
// Nunca lanza error: un email que falla no debe romper una reserva.
export async function enviarEmail(para: string, asunto: string, texto: string): Promise<void> {
  if (!para || para.endsWith(".invalid")) return;
  const clave = process.env.RESEND_API_KEY;
  const html = plantillaHtml(asunto, texto);
  if (!clave) {
    console.log(`\n[email · consola] Para: ${para}\nAsunto: ${asunto}\n${texto}\n`);
    return;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Mamá en movimiento <onboarding@resend.dev>",
        to: [para],
        subject: asunto,
        text: texto,
        html,
      }),
    });
    if (!r.ok) console.error("[email] Resend respondió", r.status, await r.text());
  } catch (e) {
    console.error("[email] No se pudo enviar", e);
  }
}

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function plantillaHtml(titulo: string, texto: string) {
  const parrafos = escapar(texto)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>").replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#8b1553">$1</a>')}</p>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#FBF4F1;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2E2326">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
  <div style="text-align:center;color:#C97878;font-size:26px">♥</div>
  <h1 style="text-align:center;font-family:Georgia,serif;font-weight:600;color:#22304A;font-size:24px;margin:6px 0 22px">Mamá en movimiento</h1>
  <div style="background:#fff;border-radius:18px;padding:22px 20px;font-size:15px;line-height:1.5">
    <h2 style="font-size:17px;margin:0 0 14px">${escapar(titulo)}</h2>${parrafos}
  </div>
  <p style="text-align:center;color:#6B4E8A;font-size:12px;margin-top:22px">Clínica Fátima Veiga · Suelo Pélvico Santander<br>C. Fernando Calderón, 8 · 39005 Santander · 626 52 98 17</p>
</div></body></html>`;
}
