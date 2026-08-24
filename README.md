# RESCASAP — MVP Uruguay

MVP funcional, responsive y mobile-first para rescatar excedentes de comercios uruguayos antes del cierre. La identidad es provisional y original; no replica la marca ni la interfaz de Too Good To Go o Buen Provecho.

La propuesta de producto sigue tres capas:

1. **Vender:** recuperar valor con packs de excedentes a precio rescate.
2. **Aprovechar:** dar salida comercial al excedente del día.
3. **Aprender:** usar el historial para producir con menos merma.

## Qué incluye

### Consumidor

- ingreso por enlace seguro enviado al email y onboarding de una sola pantalla;
- geolocalización opcional y orden por cercanía;
- búsqueda y filtros por rubro;
- listado, mapa, detalle, stock y precio actualizados;
- precio habitual y precio rescate en UYU;
- horario y dirección de retiro;
- reserva con pago al retirar o Checkout Pro de Mercado Pago cuando el comercio lo haya vinculado;
- reserva persistente y código de retiro único;
- cancelación, historial y métricas personales de kg, porciones y ahorro.

### Comercio

- onboarding para panadería, restaurante, cafetería, frutería, hotel o supermercado;
- panel con packs activos, reservas, kg rescatados y valor recuperado;
- alta de packs con cantidad, precio, peso estimado y franja de retiro;
- plantillas recurrentes;
- reducción automática opcional antes del cierre;
- estados publicado, reservado/agostado, retirado, cancelado y no vendido;
- validación del retiro por código;
- control de solicitud, aceptación contractual y verificación previa del comercio;
- vinculación OAuth de la cuenta propia de Mercado Pago y cobro directo del comercio;
- base visual y de datos preparada para analítica predictiva.

## Ejecutar localmente

Requisitos: Node.js 22.13 o superior y pnpm.

```bash
pnpm install
pnpm dev
```

Abrir `http://localhost:3000`.

Para probar el acceso local se necesitan `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `PUBLIC_SITE_URL=http://localhost:3000` en un archivo local `.env`. Sites provee la base D1 local. En el primer ingreso se elige consumidor o comercio. Para verificar una reserva de punta a punta, se puede:

1. entrar como consumidor y reservar un pack;
2. copiar el código de retiro;
3. cambiar a “Mi comercio” y publicar un pack propio;
4. reservar ese pack desde el modo consumidor;
5. volver al panel del comercio e ingresar el código en “Validar retiro”.

## Comandos útiles

```bash
pnpm dev          # desarrollo local
pnpm build        # compilación de producción
pnpm lint         # revisión estática
pnpm db:generate  # genera migraciones desde db/schema.ts
```

## Arquitectura

- **Vinext + React + TypeScript:** interfaz y rutas de servidor compatibles con Cloudflare Workers.
- **Cloudflare D1 / SQLite:** persistencia de perfiles, comercios, plantillas, packs y reservas.
- **Supabase Auth:** acceso sin contraseña mediante enlace mágico enviado al email; la aplicación valida la identidad en el servidor.
- **Mercado Pago Checkout Pro + Split 1:1:** cada comercio autoriza su propia cuenta; el checkout procesa el pago fuera de RESCASAP y devuelve una orden conciliada por webhook.
- **CSS propio:** diseño mobile-first sin depender de una biblioteca visual ni copiar una UX existente.
- **API interna:** rutas pequeñas por dominio (`profile`, `packs`, `reservations`, `merchant`).

### Estructura principal

```text
app/
  api/                  rutas de lectura y mutación
  auth.ts               validación de identidad de Supabase
  auth/callback/        confirmación del enlace enviado por email
  pago/[id]/            regreso seguro y estado conciliado del pago
  terminos/             términos y condiciones públicos
  privacidad/           política de privacidad pública
  comercios/            acuerdo electrónico para comercios
  rescata-app.tsx       experiencia de consumidor y comercio
  globals.css           sistema visual responsive
db/
  schema.ts             modelo relacional
  bootstrap.ts          esquema y datos de demostración locales
drizzle/                migraciones D1
public/og.png           tarjeta social de marca
.openai/hosting.json    bindings de despliegue
```

## Modelo de datos

