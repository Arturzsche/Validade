import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import Field from '../components/ui/Field.jsx';
import Button from '../components/ui/Button.jsx';
import { toE164BR } from '../lib/whatsapp.js';
import { LogoMark } from '../components/brand/Logo.jsx';
import { APP_NAME, APP_TAGLINE } from '../lib/brand.js';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsapp: '' });
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
        const phone = whatsapp.trim() ? toE164BR(whatsapp) : undefined;
        if (whatsapp.trim() && !phone) throw new Error('WhatsApp inválido: informe DDD + número');
        await register({ ...data, ...(phone && { phone }) });
      }
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-8">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMark className="mx-auto mb-4 h-14 w-14" />
          <h1 className="text-3xl font-semibold tracking-tight text-navy-900">{APP_NAME}</h1>
          <p className="mt-2 text-slate-500">{APP_TAGLINE}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-card ring-1 ring-slate-200">
          {mode === 'register' && (
            <>
              <Field label="Seu nome" required value={form.name} onChange={set('name')} autoComplete="name" />
              <Field
                label="Seu WhatsApp"
                type="tel"
                inputMode="tel"
                placeholder="(11) 99999-8888"
                value={form.whatsapp}
                onChange={set('whatsapp')}
                autoComplete="tel"
                hint="Opcional"
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
            {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
          className="mt-6 block h-12 w-full rounded-xl text-center font-medium text-navy-700 hover:bg-navy-50"
        >
          {mode === 'login' ? 'Primeira vez? Crie sua conta' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
}
