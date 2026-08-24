import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '../legal-footer';
import { COMPANY, LEGAL_VERSION } from '../legal';

export const metadata: Metadata = { title: 'Política de privacidad — RESCASAP' };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero privacy"><Link href="/">← Volver a RESCASAP</Link><p>DATOS PERSONALES · URUGUAY</p><h1>Política de privacidad</h1><span>Versión {LEGAL_VERSION}</span></header>
      <article className="legal-document">
        <section><h2>1. Responsable</h2><p>La responsable del tratamiento es {COMPANY.legalName}, RUT {COMPANY.rut}, {COMPANY.location}. Para consultas o para ejercer derechos: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> y {COMPANY.phone}.</p></section>
        <section><h2>2. Datos que tratamos</h2><p>Podemos tratar nombre, email o teléfono de acceso, barrio o ciudad, rol de consumidor o comercio, historial de reservas, códigos y estados de retiro, métricas de impacto, datos del establecimiento, RUT y habilitaciones declaradas. La geolocalización precisa se usa únicamente cuando la persona la autoriza para ordenar resultados cercanos y no se almacena en esta etapa.</p></section>
        <section><h2>3. Finalidades</h2><p>Usamos los datos para crear y proteger cuentas, mostrar packs cercanos, gestionar reservas y retiros, atender consultas, verificar comercios, prevenir abuso, medir el funcionamiento del servicio y cumplir obligaciones legales. No vendemos datos personales ni los usamos para finalidades incompatibles con estas.</p></section>
        <section><h2>4. Base y consentimiento</h2><p>El tratamiento se realiza para ejecutar la relación solicitada por la persona usuaria, cumplir obligaciones legales y, cuando corresponde, sobre la base de su consentimiento. La autorización de ubicación puede revocarse desde el navegador o dispositivo.</p></section>
        <section><h2>5. Destinatarios y proveedores</h2><p>Los datos estrictamente necesarios de una reserva se comparten con el comercio elegido. También pueden intervenir proveedores de alojamiento, base de datos, autenticación y comunicaciones bajo instrucciones de RESCASAP. Si un proveedor procesa información fuera de Uruguay, se aplicarán las salvaguardas exigibles.</p></section>
        <section><h2>6. Conservación y seguridad</h2><p>Conservamos los datos mientras la cuenta esté activa y luego durante los plazos necesarios para atender reclamos, seguridad y obligaciones legales. Aplicamos medidas de acceso limitado, sesiones protegidas y controles técnicos razonables, sin prometer seguridad absoluta.</p></section>
        <section><h2>7. Derechos</h2><p>La persona titular puede solicitar acceso, rectificación, actualización, inclusión o supresión de sus datos y retirar consentimientos cuando corresponda. Las solicitudes se reciben en <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. También puede acudir ante la Unidad Reguladora y de Control de Datos Personales.</p></section>
        <section><h2>8. Base de datos y actualizaciones</h2><p>RESCASAP realizará la inscripción de sus bases de datos ante la URCDP. Esta política podrá cambiar cuando se incorporen nuevas funciones, proveedores o requisitos; la versión vigente siempre estará publicada en esta dirección.</p></section>
      </article>
      <LegalFooter />
    </main>
  );
}
