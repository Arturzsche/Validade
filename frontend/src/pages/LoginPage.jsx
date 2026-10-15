import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import Field from '../components/ui/Field.jsx';
import Button from '../components/ui/Button.jsx';
import { toE164BR } from '../lib/whatsapp.js';
import { LogoMark } from '../components/brand/Logo.jsx';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ storeName: '', name: '', email: '', password: '', whatsapp: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else {
        const { whatsapp, ...data } = form;
        const whatsappPhone = whatsapp.trim() ? toE164BR(whatsapp) : undefined;
        if (whatsapp.trim() && !whatsappPhone) throw new Error('WhatsApp inválido: informe DDD + número');
        await register({ ...data, ...(whatsappPhone && { whatsappPhone }) });
      }
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      <div className="px-5 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-7 text-center">
          <LogoMark className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">
            <span className="text-emerald-500">i</span>Valida
          </h1>
          <p className="mt-2 font-semibold text-stone-500">Nada vence esquecido na prateleira.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-stone-200">
          {mode === 'register' && (
            <>
              <Field label="Nome da loja" required value={form.storeName} onChange={set('storeName')} autoComplete="organization" />
              <Field label="Seu nome" required value={form.name} onChange={set('name')} autoComplete="name" />
              <Field
                label="WhatsApp para receber os alertas"
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-8888"
                value={form.whatsapp}
                onChange={set('whatsapp')}
                autoComplete="tel"
                hint="Opcional agora; dá para cadastrar depois no painel"
              />
            </>
          )}
          <Field label="E-mail" type="email" required value={form.email} onChange={set('email')} autoComplete="email" inputMode="email" />
          <Field
            label="Senha"
            type="password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            hint={mode === 'register' ? 'Mínimo de 8 caracteres' : undefined}
          />

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} block>
            {mode === 'login' ? 'Entrar' : 'Criar conta da loja'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="mt-6 block h-12 w-full rounded-full text-center font-semibold text-emerald-700 active:bg-emerald-50 md:hover:bg-emerald-50"
        >
          {mode === 'login' ? 'Primeira vez? Cadastre sua loja' : 'Já tenho conta'}
        </button>
      </div>
      </div>
    </div>
  );
}
