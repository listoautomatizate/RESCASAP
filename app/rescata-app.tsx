'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { ChatGPTUser } from './chatgpt-auth';

type Profile = { id: string; email: string; name: string; role: 'consumer' | 'merchant'; neighborhood: string };
type Pack = {
  id: string; business_id: string; business_name: string; category: string; title: string; description: string;
  normal_price: number; rescue_price: number; current_price: number; quantity_total: number; quantity_available: number;
  estimated_kg: number; pickup_start: string; pickup_end: string; status: 'published' | 'sold_out' | 'cancelled' | 'unsold';
  auto_discount: number; final_price: number | null; discount_minutes: number | null; visual_tone: string;
  address: string; neighborhood: string; latitude: number; longitude: number; rating: number;
};
type Reservation = {
  id: string; pack_id: string; title: string; business_name: string; address: string; neighborhood: string;
  pickup_start: string; pickup_end: string; pickup_code: string; unit_price: number; quantity: number;
  status: 'reserved' | 'collected' | 'cancelled' | 'no_show'; payment_status: 'paid' | 'pay_at_store' | 'refunded';
  estimated_kg?: number; created_at: string;
};
type MerchantPack = Pack & { reservation_count: number; revenue: number };
type Template = {
  id: string; title: string; description: string; normal_price: number; rescue_price: number; estimated_kg: number;
  pickup_start: string; pickup_end: string; auto_discount: number; final_price: number | null; discount_minutes: number | null;
};
type Business = { id: string; name: string; category: string; address: string; neighborhood: string };
type BootstrapData = {
  authUser: ChatGPTUser; profile: Profile | null; packs: Pack[]; reservations: Reservation[];
  merchantBusiness: Business | null; merchantPacks: MerchantPack[]; templates: Template[];
};
type View = 'explore' | 'map' | 'history' | 'impact' | 'merchant';

const categoryMarks: Record<string, string> = {
  Panadería: '🥐', Frutería: '🍅', Cafetería: '☕', Restaurante: '🍲', Hotel: '◇', Supermercado: '▦',
};
const toneMarks: Record<string, string> = { bread: '🥐', greens: '🍅', coffee: '☕', dinner: '🍲', merchant: '🥡' };
const demoBusinessIds = new Set(['biz-la-miga', 'biz-verde', 'biz-cafe-sur', 'biz-botanico']);
const demoPackIds = new Set(['pack-miga', 'pack-verde', 'pack-cafe-sur', 'pack-botanico']);
const statusCopy: Record<string, string> = {
  published: 'Publicado', sold_out: 'Reservado', cancelled: 'Cancelado', unsold: 'No vendido',
  reserved: 'Para retirar', collected: 'Retirado', no_show: 'No retirado',
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Algo no salió bien. Probá de nuevo.');
  return result as T;
}

function money(value: number) {
  return new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 }).format(value);
}

function distanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const earth = 6371;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function PackArt({ pack, large = false }: { pack: Pack; large?: boolean }) {
  const discount = Math.round((1 - pack.current_price / pack.normal_price) * 100);
  return (
    <div className={`pack-visual ${pack.visual_tone} ${large ? 'large' : ''}`}>
      <span className="food-mark" aria-hidden="true">{toneMarks[pack.visual_tone] ?? '🥡'}</span>
      <span className="discount-badge">−{discount}%</span>
      <span className="stock-badge">{pack.quantity_available === 1 ? '¡Último!' : `${pack.quantity_available} disponibles`}</span>
    </div>
  );
}

function CodeGrid({ code }: { code: string }) {
  const seed = [...code].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (
    <div className="code-grid" aria-hidden="true">
      {Array.from({ length: 81 }, (_, index) => <i className={(index * 17 + seed + (index % 5) * 7) % 11 < 5 ? 'on' : ''} key={index} />)}
    </div>
  );
}

