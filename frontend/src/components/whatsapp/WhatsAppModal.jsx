import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Spinner from '../ui/Spinner.jsx';
import AlertRecipientForm from './AlertRecipientForm.jsx';
import { api } from '../../lib/api.js';
import { channelLevel, formatJidPhone } from '../../lib/whatsapp.js';

const QR_POLL_MS = 2000; // o WhatsApp troca o QR a cada ~20s; o painel acompanha sozinho
const STATUS_POLL_MS = 5000;

/**
 * Conexão do WhatsApp sem acesso ao terminal: mostra o QR atualizado para o
 * administrador escanear, confirma quando conecta e permite testar o envio.
 */
export default function WhatsAppModal({ open, onClose, status, onStatus }) {
  const level = channelLevel(status);
  const canManage = Boolean(status?.canManage);
  const [qr, setQr] = useState(null);
  const [restarting, setRestarting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const previousLevel = useRef(level);

  // Polling enquanto o modal está aberto
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let kicked = false;

    async function tick() {
      try {
        if (canManage) {
          const data = await api('/notifications/whatsapp/qr');
          if (cancelled) return;
          setQr(data.qr);
          onStatus(data);
          // Parado ou esperando backoff longo e sem QR: pede um agora (uma vez por abertura).
          // 'replaced' NÃO entra aqui — retomar a sessão de outra instância exige clique explícito.
          if (!kicked && !data.qr && ['stopped', 'idle', 'reconnecting'].includes(data.state)) {
            kicked = true;
            onStatus(await api('/notifications/whatsapp/reconnect', { method: 'POST' }));
          }
        } else {
          const data = await api('/notifications/status');
          if (!cancelled) onStatus(data);
        }
      } catch {
        // rede instável: tenta no próximo ciclo
      }
    }

    tick();
    const id = setInterval(tick, canManage ? QR_POLL_MS : STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, canManage, onStatus]);

  // Comemora a transição para "conectado" enquanto o modal está aberto
  useEffect(() => {
    if (open && level === 'connected' && ['disconnected', 'connecting'].includes(previousLevel.current)) {
      setJustConnected(true);
    }
    if (!open) setJustConnected(false);
    previousLevel.current = level;
  }, [open, level]);

  async function restart() {
    setRestarting(true);
    setQr(null);
    try {
      onStatus(await api('/notifications/whatsapp/reconnect', { method: 'POST' }));
    } finally {
      setRestarting(false);
    }
  }

  const subtitle = {
    connected: 'Os alertas de vencimento estão sendo enviados.',
    connecting: 'Restabelecendo a conexão…',
    disconnected: 'Os alertas ficam guardados e saem assim que reconectar.',
    simulated: 'Modo simulação: as mensagens aparecem no log do servidor.',
    unknown: 'Não foi possível consultar o servidor.',
  }[level];

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp" subtitle={subtitle}>
      <div className="space-y-5">
        {level === 'connected' && (
          <div className={`flex items-center gap-3 rounded-2xl p-4 ring-1 ${justConnected ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-emerald-50 text-emerald-900 ring-emerald-200'}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl ${justConnected ? 'bg-white/20' : 'bg-emerald-500 text-white'}`} aria-hidden="true">
              ✓
            </span>
            <div>
              <p className="font-bold">{justConnected ? 'Conectado com sucesso!' : 'Conectado'}</p>
              {status?.me && <p className="text-sm opacity-90">Enviando pelo número {formatJidPhone(status.me)}</p>}
              {justConnected && <p className="text-sm opacity-90">Alertas pendentes estão sendo enviados agora.</p>}
            </div>
          </div>
        )}

        {level === 'connecting' && (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-200">
            <Spinner className="h-6 w-6 shrink-0" />
            <p className="text-sm">A conexão caiu e está sendo restabelecida automaticamente. Normalmente leva poucos segundos.</p>
          </div>
        )}

        {level === 'disconnected' && canManage && (
          <section aria-labelledby="qr-title" className="space-y-4">
            {status?.state === 'replaced' ? (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
                <p className="font-semibold">A sessão foi aberta em outro lugar.</p>
                <p className="mt-1">Outra instância do servidor assumiu o número. Retome aqui só se ela não estiver mais em uso.</p>
                <Button size="md" variant="danger" className="mt-3" onClick={restart} loading={restarting}>
                  Retomar sessão aqui
                </Button>
              </div>
            ) : (
              <>
                <h3 id="qr-title" className="sr-only">
                  QR Code de conexão
                </h3>
                <div className="mx-auto grid h-64 w-64 place-items-center rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                  {qr ? (
                    <img src={qr} alt="QR Code para conectar o WhatsApp" className="h-full w-full [image-rendering:pixelated]" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Spinner className="h-8 w-8 text-emerald-600" />
                      <p className="text-sm">Gerando QR Code…</p>
                    </div>
                  )}
                </div>
                <ol className="space-y-2 text-sm text-slate-700">
                  {['Abra o WhatsApp no celular que vai enviar os alertas', 'Toque em ⋮ (ou Configurações) › Aparelhos conectados', 'Toque em Conectar aparelho e aponte a câmera para o código'].map(
                    (step, i) => (
                      <li key={step} className="flex gap-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                        {step}
                      </li>
                    ),
                  )}
                </ol>
                <p className="text-center text-xs text-slate-500">O código se renova sozinho a cada ~20 segundos.</p>
                <Button variant="secondary" size="md" block onClick={restart} loading={restarting}>
                  Gerar novo QR
                </Button>
              </>
            )}
          </section>
        )}

        {level === 'disconnected' && !canManage && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
            <p className="font-semibold">O WhatsApp de alertas está desconectado.</p>
            <p className="mt-1">Nenhum alerta se perde: eles serão enviados assim que a conexão voltar. Avise o administrador do sistema.</p>
          </div>
        )}

        {level === 'simulated' && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            Para enviar de verdade, configure <code className="font-mono text-slate-900">NOTIFIER=whatsapp</code> no servidor.
          </p>
        )}

        <AlertRecipientForm connected={level === 'connected' || level === 'simulated'} />
      </div>
    </Modal>
  );
}
