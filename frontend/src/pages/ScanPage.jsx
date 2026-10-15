import { useCallback, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuickEntry } from '../hooks/useQuickEntry.js';
import AppShell from '../components/layout/AppShell.jsx';
import BarcodeScanner from '../components/scan/BarcodeScanner.jsx';
import ManualCodeModal from '../components/scan/ManualCodeModal.jsx';
import NewProductModal from '../components/scan/NewProductModal.jsx';
import ProductCard from '../components/scan/ProductCard.jsx';
import BatchEntryForm from '../components/scan/BatchEntryForm.jsx';
import RecentEntries from '../components/scan/RecentEntries.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import Toast from '../components/ui/Toast.jsx';
import { describeDays } from '../components/ui/SemaphoreBadge.jsx';

/** Tela 1 — Leitura de código de barras e registro rápido de validade (uso do operador). */
export default function ScanPage() {
  const { session } = useAuth();
  const [toast, setToast] = useState(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const onSaved = useCallback((batch) => {
    const urgent = batch.semaphore === 'red';
    setToast({
      tone: urgent ? 'warning' : 'success',
      title: batch.merged ? `+${batch.addedQuantity} un. somadas ao que já estava registrado` : 'Produto registrado! 🎉',
      message: `${batch.product.name} · ${describeDays(batch.daysToExpiry)}${urgent ? ' · dono avisado' : ''}${
        batch.photoFailed ? ' · a foto não subiu, tente de novo depois' : ''
      }`,
    });
  }, []);

  const onError = useCallback((message) => setToast({ tone: 'error', title: 'Não foi possível buscar o produto', message }), []);

  const flow = useQuickEntry({ onSaved, onError });
  const { store } = session;

  return (
    <AppShell title="Registrar produtos">
      <main className="mx-auto max-w-md space-y-5 px-4 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h1 className="text-2xl font-black text-stone-900 sm:hidden">Registrar produtos <span aria-hidden="true">📷</span></h1>
        {flow.step === 'scan' && (
          <>
            <div className="h-[min(62dvh,520px)]">
              <BarcodeScanner onDetected={flow.handleDetected} onManualEntry={flow.openManual} ignoreCode={flow.lastCode} />
            </div>
            <RecentEntries entries={flow.recent} />
          </>
        )}

        {flow.step === 'lookup' && (
          <div className="flex h-[min(62dvh,520px)] flex-col items-center justify-center gap-3 rounded-3xl bg-white text-stone-600 ring-1 ring-stone-200">
            <Spinner className="h-10 w-10 text-emerald-600" />
            <p className="font-medium">Buscando {flow.barcode}…</p>
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
              <div className="rounded-3xl bg-white p-4 text-stone-500 ring-1 ring-stone-200">
                Código <span className="font-semibold tabular-nums text-stone-700">{flow.barcode}</span> · aguardando cadastro
              </div>
            )}

            {/* key: formulário limpo a cada novo código lido */}
            <section key={flow.barcode} className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-stone-900/5">
              <BatchEntryForm
                thresholds={store}
                saving={flow.saving}
                apiError={flow.apiError}
                onSubmit={(entry) => (flow.displayProduct ? flow.save(entry) : flow.editDraft())}
                onCancel={flow.reset}
              />
            </section>
          </>
        )}
      </main>

      <ManualCodeModal open={flow.modal === 'manual'} onClose={flow.closeModal} onSubmit={flow.handleDetected} />

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