export default function RescataApp({ authUser }: { authUser: ChatGPTUser | null }) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(Boolean(authUser));
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('explore');
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [sheet, setSheet] = useState<'detail' | 'checkout' | 'success' | 'create' | null>(null);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null);
  const [paymentMethod] = useState<'paid' | 'pay_at_store'>('pay_at_store');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('Montevideo');
  const [toast, setToast] = useState('');
  const [templateSeed, setTemplateSeed] = useState<Partial<Template> | null>(null);

  const refresh = useCallback(async () => {
    if (!authUser) return;
    try {
      const result = await api<BootstrapData>('/api/bootstrap');
      setData(result);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No pudimos cargar los packs.');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    const firstLoad = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 20000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visiblePacks = useMemo(() => {
    if (!data) return [];
    return data.packs
      .filter((pack) => pack.status === 'published' && pack.quantity_available > 0)
      .filter((pack) => category === 'Todos' || pack.category === category)
      .filter((pack) => `${pack.title} ${pack.business_name} ${pack.neighborhood}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => location ? distanceKm(location, a) - distanceKm(location, b) : a.pickup_end.localeCompare(b.pickup_end));
  }, [data, category, query, location]);

  const impact = useMemo(() => {
    const rescued = data?.reservations.filter((item) => ['reserved', 'collected'].includes(item.status)) ?? [];
    return {
      kg: rescued.reduce((sum, item) => sum + Number(item.estimated_kg ?? 0), 0),
      saved: rescued.reduce((sum, item) => {
        const pack = data?.packs.find((candidate) => candidate.id === item.pack_id);
        return sum + Math.max(0, Number(pack?.normal_price ?? item.unit_price) - Number(item.unit_price));
      }, 0),
      count: rescued.length,
    };
  }, [data]);

  function showToast(message: string) { setToast(message); }

  function requestLocation() {
    if (!navigator.geolocation) return showToast('Tu navegador no permite ubicarte.');
    setLocationLabel('Buscando…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ latitude: coords.latitude, longitude: coords.longitude }); setLocationLabel('Cerca de mí'); },
      () => { setLocationLabel('Montevideo'); showToast('No pudimos acceder a tu ubicación.'); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/profile', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos crear la cuenta.'); }
    finally { setBusy(false); }
  }

  async function switchRole(role: 'consumer' | 'merchant') {
    if (!data?.profile) return;
    setBusy(true);
    try {
      await api('/api/profile', { method: 'POST', body: JSON.stringify({
        name: data.profile.name, role, neighborhood: data.profile.neighborhood,
        businessName: role === 'merchant' ? data.merchantBusiness?.name || 'Mi comercio' : undefined,
      }) });
      await refresh();
      setView(role === 'merchant' ? 'merchant' : 'explore');
      showToast(role === 'merchant' ? 'Entraste al panel de comercio.' : 'Volviste al modo rescate.');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : 'No pudimos cambiar el modo.'); }
    finally { setBusy(false); }
  }

  async function reserve() {
    if (!selectedPack) return;
    setBusy(true); setError('');
    try {
      const result = await api<{ reservation: Reservation }>('/api/reservations', {
        method: 'POST', body: JSON.stringify({ packId: selectedPack.id, paymentMethod }),
      });
      setActiveReservation(result.reservation); setSheet('success'); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos reservar.'); }
    finally { setBusy(false); }
  }

  async function cancelReservation(reservation: Reservation) {
    if (!window.confirm('¿Querés cancelar este rescate? El pack volverá a quedar disponible.')) return;
    setBusy(true);
    try {
      await api(`/api/reservations/${reservation.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
      await refresh(); showToast('Reserva cancelada.');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : 'No pudimos cancelar.'); }
    finally { setBusy(false); }
  }

  async function createPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    const payload = {
      title: form.get('title'), description: form.get('description'), normalPrice: Number(form.get('normalPrice')),
      rescuePrice: Number(form.get('rescuePrice')), quantity: Number(form.get('quantity')), estimatedKg: Number(form.get('estimatedKg')),
      pickupStart: form.get('pickupStart'), pickupEnd: form.get('pickupEnd'), autoDiscount: form.get('autoDiscount') === 'on',
      finalPrice: Number(form.get('finalPrice')), discountMinutes: Number(form.get('discountMinutes')), saveTemplate: form.get('saveTemplate') === 'on',
    };
    try {
      await api('/api/packs', { method: 'POST', body: JSON.stringify(payload) });
      setSheet(null); setTemplateSeed(null); await refresh(); showToast('Pack publicado. Ya aparece para rescatar.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'No pudimos publicar el pack.'); }
    finally { setBusy(false); }
  }

  async function updatePackStatus(pack: MerchantPack, status: 'published' | 'cancelled' | 'unsold') {
    setBusy(true);
    try {
      await api(`/api/packs/${pack.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refresh(); showToast(`Pack: ${statusCopy[status]}.`);
    } catch (caught) { showToast(caught instanceof Error ? caught.message : 'No pudimos actualizarlo.'); }
    finally { setBusy(false); }
  }

  async function collectByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const code = String(new FormData(event.currentTarget).get('code') ?? '').toUpperCase();
    try {
      await api('/api/merchant/collect', { method: 'POST', body: JSON.stringify({ code }) });
      event.currentTarget.reset(); await refresh(); showToast('Retiro confirmado. ¡Rescate completado!');
    } catch (caught) { showToast(caught instanceof Error ? caught.message : 'Código inválido.'); }
    finally { setBusy(false); }
  }

  if (!authUser) {
    return (
      <main className="auth-page">
        <div className="auth-art"><span>RESCASAP</span><b>🥐</b><i>🍅</i></div>
        <section className="auth-copy">
          <p className="eyebrow dark">PILOTO URUGUAY · RESCATE DE EXCEDENTES</p>
          <h1>Lo que sobra<br/>todavía <em>vale.</em></h1>
          <p>Comprá packs de comida a precio rescate antes del cierre. Menos desperdicio, más comida aprovechada.</p>
          <a className="primary-cta" href="/signin-with-chatgpt?return_to=%2F">Ingresar para rescatar <span>→</span></a>
          <small>Ingreso seguro. No necesitás crear otra contraseña.</small>
          <p className="pilot-auth-note">Estamos abriendo la primera versión pública. Los packs marcados como DEMO sirven para probar la experiencia y no generan un retiro real.</p>
        </section>
      </main>
    );
  }

  if (loading) return <main className="loading-page"><span className="brand">RESCASAP</span><div className="loader"/><p>Buscando excedentes cerca tuyo…</p></main>;

  if (!data?.profile) {
    return (
      <main className="onboarding-page">
        <div className="onboarding-brand"><span className="brand">RESCASAP</span><small>URUGUAY</small></div>
        <section className="onboarding-card">
          <p className="step-copy">PASO 1 DE 1</p>
          <h1>¿Cómo querés empezar?</h1>
          <p>Podés cambiar de modo cuando quieras.</p>
          <form onSubmit={saveProfile}>
            <label className="field"><span>Tu nombre</span><input name="name" defaultValue={authUser.fullName || authUser.displayName.split('@')[0]} required /></label>
            <div className="role-choice">
              <label><input type="radio" name="role" value="consumer" defaultChecked/><span><b>Quiero rescatar</b><small>Descubrir, reservar y retirar packs.</small></span></label>
              <label><input type="radio" name="role" value="merchant"/><span><b>Soy comercio</b><small>Publicar excedentes y recuperar valor.</small></span></label>
            </div>
            <label className="field"><span>Barrio o ciudad</span><input name="neighborhood" defaultValue="Montevideo" /></label>
            <details className="merchant-fields"><summary>Datos del comercio (si corresponde)</summary>
              <label className="field"><span>Nombre del comercio</span><input name="businessName" placeholder="Ej. Panadería La Esquina" /></label>
              <div className="form-row"><label className="field"><span>Rubro</span><select name="category"><option>Panadería</option><option>Restaurante</option><option>Cafetería</option><option>Frutería</option><option>Hotel</option><option>Supermercado</option></select></label>
              <label className="field"><span>Dirección</span><input name="address" placeholder="Calle y número" /></label></div>
            </details>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-cta" disabled={busy}>{busy ? 'Guardando…' : 'Entrar a RESCASAP'} <span>→</span></button>
          </form>
        </section>
        <aside className="onboarding-note"><b>VENDER → REDISTRIBUIR → APRENDER</b><p>Este MVP empieza recuperando valor. La siguiente capa conecta donaciones y ayuda a producir con menos merma.</p></aside>
      </main>
    );
  }

  const isMerchant = data.profile.role === 'merchant';
  const categories = ['Todos', ...Array.from(new Set(data.packs.map((pack) => pack.category)))];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand button-brand" onClick={() => setView(isMerchant ? 'merchant' : 'explore')}>RESCASAP</button>
        <div className="mode-switch">
          <button className={!isMerchant ? 'active' : ''} onClick={() => switchRole('consumer')} disabled={busy}>Rescatar</button>
          <button className={isMerchant ? 'active' : ''} onClick={() => switchRole('merchant')} disabled={busy}>Mi comercio</button>
        </div>
        <div className="top-actions">
          {!isMerchant && <button className="round-button" aria-label="Buscar" onClick={() => document.getElementById('search')?.focus()}>⌕</button>}
          <button className="profile-button" aria-label="Abrir perfil" onClick={() => setView('impact')}>{data.profile.name.slice(0, 2).toUpperCase()}</button>
        </div>
      </header>

      <aside className="pilot-banner"><b>VERSIÓN PILOTO</b><span>Los comercios identificados como DEMO son ejemplos y no ofrecen retiros reales. El pago disponible en esta etapa es al retirar.</span></aside>

      {isMerchant ? (
        <MerchantDashboard data={data} busy={busy} onCreate={(seed) => { setTemplateSeed(seed); setSheet('create'); }} onStatus={updatePackStatus} onCollect={collectByCode} />
      ) : view === 'explore' ? (
        <>
          <section className="hero" id="inicio">
            <button className="location-pill" onClick={requestLocation}><span>●</span> {locationLabel} <b>⌄</b></button>
            <p className="eyebrow">HOY CERCA TUYO</p>
            <h1>Comida rica.<br/><em>Cero desperdicio.</em></h1>
            <p className="hero-copy">Rescatá packs de comercios uruguayos antes de que cierre el día.</p>
            <div className="impact-strip">
              <div><strong>{impact.kg.toLocaleString('es-UY', { maximumFractionDigits: 1 })} kg</strong><span>rescatados por vos</span></div>
              <div><strong>{money(impact.saved)}</strong><span>ahorrados hasta hoy</span></div>
              <button onClick={() => setView('impact')}>Ver impacto <span>→</span></button>
            </div>
          </section>
          <section className="discovery-tools">
            <label className="search-box" htmlFor="search"><span>⌕</span><input id="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comercio, pack o barrio"/><kbd>UYU</kbd></label>
            <div className="category-row">{categories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}><span>{item === 'Todos' ? '✦' : categoryMarks[item] ?? '•'}</span>{item}</button>)}</div>
          </section>
          <section className="feed" aria-labelledby="packs-title">
            <div className="section-heading"><div><p className="eyebrow dark">LISTOS PARA RESCATAR</p><h2 id="packs-title">Se van hoy</h2></div><button className="text-button" onClick={() => setView('map')}>Ver mapa ↗</button></div>
            {visiblePacks.length ? <div className="pack-grid">{visiblePacks.map((pack) => (
              <article className="pack-card interactive" key={pack.id} onClick={() => { setSelectedPack(pack); setSheet('detail'); }}>
                <div className="pack-visual-wrap"><PackArt pack={pack}/><button className="heart" onClick={(event) => { event.stopPropagation(); showToast('Guardado en tus favoritos.'); }} aria-label={`Guardar ${pack.title}`}>♡</button></div>
                <div className="pack-body"><p className="shop-name">{pack.business_name} · {pack.neighborhood}{demoBusinessIds.has(pack.business_id) ? ' · DEMO' : ''}</p><h3>{pack.title}</h3>
                  <div className="pack-meta"><span>◷ {pack.pickup_start}–{pack.pickup_end}</span><span>⌖ {location ? `${distanceKm(location, pack).toFixed(1)} km` : pack.neighborhood}</span></div>
                  <div className="price-row"><div><strong>{money(pack.current_price)}</strong><s>{money(pack.normal_price)}</s></div><button aria-label={`Ver ${pack.title}`}>→</button></div>
                </div>
              </article>))}</div> : <div className="empty-state"><b>No encontramos packs con esos filtros.</b><p>Probá otro rubro o buscá en toda la zona.</p><button onClick={() => { setQuery(''); setCategory('Todos'); }}>Limpiar filtros</button></div>}
          </section>
          <section className="system-banner"><div><span>01</span><b>Vender</b><p>Recuperar valor hoy.</p></div><i>→</i><div><span>02</span><b>Redistribuir</b><p>Donar lo no vendido.</p></div><i>→</i><div><span>03</span><b>Aprender</b><p>Producir con menos merma.</p></div></section>
        </>
      ) : view === 'map' ? (
        <MapView packs={visiblePacks} onSelect={(pack) => { setSelectedPack(pack); setSheet('detail'); }} onLocate={requestLocation} locationLabel={locationLabel} />
      ) : view === 'history' ? (
        <HistoryView reservations={data.reservations} onOpen={(reservation) => { setActiveReservation(reservation); setSheet('success'); }} onCancel={cancelReservation} />
      ) : (
        <ImpactView impact={impact} profile={data.profile} />
      )}

      <nav className="bottom-nav" aria-label="Navegación principal">
        {isMerchant ? <>
          <button className="nav-link active" onClick={() => setView('merchant')}><span>▦</span>Panel</button>
          <button className="nav-link" onClick={() => setSheet('create')}><span>＋</span>Publicar</button>
          <button className="rescue-action" onClick={() => document.getElementById('collect-code')?.focus()} aria-label="Validar retiro"><span>⌁</span></button>
          <button className="nav-link" onClick={() => showToast('Historial visible en el panel.')}><span>◷</span>Historial</button>
          <button className="nav-link" onClick={() => switchRole('consumer')}><span>○</span>Explorar</button>
        </> : <>
          <button className={`nav-link ${view === 'explore' ? 'active' : ''}`} onClick={() => setView('explore')}><span>⌂</span>Explorar</button>
          <button className={`nav-link ${view === 'map' ? 'active' : ''}`} onClick={() => setView('map')}><span>⌖</span>Cerca</button>
          <button className="rescue-action" onClick={() => { const next = data.reservations.find((item) => item.status === 'reserved'); if (next) { setActiveReservation(next); setSheet('success'); } else showToast('Todavía no tenés retiros pendientes.'); }} aria-label="Mostrar código de retiro"><span>▦</span></button>
          <button className={`nav-link ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}><span>◷</span>Rescates</button>
          <button className={`nav-link ${view === 'impact' ? 'active' : ''}`} onClick={() => setView('impact')}><span>○</span>Impacto</button>
        </>}
      </nav>

      {sheet && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) { setSheet(null); setError(''); } }}>
        {sheet === 'detail' && selectedPack && <PackDetail pack={selectedPack} location={location} onClose={() => setSheet(null)} onCheckout={() => setSheet('checkout')} />}
        {sheet === 'checkout' && selectedPack && <Checkout pack={selectedPack} paymentMethod={paymentMethod} busy={busy} error={error} onBack={() => setSheet('detail')} onReserve={reserve} />}
        {sheet === 'success' && activeReservation && <ReservationTicket reservation={activeReservation} onClose={() => { setSheet(null); setActiveReservation(null); }} />}
        {sheet === 'create' && <CreatePack business={data.merchantBusiness} templates={data.templates} seed={templateSeed} busy={busy} error={error} onClose={() => { setSheet(null); setTemplateSeed(null); setError(''); }} onSubmit={createPack} />}
      </div>}
      {toast && <div className="toast" role="status">✓ {toast}</div>}
      {error && !sheet && <div className="global-error">{error}<button onClick={refresh}>Reintentar</button></div>}
    </main>
  );
}

