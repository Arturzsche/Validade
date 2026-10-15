import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';

// Formatos de código de barras de varejo (produtos com EAN/UPC + CODE_128 de etiquetas internas)
const FORMATS = ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128'];
const IGNORE_GAP_MS = 1200;

const ERRORS = {
  insecure: {
    title: 'Câmera indisponível',
    text: 'O navegador só libera a câmera em sites seguros (https). Use o campo de digitação abaixo.',
  },
  denied: {
    title: 'Permita o acesso à câmera',
    text: 'Toque no ícone de cadeado na barra de endereço, libere a câmera e tente de novo.',
  },
  nocamera: { title: 'Nenhuma câmera encontrada', text: 'Digite o código de barras manualmente.' },
  generic: { title: 'Não foi possível abrir a câmera', text: 'Feche outros apps que estejam usando a câmera e tente de novo.' },
};

function classifyError(err) {
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') return 'denied';
  if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') return 'nocamera';
  return 'generic';
}

/**
 * Abre a câmera traseira e lê códigos de barras continuamente (zxing).
 * Dispara `onDetected(code)` uma única vez por montagem — o pai desmonta o
 * componente ao avançar para o formulário, o que também desliga a câmera.
 */
export default function BarcodeScanner({ onDetected, onManualEntry, ignoreCode }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const handledRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  // Depois de salvar, o produto costuma continuar na frente da câmera. O último código
  // só volta a valer depois de sumir do quadro por IGNORE_GAP_MS (afastar e apontar de novo).
  const ignoreRef = useRef({ code: ignoreCode, lastSeen: Date.now() });
  const [ignoring, setIgnoring] = useState(false);

  const [status, setStatus] = useState('starting'); // starting | running | error
  const [errorKind, setErrorKind] = useState(null);
  const [torch, setTorch] = useState({ available: false, on: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;
    setStatus('starting');

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setErrorKind('insecure');
      setStatus('error');
      return undefined;
    }

    (async () => {
      try {
        // Import dinâmico: a lib de leitura (~400 kB) não pesa no carregamento inicial
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, FORMATS.map((f) => BarcodeFormat[f])]]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

        const controls = await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          },
          videoRef.current,
          (result) => {
            if (!result || handledRef.current) return;
            const code = result.getText().replace(/\D/g, '');
            if (code.length < 6 || code.length > 14) return; // etiqueta interna não numérica

            const ignored = ignoreRef.current;
            if (code === ignored.code) {
              const now = Date.now();
              const stillInFrame = now - ignored.lastSeen < IGNORE_GAP_MS;
              ignored.lastSeen = now;
              if (stillInFrame) {
                setIgnoring(true);
                return;
              }
            }

            handledRef.current = true;
            controlsRef.current?.stop();
            onDetectedRef.current(code);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setTorch({ available: typeof controls.switchTorch === 'function', on: false });
        setStatus('running');
      } catch (err) {
        if (cancelled) return;
        setErrorKind(classifyError(err));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [attempt]);

  async function toggleTorch() {
    const next = !torch.on;
    try {
      await controlsRef.current?.switchTorch?.(next);
      setTorch((t) => ({ ...t, on: next }));
    } catch {
      setTorch({ available: false, on: false });
    }
  }

  if (status === 'error') {
    const e = ERRORS[errorKind] ?? ERRORS.generic;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-stone-900 px-6 py-10 text-center text-white">
        <CameraOffIcon />
        <div>
          <p className="text-lg font-bold">{e.title}</p>
          <p className="mt-1 text-sm text-stone-300">{e.text}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button onClick={onManualEntry} block>
            Digitar código
          </Button>
          {errorKind !== 'insecure' && (
            <Button variant="dark" onClick={() => setAttempt((n) => n + 1)} block>
              Tentar de novo
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-3xl bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

      {/* Moldura de mira: escurece tudo fora do retângulo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[38%] w-[82%] rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]">
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-emerald-400 ${c}`} />
          ))}
          {status === 'running' && (
            <span className="animate-scanline absolute inset-x-3 h-0.5 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.7)]" />
          )}
        </div>
      </div>

      <p className="pointer-events-none absolute inset-x-0 top-4 text-center text-sm font-medium text-white/90">
        {status === 'starting'
          ? 'Abrindo câmera…'
          : ignoring
            ? 'Produto já registrado. Afaste e aponte de novo para somar.'
            : 'Aponte para o código de barras'}
      </p>

      <div className="absolute inset-x-0 bottom-0 flex gap-3 p-4">
        <Button variant="dark" onClick={onManualEntry} className="flex-1">
          <KeyboardIcon /> Digitar código
        </Button>
        {torch.available && (
          <Button
            variant="dark"
            onClick={toggleTorch}
            aria-pressed={torch.on}
            aria-label={torch.on ? 'Desligar lanterna' : 'Ligar lanterna'}
            className={`w-14 !px-0 ${torch.on ? '!bg-amber-400 !text-stone-900' : ''}`}
          >
            <FlashIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

const KeyboardIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" strokeLinecap="round" />
  </svg>
);

const FlashIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);

const CameraOffIcon = () => (
  <svg viewBox="0 0 24 24" className="h-12 w-12 text-stone-400" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M3 3l18 18M10.5 5H15l2 2h2a2 2 0 0 1 2 2v8.5M17 19H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.5 10.5a3 3 0 0 0 4 4" strokeLinecap="round" />
  </svg>
);
