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
- reserva con pago al retirar; Mercado Pago queda visible como integración futura;
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
- **CSS propio:** diseño mobile-first sin depender de una biblioteca visual ni copiar una UX existente.
- **API interna:** rutas pequeñas por dominio (`profile`, `packs`, `reservations`, `merchant`).

### Estructura principal

```text
app/
  api/                  rutas de lectura y mutación
  auth.ts               validación de identidad de Supabase
  auth/callback/        confirmación del enlace enviado por email
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
- `reservations`: usuario, pack, importe, pago, código y estado de retiro.

Los índices priorizan las consultas frecuentes: packs por estado/horario, packs y plantillas por comercio, reservas por usuario/fecha y reservas activas por pack.

## Decisiones del MVP

- El MVP público comienza únicamente con pago al retirar; Mercado Pago no procesa dinero todavía.
- Se usa código visible de retiro, suficiente para el MVP y más fácil de operar que depender de la cámara; la estructura permite cambiarlo por QR firmado.
- El contenido del pack es sorpresa, pero se comunica peso estimado y descripción para reducir incertidumbre.
- La reducción automática se evalúa en horario de Uruguay cuando se consulta el inventario.
- La geolocalización requiere consentimiento y no se persiste.
- La app no incluye donaciones; se concentra en vender excedentes y aprender del historial.
- Los comercios nuevos permanecen pendientes y no pueden publicar hasta verificar RUT y habilitación.

## Próximos pasos para producción

1. Integrar Mercado Pago Uruguay con webhooks idempotentes y conciliación.
2. Separar usuarios y comercios en organizaciones con permisos de equipo.
3. Firmar y escanear QR; registrar auditoría de cada cambio de estado.
4. Agregar vencimiento automático, reembolsos y reglas de cancelación.
5. Incorporar notificaciones push, email o WhatsApp transaccional.
6. Completar la inscripción de bases de datos ante la URCDP y revisar la documentación legal con asesoría local.
7. Entrenar sugerencias de producción únicamente con suficiente historial y explicaciones visibles.
8. Añadir monitoreo, backups, rate limiting, pruebas E2E y panel de soporte.

## Estado de preparación

La aplicación está lista como piloto público y para validar el flujo. Los comercios de muestra están identificados como DEMO y no generan retiros reales. Antes de cobrar en línea necesita las integraciones y revisiones del apartado anterior.