function PackDetail({ pack, location, onClose, onCheckout }: { pack: Pack; location: { latitude: number; longitude: number } | null; onClose: () => void; onCheckout: () => void }) {
  return <section className="sheet detail-sheet"><button className="sheet-close" onClick={onClose}>×</button><PackArt pack={pack} large/>
    <div className="sheet-content"><p className="shop-name">{pack.category} · ★ {pack.rating}</p><h2>{pack.title}</h2><button className="merchant-link">{pack.business_name} · {pack.neighborhood} <span>→</span></button>
      <p className="detail-description">{pack.description}</p>
      {demoBusinessIds.has(pack.business_id) && <div className="demo-warning"><b>PACK DE DEMOSTRACIÓN</b><span>Podés probar la reserva, pero no concurras a esta dirección: este comercio todavía no está vinculado a RESCASAP.</span></div>}
      <div className="detail-facts"><div><span>◷</span><p><small>RETIRÁ HOY</small><b>{pack.pickup_start}–{pack.pickup_end}</b></p></div><div><span>⌖</span><p><small>DIRECCIÓN</small><b>{pack.address}</b><em>{location ? `${distanceKm(location, pack).toFixed(1)} km` : pack.neighborhood}</em></p></div><div><span>≈</span><p><small>CONTENIDO ESTIMADO</small><b>{pack.estimated_kg.toLocaleString('es-UY')} kg</b><em>El contenido exacto puede variar.</em></p></div></div>
      {pack.auto_discount ? <div className="dynamic-note"><span>↘</span><p><b>Precio inteligente activo</b>Si quedan packs {pack.discount_minutes} min antes del cierre, puede bajar hasta {money(pack.final_price ?? pack.current_price)}.</p></div> : null}
      <div className="sticky-checkout"><div><small>PRECIO RESCATE</small><b>{money(pack.current_price)}</b><s>{money(pack.normal_price)}</s></div><button onClick={onCheckout}>Reservar 1 pack <span>→</span></button></div>
    </div></section>;
}

