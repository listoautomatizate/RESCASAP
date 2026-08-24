import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '../legal-footer';
import { COMPANY, LEGAL_VERSION } from '../legal';

export const metadata: Metadata = { title: 'Acuerdo para comercios — RESCASAP' };

export default function MerchantAgreementPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero merchant"><Link href="/">← Volver a RESCASAP</Link><p>ALTA DE COMERCIOS · URUGUAY</p><h1>Acuerdo para comercios</h1><span>Versión {LEGAL_VERSION}</span></header>
      <article className="legal-document">
        <section><h2>1. Partes</h2><p>Este acuerdo se celebra entre {COMPANY.legalName}, RUT {COMPANY.rut}, operadora de RESCASAP, y el comercio que completa la solicitud y la acepta electrónicamente.</p></section>
        <section><h2>2. Requisitos de ingreso</h2><p>El comercio declara que su identidad, RUT, domicilio, rubro y representantes son correctos; que cuenta con las habilitaciones comerciales y bromatológicas exigibles para su actividad; y que las mantendrá vigentes. La solicitud permanece pendiente hasta que RESCASAP revise la documentación.</p></section>
        <section><h2>3. Responsabilidad alimentaria</h2><p>El comercio es el único responsable por elaboración, manipulación, conservación, cadena de frío, fecha y condiciones de consumo, rotulado, alérgenos e inocuidad de cada alimento. Solo publicará alimentos aptos para consumo y respetará las normas nacionales y departamentales aplicables.</p></section>
        <section><h2>4. Publicaciones y stock</h2><p>El comercio mantendrá correctos el precio habitual, precio rescate, descripción, cantidad, peso o porciones estimadas y horario. Debe retirar o actualizar inmediatamente un pack sin stock y no puede usar precios de referencia falsos.</p></section>
        <section><h2>5. Cobro y documentación</h2><p>El comercio puede cobrar al retirar o vincular su propia cuenta de Mercado Pago mediante autorización segura. En el cobro online, los fondos se acreditan en la cuenta del comercio y Mercado Pago puede descontar sus cargos. RESCASAP no conserva datos de tarjetas ni custodia fondos. La comisión de plataforma durante el piloto es 0; cualquier comisión futura se informará y requerirá aceptación antes de aplicarse. El comercio continúa obligado a emitir la documentación fiscal correspondiente y a mantener actualizados los datos de su cuenta de cobro.</p></section>
        <section><h2>6. Entrega y atención</h2><p>El comercio verificará el código, entregará dentro del horario, tratará los datos de la reserva únicamente para completar la operación y atenderá reclamos de forma diligente. No contactará a usuarios con fines promocionales sin consentimiento.</p></section>
        <section><h2>7. Revisión y suspensión</h2><p>RESCASAP puede solicitar constancias, revisar la solicitud, impedir publicaciones mientras esté pendiente y suspender el acceso ante vencimientos, reclamos de seguridad, datos falsos o incumplimientos. El comercio deberá comunicar cambios relevantes en un plazo razonable.</p></section>
        <section><h2>8. Vigencia y terminación</h2><p>El acuerdo rige desde su aceptación electrónica. Cualquiera de las partes puede terminarlo comunicándolo por escrito, sin afectar reservas pendientes ni responsabilidades anteriores. Rige la ley uruguaya.</p></section>
      </article>
      <LegalFooter />
    </main>
  );
}
