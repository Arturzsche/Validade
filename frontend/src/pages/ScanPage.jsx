import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuickEntry } from '../hooks/useQuickEntry.js';
import AppShell from '../components/layout/AppShell.jsx';
import BarcodeInput from '../components/scan/BarcodeInput.jsx';
import BarcodeScanner from '../components/scan/BarcodeScanner.jsx';
import NewProductModal from '../components/scan/NewProductModal.jsx';
import ProductCard from '../components/scan/ProductCard.jsx';
import BatchEntryForm from '../components/scan/BatchEntryForm.jsx';
import RecentEntries from '../components/scan/RecentEntries.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Toast from '../components/ui/Toast.jsx';
import { describeDays } from '../components/ui/SemaphoreBadge.jsx';

// Mouse/teclado (computador do caixa com leitor USB): o foco sempre volta para o código.
const finePointer = () => Boolean(window.matchMedia?.('(pointer: fine)').matches);

/**
 * Tela 1 — Entrada em "modo metralhadora": lê o código → digita a validade → Enter.
 * O formulário limpa sozinho e o foco volta para o campo do código, sem modal nem clique extra.
 * No celular usando a câmera o foco não volta para o campo (o teclado cobriria a câmera),
 * a menos que o operador esteja digitando os códigos.
 */
export default function ScanPage() {
  const { session } = useAuth();
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);
  const codeRef = useRef(null);
  const keyboardMode = useRef(finePointer());

  const focusCode = useCallback(() => {
    requestAnimationFrame(() => codeRef.current?.focus());
  }, []);

  const onSaved = useCallback((batch) => {
    const urgent = batch.semaphore === 'red';
    setToast({
      tone: urgent ? 'warning' : 'success',
      title: batch.merged ? `+${batch.addedQuantity} un. somadas ao que já estava registrado` : 'Produto registrado',
      message: `${batch.product.name} · ${describeDays(batch.daysToExpiry)}${batch.photoFailed ? ' · a foto não subiu, tente de novo depois' : ''}`,
    });
  }, []);

  const onError = useCallback((message) => setToast({ tone: 'error', title: 'Não foi possível buscar o produto', message }), []);

  const flow = useQuickEntry({ onSaved, onError });
  const { store } = session;

  // Voltou para a leitura (salvou, cancelou, desistiu do cadastro ou deu erro): próximo código
  useEffect(() => {
    if (flow.step === 'scan' && keyboardMode.current) focusCode();
  }, [flow.step, focusCode]);

  const fromKeyboard = (code) => {
    keyboardMode.current = true;
    flow.handleDetected(code);
  };
  const fromCamera = (code) => {
    keyboardMode.current = finePointer();
    flow.handleDetected(code);
  };

  return (
    <AppShell title="Entrada de produtos">
      <main className="mx-auto max-w-md space-y-4 px-4 pt-5 pb-6">
        <h1 className="text-xl font-semibold text-stone-900 sm:hidden">Entrada de produtos</h1>

        <BarcodeInput ref={codeRef} onSubmit={fromKeyboard} busy={flow.step === 'lookup'} />

        {flow.step === 'scan' && (
          <div className="h-[min(52dvh,440px)]">
            <BarcodeScanner onDetected={fromCamera} onManualEntry={focusCode} ignoreCode={flow.lastCode} />
          </div>
        )}

        {flow.step === 'lookup' && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl bg-white text-stone-600 ring-1 ring-stone-200">
            <Spinner className="h-8 w-8 text-emerald-600" />
            <p className="text-sm">Buscando {flow.barcode}…</p>
          </div>
        )}

        {flow.step === 'form' && (
          <>
            {flow.displayProduct ? (
              <ProductCard
                product={flow.displayProduct}
                barcode={flow.barcode}
                isNew={flow.isNewProduct}
                onEdit={flow.editDraft}
                onPhoto={flow.addPhoto}
                previewSrc={flow.photo?.previewUrl}
                photoBusy={flow.photoBusy}
              />
            ) : (
              <div className="rounded-2xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">
                Código <span className="font-medium tabular-nums text-stone-700">{flow.barcode}</span> · aguardando cadastro
              </div>
            )}

            {/* key: formulário limpo a cada código lido; remonta (e foca a validade) quando o produto aparece */}
            <section
              key={`${flow.barcode}-${Boolean(flow.displayProduct)}`}
              className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-stone-200"
            >
              <BatchEntryForm
                thresholds={store}
                saving={flow.saving}
                apiError={flow.apiError}
                autoFocusDate={Boolean(flow.displayProduct) && !flow.modal}
                onSubmit={(entry) => (flow.displayProduct ? flow.save(entry) : flow.editDraft())}
                onCancel={flow.reset}
              />
            </section>
          </>
        )}

        <RecentEntries entries={flow.recent} />
      </main>

      <NewProductModal
        open={flow.modal === 'newProduct'}
        barcode={flow.barcode}
        initial={flow.draft}
        suggestion={flow.suggestion}
        onClose={flow.closeNewProduct}
        onSubmit={flow.submitNewProduct}
        onPhoto={flow.addPhoto}
        photoPreview={flow.photo?.previewUrl}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </AppShell>
  );
}
