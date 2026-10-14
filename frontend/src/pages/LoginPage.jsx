import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../lib/api.js';
import Field from '../components/ui/Field.jsx';
import Button from '../components/ui/Button.jsx';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ storeName: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-slate-900 px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-8">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center text-white">
          <div className="mb-4 flex justify-center gap-2" aria-hidden="true">
            <span className="h-4 w-4 rounded-full bg-red-500" />
            <span className="h-4 w-4 rounded-full bg-amber-400" />
            <span className="h-4 w-4 rounded-full bg-emerald-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Validade</h1>
          <p className="mt-2 text-slate-400">Nada vence esquecido na prateleira.</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-xl">
          {mode === 'register' && (
            <>
              <Field label="Nome da loja" required value={form.storeName} onChange={set('storeName')} autoComplete="organization" />
              <Field label="Seu nome" required value={form.name} onChange={set('name')} autoComplete="name" />
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
          className="mt-6 block h-12 w-full rounded-2xl text-center font-semibold text-slate-300 active:bg-white/10"
        >
          {mode === 'login' ? 'Primeira vez? Cadastre sua loja' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  );
}
