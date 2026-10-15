import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { api, errorMessage } from '../../lib/api.js';

/** Confirmação de exclusão. Produto com itens na prateleira não pode sair do catálogo. */
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
        {onShelf ? (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            Este produto ainda tem <strong>{product.activeBatches} {product.activeBatches === 1 ? 'registro' : 'registros'} de validade na prateleira</strong>.
            Dê baixa na tela de registro (vendido ou descartado) antes de excluir, para nenhum vencimento sumir do painel.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Ele sai do catálogo. O histórico de validades continua guardado e, se você ler este código de barras de novo,
            o produto volta.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="danger" block onClick={confirm} loading={deleting} disabled={onShelf}>
            Excluir do catálogo
          </Button>
          <Button variant="ghost" block onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