function Checkout({ pack, paymentMethod, busy, error, onBack, onReserve }: { pack: Pack; paymentMethod: 'paid' | 'pay_at_store'; busy: boolean; error: string; onBack: () => void; onReserve: () => void }) {
  return <section className="sheet checkout-sheet"><header><button className="back-button" onClick={onBack}>←</button><div><p className="eyebrow dark">ÚLTIMO PASO</p><h2>Confirmá tu rescate</h2></div></header><div className="checkout-pack"><span>{toneMarks[pack.visual_tone] ?? '🥡'}</span><div><b>{pack.title}</b><small>{pack.business_name} · Retiro {pack.pickup_start}–{pack.pickup_end}</small></div><strong>{money(pack.current_price)}</strong></div>
    <fieldset className="payment-options"><legend>Forma de pago</legend><label className="selected"><input type="radio" checked={paymentMethod === 'pay_at_store'} readOnly/><span><b>Pago al retirar</b><small>Pagás directamente en el comercio cuando recibís el pack.</small></span><em>$</em></label><label className="coming-soon"><input type="radio" disabled/><span><b>Mercado Pago</b><small>Próximamente, cuando cada comercio vincule su cuenta.</small></span><em>MP</em></label></fieldset>
    {demoBusinessIds.has(pack.business_id) && <div className="demo-warning"><b>PRUEBA SIN RETIRO</b><span>Esta reserva es demostrativa y no genera una compra ni un retiro real.</span></div>}
    <div className="checkout-summary"><p><span>1 pack</span><b>{money(pack.current_price)}</b></p><p><span>Cargo de servicio</span><b>$ 0</b></p><p className="total"><span>Total</span><b>{money(pack.current_price)}</b></p></div>
    <label className="terms"><input type="checkbox" defaultChecked required/> Entiendo que el contenido es sorpresa y debo retirar dentro del horario.</label>{error && <p className="form-error">{error}</p>}<button className="primary-cta" disabled={busy} onClick={onReserve}>{busy ? 'Reservando…' : demoBusinessIds.has(pack.business_id) ? 'Probar reserva' : 'Confirmar reserva'} <span>→</span></button>
  </section>;
}

