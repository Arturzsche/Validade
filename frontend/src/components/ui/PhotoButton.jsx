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
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-amber-100 px-4 text-sm font-bold text-amber-900 shadow-sm ring-1 ring-amber-200 transition-transform duration-150 motion-safe:active:scale-95 disabled:opacity-60 md:hover:bg-amber-200 motion-safe:md:hover:-translate-y-0.5"
      >
        <span aria-hidden="true">📸</span>
        {working ? 'Salvando foto…' : hasPhoto ? 'Trocar foto' : 'Tirar foto'}
      </button>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
