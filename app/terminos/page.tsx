import type { Metadata } from 'next';
import Link from 'next/link';
import LegalFooter from '../legal-footer';
import { COMPANY, LEGAL_VERSION } from '../legal';

export const metadata: Metadata = { title: 'Términos y condiciones — RESCASAP' };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <header className="legal-hero"><Link href="/">← Volver a RESCASAP</Link><p>DOCUMENTO LEGAL · URUGUAY</p><h1>Términos y condiciones</h1><span>Versión {LEGAL_VERSION}</span></header>
      <article className="legal-document">
        <section><h2>1. Quién opera RESCASAP</h2><p>RESCASAP es operada por {COMPANY.legalName}, RUT {COMPANY.rut}, con domicilio contractual en {COMPANY.location}. Contacto: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> y <a href={`tel:+59898348977`}>{COMPANY.phone}</a>.</p></section>
        <section><h2>2. Qué hace la plataforma</h2><p>RESCASAP conecta a consumidores con comercios habilitados que ofrecen, antes del cierre, packs de alimentos excedentes a precio reducido. RESCASAP actúa como intermediaria tecnológica: el comercio informa el producto, fija el precio, confirma el stock, entrega el pack y es responsable por su elaboración, conservación, inocuidad, rotulado e información sobre alérgenos.</p></section>
        <section><h2>3. Cuenta y uso responsable</h2><p>La persona usuaria debe proporcionar datos correctos, mantenerlos actualizados y proteger el acceso a su cuenta. La plataforma está destinada a personas mayores de 18 años. No se permite usar RESCASAP para fraude, reventa, interferencia técnica o actividades contrarias a la normativa uruguaya.</p></section>
        <section><h2>4. Packs, stock y contenido</h2><p>Los packs dependen del excedente real del día. Su contenido puede variar, pero el comercio debe respetar la descripción, el peso o porciones estimadas, el precio y la franja de retiro publicados. El precio habitual es una referencia informada por el comercio. Los packs marcados como DEMO son ejemplos y no generan una compra ni un retiro real.</p></section>
        <section><h2>5. Reserva y pago al retirar</h2><p>En la etapa piloto, RESCASAP no procesa pagos. La reserva genera un código de retiro y el consumidor paga directamente al comercio al recibir el pack. El comercio es responsable de cobrar y emitir la documentación fiscal que corresponda. Una reserva queda sujeta a stock, horario y confirmación del comercio.</p></section>
        <section><h2>6. Retiro, cancelación y no presentación</h2><p>El consumidor debe retirar dentro de la franja indicada y mostrar su código. Puede cancelar desde la aplicación mientras la reserva siga activa y antes del inicio del horario de retiro. Si no se presenta, el comercio puede marcar la reserva como no retirada. Si el comercio no puede entregar, deberá cancelar o coordinar una solución sin afectar los derechos irrenunciables del consumidor.</p></section>
        <section><h2>7. Información alimentaria y reclamos</h2><p>Antes de reservar, las personas con alergias, intolerancias o restricciones deben consultar directamente al comercio. Los reclamos sobre alimentos, cobro o entrega se dirigirán primero al comercio y podrán comunicarse también a RESCASAP para su seguimiento.</p></section>
        <section><h2>8. Comercios</h2><p>Solo podrán publicar comercios que hayan declarado contar con las habilitaciones aplicables y aceptado el Acuerdo para Comercios. RESCASAP puede solicitar documentación, mantener una solicitud pendiente, ocultar publicaciones o suspender un comercio si la información es incompleta, vencida o cuestionada.</p></section>
        <section><h2>9. Responsabilidad</h2><p>RESCASAP procura mantener el servicio disponible y la información actualizada, pero no garantiza continuidad absoluta. Nada en estos términos limita derechos reconocidos por normas imperativas. Cada parte responde por sus actos, y el comercio mantiene la responsabilidad por los alimentos y la operación de entrega.</p></section>
        <section><h2>10. Datos personales</h2><p>El tratamiento de datos se rige por la <Link href="/privacidad">Política de Privacidad</Link>. La ubicación precisa solo se solicita con autorización del dispositivo y no se conserva en el piloto.</p></section>
        <section><h2>11. Cambios y ley aplicable</h2><p>Podemos actualizar estos términos por cambios operativos o normativos. Si el cambio es relevante, se solicitará una nueva aceptación. Rigen las leyes de la República Oriental del Uruguay y se preservan los mecanismos administrativos y judiciales de protección al consumidor.</p></section>
      </article>
      <LegalFooter />
    </main>
  );
}