function ReservationTicket({ reservation, onClose }: { reservation: Reservation; onClose: () => void }) {
  const isDemo = demoPackIds.has(reservation.pack_id);
  return <section className="sheet ticket-sheet"><button className="sheet-close" onClick={onClose}>×</button><div className="success-mark">✓</div><p className="eyebrow dark">{isDemo ? 'PRUEBA COMPLETADA' : 'RESCATE CONFIRMADO'}</p><h2>{isDemo ? 'Así funciona una reserva' : '¡Ese pack es tuyo!'}</h2><p>{isDemo ? 'Este código demuestra el flujo. No concurras al comercio ni realices ningún pago.' : 'Mostrá este código cuando llegues. El comercio lo valida y listo.'}</p><CodeGrid code={reservation.pickup_code}/><strong className="pickup-code">{reservation.pickup_code}</strong><div className="ticket-info"><p><span>Comercio</span><b>{reservation.business_name}{isDemo ? ' · DEMO' : ''}</b></p><p><span>Retiro</span><b>{isDemo ? 'Sin retiro real' : `Hoy · ${reservation.pickup_start}–${reservation.pickup_end}`}</b></p><p><span>Dirección</span><b>{isDemo ? 'Ubicación de ejemplo' : `${reservation.address}, ${reservation.neighborhood}`}</b></p><p><span>Pago</span><b>{isDemo ? 'No corresponde' : reservation.payment_status === 'paid' ? `${money(reservation.unit_price)} · Pagado` : `${money(reservation.unit_price)} · Al retirar`}</b></p></div><button className="primary-cta" onClick={onClose}>Listo <span>✓</span></button></section>;
}