- `users`: identidad, rol y zona.
- `businesses`: comercio, rubro, ubicación y propietario.
- `pack_templates`: configuración recurrente de un pack.
- `packs`: publicación diaria, stock, precios, horario, automatización y estado.
- `reservations`: usuario, pack, importe, código y estado de retiro.
- `mercado_pago_connections`: autorización cifrada y renovable de cada comercio.
- `payment_transactions`: orden, idempotencia, importe, comisión y estado conciliado.

Los índices priorizan las consultas frecuentes: packs por estado/horario, packs y plantillas por comercio, reservas por usuario/fecha y reservas activas por pack.

## Decisiones del MVP

- Pago al retirar permanece siempre disponible; Mercado Pago solo aparece en comercios verificados que hayan vinculado su cuenta.
- El piloto usa una comisión de plataforma de 0%; puede configurarse más adelante sin cambiar el flujo de cobro.
- La URL de regreso nunca se toma como prueba de pago: el servidor consulta la orden y valida webhooks firmados.
- Se usa código visible de retiro, suficiente para el MVP y más fácil de operar que depender de la cámara; la estructura permite cambiarlo por QR firmado.
- El contenido del pack es sorpresa, pero se comunica peso estimado y descripción para reducir incertidumbre.
- La reducción automática se evalúa en horario de Uruguay cuando se consulta el inventario.
- La geolocalización requiere consentimiento y no se persiste.
- La app no incluye donaciones; se concentra en vender excedentes y aprender del historial.
- Los comercios nuevos permanecen pendientes y no pueden publicar hasta verificar RUT y habilitación.

## Próximos pasos para producción

1. Separar usuarios y comercios en organizaciones con permisos de equipo.
2. Firmar y escanear QR; registrar auditoría de cada cambio de estado.
3. Incorporar notificaciones push, email o WhatsApp transaccional.
4. Obtener la resolución del trámite de inscripción de bases ante la URCDP y revisar contratos con asesoría local.
5. Entrenar sugerencias de producción únicamente con suficiente historial y explicaciones visibles.
6. Añadir monitoreo, restauración ensayada, rate limiting, pruebas E2E y panel de soporte.

## Estado de preparación

La aplicación está lista como piloto público y para validar el flujo. Los comercios de muestra están identificados como DEMO y no generan retiros reales. El código de Mercado Pago queda inactivo hasta cargar las credenciales de la aplicación y el secreto de webhooks.

## Activar Mercado Pago en producción

Crear una aplicación de Checkout Pro para marketplace en Mercado Pago Uruguay, habilitar OAuth con PKCE y Split 1:1, y registrar:

- URL de redirección: `https://rescasap.uy/api/merchant/mercadopago/callback`
- Webhook de órdenes: `https://rescasap.uy/api/webhooks/mercadopago`

Variables secretas del sitio:

```text
MP_CLIENT_ID
MP_CLIENT_SECRET
MP_WEBHOOK_SECRET
MP_TOKEN_ENCRYPTION_KEY   # 32 bytes aleatorios codificados en base64url
MP_OAUTH_REDIRECT_URI=https://rescasap.uy/api/merchant/mercadopago/callback
MP_MARKETPLACE_FEE_PERCENT=0
```

`MP_CLIENT_SECRET`, `MP_WEBHOOK_SECRET` y `MP_TOKEN_ENCRYPTION_KEY` son exclusivamente de servidor: nunca deben agregarse al repositorio ni exponerse en el navegador. Cada comercio verificado entra a “Mi comercio”, pulsa “Vincular mi cuenta” y autoriza RESCASAP. Mercado Pago exige que la cuenta vendedora complete sus verificaciones de identidad.

## Seguridad y operación

- Las tarjetas se ingresan y procesan en Mercado Pago; RESCASAP no las recibe.
- Los tokens OAuth de los comercios se cifran con AES-GCM antes de persistirse.
- Las órdenes usan clave de idempotencia para evitar cobros duplicados.
- Cada webhook se valida por HMAC y luego se vuelve a consultar la orden a Mercado Pago.
- Las sesiones usan cookies `HttpOnly`, `Secure` y `SameSite=Lax` en producción.
- D1 cifra los datos almacenados y el tráfico; Supabase mantiene la identidad de acceso.

Ninguna aplicación conectada a internet puede garantizar riesgo cero. Antes de crecer se deben activar SMTP propio, protección anti-bots y límites de uso, alertas, copias/restauración verificadas, revisión periódica de dependencias y una evaluación de seguridad independiente.
