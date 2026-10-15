import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { api, errorMessage } from '../../lib/api.js';

/**
 * Confirmação de exclusão. Excluir sempre funciona: com histórico o produto é arquivado
 * (some do catálogo, histórico fica); itens ainda na prateleira continuam no painel até a baixa.
 */
export default function DeleteProductModal({ product, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const onShelf = product.activeBatches > 0;

  async function confirm() {
    setDeleting(true);
    setError(null);
    try {
      await api(`/products/${product.id}`, { method: 'DELETE' });
      onDeleted(product);
    } catch (err) {
      setError(errorMessage(err));
      setDeleting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Excluir produto?" subtitle={product.name}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          Ele sai do catálogo. O histórico de validades continua guardado e, se você ler este código de barras de
          novo, o produto volta. 👍
        </p>
        {onShelf && (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            ⚠️ Ainda há <strong>{product.activeBatches} {product.activeBatches === 1 ? 'registro' : 'registros'} na prateleira</strong>.
            {product.activeBatches === 1 ? ' Ele continua' : ' Eles continuam'} no painel e nos alertas até você dar baixa, para
            nenhum vencimento passar despercebido.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="danger" block onClick={confirm} loading={deleting}>
            🗑️ Excluir do catálogo
          </Button>
          <Button variant="ghost" block onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