function MapView({ packs, onSelect, onLocate, locationLabel }: { packs: Pack[]; onSelect: (pack: Pack) => void; onLocate: () => void; locationLabel: string }) {
  return <section className="map-page"><div className="map-toolbar"><div><p className="eyebrow dark">MONTEVIDEO</p><h1>Packs cerca</h1></div><button onClick={onLocate}>⌖ {locationLabel}</button></div><div className="map-canvas"><div className="map-grid"/><span className="road r1"/><span className="road r2"/><span className="water">RÍO DE LA PLATA</span>{packs.map((pack, index) => <button className={`map-pin p${index % 4}`} onClick={() => onSelect(pack)} key={pack.id}><span>{money(pack.current_price)}</span><i>{toneMarks[pack.visual_tone] ?? '🥡'}</i></button>)}<div className="you-pin">●<span>Vos</span></div></div><div className="map-list">{packs.map((pack) => <button key={pack.id} onClick={() => onSelect(pack)}><span>{toneMarks[pack.visual_tone] ?? '🥡'}</span><div><b>{pack.title}</b><small>{pack.business_name}{demoBusinessIds.has(pack.business_id) ? ' · DEMO' : ''} · hasta {pack.pickup_end}</small></div><strong>{money(pack.current_price)}</strong></button>)}</div></section>;
}

function HistoryView({ reservations, onOpen, onCancel }: { reservations: Reservation[]; onOpen: (item: Reservation) => void; onCancel: (item: Reservation) => void }) {
  return <section className="simple-page"><div className="page-title"><p className="eyebrow dark">TU HISTORIAL</p><h1>Mis rescates</h1><p>Todo lo que evitaste que se desperdiciara.</p></div>{reservations.length ? <div className="history-list">{reservations.map((item) => <article key={item.id}><div className={`history-mark ${item.status}`}>{item.status === 'collected' ? '✓' : item.status === 'reserved' ? '▦' : '×'}</div><div><span className={`status-chip ${item.status}`}>{statusCopy[item.status]}</span><h3>{item.title}</h3><p>{item.business_name} · {item.pickup_start}–{item.pickup_end}</p><small>{new Date(item.created_at).toLocaleDateString('es-UY')}</small></div><div className="history-actions"><b>{money(item.unit_price)}</b>{item.status === 'reserved' && <><button onClick={() => onOpen(item)}>Ver código</button><button className="danger-link" onClick={() => onCancel(item)}>Cancelar</button></>}</div></article>)}</div> : <div className="empty-state"><b>Todavía no hiciste tu primer rescate.</b><p>Cuando reserves un pack, va a aparecer acá.</p></div>}</section>;
}

