import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, ApiError, errorMessage } from '../../lib/api.js';
import { formatBRPhone, toE164BR } from '../../lib/whatsapp.js';
import Field from '../ui/Field.jsx';
import Button from '../ui/Button.jsx';

/** Número da loja que RECEBE os alertas + mensagem de teste. */
export default function AlertRecipientForm({ connected }) {
  const { session, updateStore } = useAuth();
  const saved = session.store.whatsappPhone;
  const [phone, setPhone] = useState(formatBRPhone(saved));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { tone, text }

  const e164 = phone.trim() ? toE164BR(phone) : null;
  const invalid = phone.trim() && !e164;
  const dirty = (e164 ?? null) !== (saved ?? null);

  async function save(e) {
    e.preventDefault();
    if (invalid) return;
    setSaving(true);
    setFeedback(null);
    try {
      updateStore(await api('/stores/me', { method: 'PATCH', body: { whatsappPhone: e164 } }));
      setPhone(formatBRPhone(e164));
      setFeedback({ tone: 'ok', text: 'Número salvo.' });
    } catch (err) {
      setFeedback({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await api('/notifications/test', { method: 'POST' });
      setFeedback({ tone: 'ok', text: `Mensagem de teste enviada para ${formatBRPhone(res.to)}. Confira o WhatsApp!` });
    } catch (err) {
      const text =
        err instanceof ApiError && err.code === 'NOTIFIER_UNAVAILABLE' ? 'O WhatsApp ainda não está conectado.' : errorMessage(err);
      setFeedback({ tone: 'error', text });
    } finally {
      setTesting(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <Field
        label="Número que recebe os alertas da loja"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(11) 99999-8888"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value);
          setFeedback(null);
        }}
        error={invalid ? 'Informe DDD + número' : null}
        hint={!saved ? 'Sem número cadastrado, os alertas não têm para onde ir.' : undefined}
      />
      <div className="flex gap-2">
        <Button type="submit" size="md" variant="secondary" className="flex-1" loading={saving} disabled={!dirty || invalid}>
          Salvar número
        </Button>
        <Button size="md" className="flex-1" onClick={sendTest} loading={testing} disabled={!connected || !saved || dirty}>
          Enviar teste
        </Button>
      </div>
      {feedback && (
        <p role="status" className={`text-sm font-medium ${feedback.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {feedback.text}
        </p>
      )}
    </form>
  );
}
