# Mamá en movimiento — app móvil

App para las clientas de la Clínica Fátima Veiga (Embarazo, Postparto, +50)
y modo administración para la profesora. Expo (React Native) para Android,
iPhone y web.

## Probarla en 3 pasos

```bash
npm install
cp .env.example .env.local     # deja EXPO_PUBLIC_API_URL vacío = modo demostración
npx expo start                  # escanea el QR con Expo Go (o pulsa w para web)
```

En modo demostración:
- Usuaria: `laura@test.com` / `Password123`
- Profesora: `admin@test.com` / `Admin12345`

Para usar el backend real, pon su URL en `EXPO_PUBLIC_API_URL`
(ver `.env.example`).

Más detalles técnicos en `AGENTS.md`; reglas de negocio en
`RELEVO_IA_APP_EMBARAZO.md`.