function ImpactView({ impact, profile }: { impact: { kg: number; saved: number; count: number }; profile: Profile }) {
  return <section className="impact-page"><div className="impact-hero"><p className="eyebrow">TU IMPACTO</p><h1>Lo pequeño<br/><em>se acumula.</em></h1><p>{profile.name}, cada pack mueve el sistema en la dirección correcta.</p></div><div className="impact-cards"><article><span>≈</span><strong>{impact.kg.toLocaleString('es-UY', { maximumFractionDigits: 1 })} kg</strong><p>de comida rescatada</p></article><article><span>$</span><strong>{money(impact.saved)}</strong><p>que no gastaste de más</p></article><article><span>↻</span><strong>{impact.count}</strong><p>rescates realizados</p></article></div><div className="impact-equivalent"><div className="plate-graphic"><i/><i/><i/></div><p><span>ESO EQUIVALE A</span><b>{Math.max(0, Math.round(impact.kg * 2.5))} porciones</b>que encontraron mesa en vez de basura.</p></div><section className="future-layers"><p className="eyebrow dark">LO QUE SIGUE</p><h2>Una plataforma que aprende.</h2><div><article><span>PRÓXIMO</span><b>Donar lo no vendido</b><p>Conectar packs aptos con organizaciones habilitadas al finalizar el día.</p><button disabled>En preparación</button></article><article><span>DESPUÉS</span><b>Predecir la merma</b><p>Usar el historial para sugerir cuánto producir y cuándo publicar.</p><button disabled>Arquitectura lista</button></article></div></section><p className="privacy-note">Tus métricas se calculan con tus rescates. No vendemos tus datos.</p></section>;
}

function MerchantDashboard({ data, busy, onCreate, onStatus, onCollect }: { data: BootstrapData; busy: boolean; onCreate: (seed?: Partial<Template> | null) => void; onStatus: (pack: MerchantPack, status: 'published' | 'cancelled' | 'unsold') => void; onCollect: (event: FormEvent<HTMLFormElement>) => void }) {
  const packs = data.merchantPacks;
  const active = packs.filter((pack) => pack.status === 'published').length;
  const reserved = packs.reduce((sum, pack) => sum + Number(pack.reservation_count ?? 0), 0);
  const kg = packs.reduce((sum, pack) => sum + (Number(pack.quantity_total) - Number(pack.quantity_available)) * Number(pack.estimated_kg), 0);
  const revenue = packs.reduce((sum, pack) => sum + Number(pack.revenue ?? 0), 0);
  return <section className="merchant-page"><header className="merchant-hero"><div><p className="eyebrow">PANEL DE COMERCIO</p><h1>{data.merchantBusiness?.name ?? 'Mi comercio'}</h1><p>{data.merchantBusiness?.category} · {data.merchantBusiness?.neighborhood}</p></div><button className="lime-button" onClick={() => onCreate(null)}>＋ Publicar excedente</button></header><div className="merchant-metrics"><article><span>PUBLICADOS HOY</span><strong>{active}</strong><small>packs activos</small></article><article><span>RESERVAS</span><strong>{reserved}</strong><small>confirmadas</small></article><article><span>COMIDA RESCATADA</span><strong>{kg.toLocaleString('es-UY', { maximumFractionDigits: 1 })} kg</strong><small>estimados</small></article><article><span>VALOR RECUPERADO</span><strong>{money(revenue)}</strong><small>en ventas rescate</small></article></div><div className="merchant-layout"><div><section className="merchant-section"><div className="merchant-section-title"><div><p className="eyebrow dark">INVENTARIO DE HOY</p><h2>Packs publicados</h2></div><button onClick={() => onCreate(null)}>Nuevo pack ＋</button></div>{packs.length ? <div className="merchant-pack-list">{packs.map((pack) => <article key={pack.id}><div className={`mini-art ${pack.visual_tone}`}>{toneMarks[pack.visual_tone] ?? '🥡'}</div><div className="merchant-pack-main"><span className={`status-chip ${pack.status}`}>{statusCopy[pack.status]}</span><h3>{pack.title}</h3><p>Retiro {pack.pickup_start}–{pack.pickup_end} · {pack.quantity_available}/{pack.quantity_total} disponibles</p><div className="stock-bar"><i style={{ width: `${Math.max(0, pack.quantity_available / pack.quantity_total) * 100}%` }}/></div></div><div className="merchant-pack-value"><b>{money(pack.current_price)}</b><small>{pack.reservation_count} reservas</small></div><div className="more-menu">{pack.status === 'published' ? <><button disabled={busy} onClick={() => onStatus(pack, 'unsold')}>Marcar no vendido</button><button disabled={busy} onClick={() => onStatus(pack, 'cancelled')}>Cancelar</button></> : <button disabled={busy} onClick={() => onStatus(pack, 'published')}>Republicar</button>}</div></article>)}</div> : <div className="empty-state"><b>No hay packs publicados.</b><p>Creá el primero en menos de un minuto.</p></div>}</section><section className="merchant-section templates-section"><div className="merchant-section-title"><div><p className="eyebrow dark">ATAJOS</p><h2>Plantillas recurrentes</h2></div></div>{data.templates.length ? <div className="template-grid">{data.templates.map((template) => <button key={template.id} onClick={() => onCreate(template)}><span>↻</span><b>{template.title}</b><small>{money(template.rescue_price)} · {template.pickup_start}–{template.pickup_end}</small><em>Usar plantilla →</em></button>)}</div> : <div className="template-empty"><span>↻</span><p><b>Publicá más rápido mañana.</b>Marcá “Guardar como plantilla” al crear un pack.</p></div>}</section></div><aside className="merchant-side"><section className="collect-card"><p className="eyebrow">VALIDAR RETIRO</p><h2>Ingresá el código</h2><p>Pedile al cliente el código de 6 caracteres.</p><form onSubmit={onCollect}><input id="collect-code" name="code" placeholder="ABC-123" pattern="[A-Za-z]{3}-[0-9]{3}" maxLength={7} required/><button disabled={busy}>Confirmar retiro →</button></form></section><section className="future-card"><span>PRÓXIMA CAPA</span><h3>Donación automática</h3><p>Al cerrar, lo no vendido podrá ofrecerse a organizaciones habilitadas.</p><div><i/>Módulo preparado</div></section><section className="tip-card"><b>Idea para hoy</b><p>Los packs publicados al menos 90 min antes del cierre tienen más tiempo para encontrar rescatista.</p></section></aside></div></section>;
}

