import { useCallback, useRef, useState } from 'react';
import { api, ApiError, errorMessage } from '../lib/api.js';
import { lookupOpenFoodFacts } from '../lib/openFoodFacts.js';
import { scanFeedback, vibrate } from '../lib/feedback.js';

/**
 * Máquina de estados da Entrada Rápida:
 *
 *   scan ──(leu código)──> lookup ──(produto existe)──────────────> form ──(salvou)──> scan
 *                                └─(404)──> form + modal "Produto novo" ──┘
 *   form ──(POST /batches 422 PRODUCT_NOT_FOUND)──> modal "Produto novo" ──> salva automaticamente
 */
const initial = {
  step: 'scan', // scan | lookup | form
  barcode: null,
  product: null, // produto já cadastrado (GET /products/barcode/:code)
  draft: null, // rascunho de produto novo (vai junto no POST /batches)
  suggestion: null, // dados do Open Food Facts
  modal: null, // null | 'manual' | 'newProduct'
  pendingEntry: null, // lote aguardando o cadastro do produto (fluxo 422)
  saving: false,
  apiError: null,
};

export function useQuickEntry({ onSaved, onError }) {
  const [state, setState] = useState(initial);
  const [recent, setRecent] = useState([]);
  const [lastCode, setLastCode] = useState(null); // scanner ignora enquanto ainda estiver no quadro
  const requestId = useRef(0); // descarta respostas de leituras canceladas
  const patch = useCallback((p) => setState((s) => ({ ...s, ...p })), []);

  const barcodeRef = useRef(null);
  barcodeRef.current = state.barcode;

  const reset = useCallback(() => {
    requestId.current += 1;
    if (barcodeRef.current) setLastCode(barcodeRef.current);
    setState(initial);
  }, []);

  const handleDetected = useCallback(
    async (code) => {
      scanFeedback();
      const id = ++requestId.current;
      setState({ ...initial, step: 'lookup', barcode: code });

      const suggestionPromise = lookupOpenFoodFacts(code); // em paralelo com a API

      try {
        const product = await api(`/products/barcode/${code}`);
        if (id !== requestId.current) return;
        patch({ step: 'form', product });

        // Produto sem foto cadastrada: mostra a da base pública só para conferência visual
        if (!product.imageUrl) {
          const info = await suggestionPromise;
          if (id === requestId.current && info?.imageUrl) {
            setState((s) => (s.product ? { ...s, product: { ...s.product, imageUrl: info.imageUrl } } : s));
          }
        }
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof ApiError && err.status === 404) {
          const suggestion = await suggestionPromise;
          if (id !== requestId.current) return;
          patch({ step: 'form', suggestion, modal: 'newProduct' });
        } else {
          vibrate([80, 60, 80]);
          onError?.(errorMessage(err));
          reset();
        }
      }
    },
    [patch, reset, onError],
  );

  const save = useCallback(
    async (entry, draftOverride) => {
      const draft = draftOverride ?? state.draft;
      const id = requestId.current;
      patch({ saving: true, apiError: null });

      try {
        const res = await api('/batches', {
          method: 'POST',
          body: { barcode: state.barcode, ...entry, ...(draft && { product: draft }) },
        });
        if (id !== requestId.current) return;
        const saved = { ...res.batch, merged: res.merged, addedQuantity: entry.quantity };
        setRecent((list) => [saved, ...list.filter((b) => b.id !== saved.id)].slice(0, 5));
        onSaved?.(saved);
        reset();
      } catch (err) {
        if (id !== requestId.current) return;
        if (err instanceof ApiError && err.code === 'PRODUCT_NOT_FOUND') {
          // Produto sumiu entre a leitura e o salvamento (ex: removido pelo dono): pede o cadastro
          // e salva o lote assim que o operador confirmar, sem precisar redigitar nada
          patch({ saving: false, product: null, draft: null, modal: 'newProduct', pendingEntry: entry });
          return;
        }
        vibrate([80, 60, 80]);
        patch({ saving: false, apiError: errorMessage(err) });
      }
    },
    [state.barcode, state.draft, patch, reset, onSaved],
  );

  const submitNewProduct = useCallback(
    (draft) => {
      const pending = state.pendingEntry;
      patch({ draft, modal: null, pendingEntry: null });
      if (pending) save(pending, draft);
    },
    [state.pendingEntry, patch, save],
  );

  const closeNewProduct = useCallback(() => {
    // Fechar sem nunca ter preenchido = desistir deste código
    if (!state.draft) reset();
    else patch({ modal: null });
  }, [state.draft, patch, reset]);

  return {
    ...state,
    recent,
    lastCode,
    displayProduct: state.product ?? state.draft,
    isNewProduct: !state.product && Boolean(state.draft),
    handleDetected,
    save,
    reset,
    submitNewProduct,
    closeNewProduct,
    openManual: () => patch({ modal: 'manual' }),
    closeModal: () => patch({ modal: null }),
    editDraft: () => patch({ modal: 'newProduct' }),
  };
}
