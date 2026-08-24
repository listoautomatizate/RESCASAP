import { COMPANY } from './legal';

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <strong>RESCASAP</strong>
      <nav aria-label="Información legal">
        <a href="/terminos">Términos y condiciones</a>
        <a href="/privacidad">Privacidad</a>
        <a href="/comercios">Acuerdo para comercios</a>
      </nav>
      <span>{COMPANY.legalName} · RUT {COMPANY.rut} · {COMPANY.location}</span>
      <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
    </footer>
  );
}
