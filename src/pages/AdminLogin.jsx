import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STORE_NAME } from '../lib/config';

const IS_DEMO = !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes('tu-proyecto') ||
  import.meta.env.VITE_SUPABASE_URL.includes('mock.supabase');

// Credenciales provisorias solo para modo demo
const DEMO_USER = 'admin@fit12.com';
const DEMO_PASS = 'fit12demo';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(IS_DEMO ? DEMO_USER : '');
  const [password, setPassword] = useState(IS_DEMO ? DEMO_PASS : '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Modo demo: credenciales provisorias permiten entrar directamente
    if (IS_DEMO) {
      if (email === DEMO_USER && password === DEMO_PASS) {
        navigate('/admin');
        return;
      }
      setLoading(false);
      setError('Credenciales incorrectas. En modo demo usá las credenciales provisorias.');
      return;
    }

    const err = await signIn(email, password);
    setLoading(false);
    if (err) setError('Email o contraseña incorrectos.');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-moss-700 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-turmeric-400 text-moss-900 text-2xl font-display font-bold mb-4 shadow-lg">
            {STORE_NAME[0]}
          </div>
          <h1 className="font-display text-2xl font-semibold text-paper">{STORE_NAME}</h1>
          <p className="text-paper/60 text-sm mt-1">Panel de administración</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper rounded-2xl p-7 shadow-2xl"
        >
          {IS_DEMO && (
            <div className="mb-5 bg-turmeric-50 border border-turmeric-300 rounded-xl px-4 py-3 text-sm text-turmeric-800">
              <p className="font-semibold mb-1">🔑 Acceso de demostración</p>
              <p>Usuario: <span className="font-mono">{DEMO_USER}</span></p>
              <p>Contraseña: <span className="font-mono">{DEMO_PASS}</span></p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/20 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-moss-500 transition"
            />
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-ink/20 px-4 py-2.5 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-moss-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink"
                tabIndex={-1}
              >
                {showPass ? (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-paprika-50 border border-paprika-200 text-paprika-700 text-sm px-4 py-2.5 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-moss-700 text-paper font-semibold py-3 hover:bg-moss-600 transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>

          <a href="/" className="block text-center mt-4 text-xs text-ink/40 hover:text-moss-600 transition-colors">
            ← Volver a la tienda
          </a>
        </form>
      </div>
    </div>
  );
}
