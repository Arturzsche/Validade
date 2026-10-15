import { useRef, useState } from 'react';
import { compressImage } from '../../lib/photos.js';

/**
 * "Tirar foto": abre a câmera traseira (capture="environment") no celular; no computador,
 * abre o seletor de arquivos. A foto é reduzida no aparelho antes de subir.
 */
export default function PhotoButton({ onPhoto, hasPhoto = false, busy = false, className = '' }) {
  const input = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite tirar outra foto igual em seguida
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      await onPhoto(await compressImage(file));
    } catch (err) {
      setError(err?.message ?? 'Não foi possível usar a foto');
    } finally {
      setProcessing(false);
    }
  }

  const working = processing || busy;
  return (
    <div className={className}>
      <input ref={input} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={working}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-stone-700 ring-1 ring-inset ring-stone-300 transition-colors hover:bg-stone-50 active:bg-stone-100 disabled:opacity-60"
      >
        <CameraIcon />
        {working ? 'Salvando foto…' : hasPhoto ? 'Trocar foto' : 'Tirar foto'}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" strokeLinejoin="round" />
    <circle cx="12" cy="12.5" r="3.2" />
  </svg>
);