function CreatePack({ business, templates, seed, busy, error, onClose, onSubmit }: { business: Business | null; templates: Template[]; seed: Partial<Template> | null; busy: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const key = seed?.id ?? 'new';
  return <section className="sheet create-sheet" key={key}><button className="sheet-close" onClick={onClose}>×</button><p className="eyebrow dark">{business?.name ?? 'MI COMERCIO'}</p><h2>Publicar un pack</h2><p>Lo esencial, sin vueltas. Va a quedar visible apenas confirmes.</p>{templates.length > 0 && !seed && <div className="template-hint">Tenés {templates.length} plantilla{templates.length > 1 ? 's' : ''} guardada{templates.length > 1 ? 's' : ''}. Podés usarla desde el panel.</div>}<form className="create-form" onSubmit={onSubmit}><label className="field wide"><span>Nombre del pack *</span><input name="title" defaultValue={seed?.title ?? ''} placeholder="Ej. Bolsa sorpresa de panadería" required/></label><label className="field wide"><span>¿Qué puede incluir?</span><textarea name="description" defaultValue={seed?.description ?? ''} placeholder="Contalo sin prometer contenido exacto." rows={3}/></label><div className="form-row triple"><label className="field"><span>Cantidad *</span><input name="quantity" type="number" min="1" max="99" defaultValue="4" required/></label><label className="field"><span>Peso aprox. / pack</span><div className="unit-input"><input name="estimatedKg" type="number" step="0.1" min="0.1" defaultValue={seed?.estimated_kg ?? 1}/><b>kg</b></div></label><label className="field"><span>Precio habitual *</span><div className="unit-input"><b>$</b><input name="normalPrice" type="number" min="1" defaultValue={seed?.normal_price ?? 600} required/></div></label></div><div className="form-row"><label className="field"><span>Precio rescate *</span><div className="unit-input rescue"><b>$</b><input name="rescuePrice" type="number" min="1" defaultValue={seed?.rescue_price ?? 220} required/></div></label><label className="field"><span>Retiro desde *</span><input name="pickupStart" type="time" defaultValue={seed?.pickup_start ?? '19:00'} required/></label><label className="field"><span>Retiro hasta *</span><input name="pickupEnd" type="time" defaultValue={seed?.pickup_end ?? '19:45'} required/></label></div><details className="automation-box" open={Boolean(seed?.auto_discount)}><summary><span>↘</span><p><b>Bajada automática de precio</b><small>Opcional · ayuda a vender lo último</small></p></summary><label className="toggle-line"><input name="autoDiscount" type="checkbox" defaultChecked={Boolean(seed?.auto_discount)}/><span/>Activar reducción antes del cierre</label><div className="form-row"><label className="field"><span>Precio final</span><div className="unit-input"><b>$</b><input name="finalPrice" type="number" defaultValue={seed?.final_price ?? 160}/></div></label><label className="field"><span>Minutos antes</span><input name="discountMinutes" type="number" defaultValue={seed?.discount_minutes ?? 20}/></label></div></details><label className="save-template"><input name="saveTemplate" type="checkbox" defaultChecked={!seed}/><span>↻</span><p><b>Guardar como plantilla recurrente</b><small>Mañana solo cambiás cantidad y publicás.</small></p></label>{error && <p className="form-error">{error}</p>}<div className="form-actions"><button type="button" onClick={onClose}>Cancelar</button><button className="primary-cta" disabled={busy}>{busy ? 'Publicando…' : 'Publicar ahora'} <span>→</span></button></div></form></section>;
}
