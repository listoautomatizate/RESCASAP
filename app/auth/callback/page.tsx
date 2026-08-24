'use client';

import { useEffect, useState } from 'react';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Confirmando tu ingreso…');

  useEffect(() => {
    async function completeSignIn() {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresIn = Number(params.get('expires_in') || 3600);
      if (!accessToken || !refreshToken) throw new Error('El enlace es inválido o venció. Volvé a solicitarlo desde RESCASAP.');
      window.history.replaceState({}, '', '/auth/callback');
      const response = await fetch('/api/auth/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken, expiresIn }),
      });
      if (!response.ok) throw new Error('No pudimos validar el enlace.');
      window.location.replace('/');
    }
    completeSignIn().catch((error) => setMessage(error instanceof Error ? error.message : 'No pudimos ingresar.'));
  }, []);

  return <main className="loading-page"><span className="brand">RESCASAP</span><div className="loader"/><p>{message}</p></main>;
}
