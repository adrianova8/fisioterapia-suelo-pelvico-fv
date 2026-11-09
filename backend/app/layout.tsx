import type { ReactNode } from "react";

export const metadata = { title: "Mamá en movimiento" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, background: "#FBF4F1", fontFamily: "-apple-system, Segoe UI, Roboto, sans-serif", color: "#2E2326" }}>
        {children}
      </body>
    </html>
  );
}
