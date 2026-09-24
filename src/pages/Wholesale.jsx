import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import CategoryNav from '../components/CategoryNav';
import ProductGrid from '../components/ProductGrid';
import CartDrawer from '../components/CartDrawer';
import Footer from '../components/Footer';
import FloatingSocials from '../components/FloatingSocials';
import { CartProvider, useCart } from '../context/CartContext';
import { supabase } from '../lib/supabaseClient';
import { STORE_NAME, WHATSAPP_NUMBER } from '../lib/config';
import {
  fetchWholesaleCatalog,
  getSavedDni,
  isMock,
  normalizeDni,
  saveDni,
  wholesaleLogin,
} from '../lib/wholesale';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
});

export default function Wholesale() {
  // Own cart: wholesale prices must never mix with the retail cart
  return (
    <CartProvider storageKey="fit12_cart_wholesale_v1">
      <WholesaleGate />
    </CartProvider>
  );
}

function WholesaleGate() {
  const { clearCart } = useCart();
  const [dni, setDni] = useState(getSavedDni);
  const [client, setClient] = useState(null); // { name, minOrder }
  const [checking, setChecking] = useState(() => !!getSavedDni());

  // Returning client: re-validate the saved DNI (it may have been disabled)
  useEffect(() => {
    const saved = getSavedDni();
    if (!saved) return;
    wholesaleLogin(saved)
      .then((found) => {
        if (found) setClient(found);
        else saveDni('');
      })
      .catch((err) => console.error(err))
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    saveDni('');
    setDni('');
    setClient(null);
    clearCart();
  }, [clearCart]);

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-ink/50">Cargando...</div>;
  }

  if (!client) {
    return (
      <WholesaleLogin
        onLogin={(newDni, found) => {
          saveDni(newDni);
          setDni(newDni);
          setClient(found);
        }}
      />
    );
  }

  return <WholesaleStore dni={dni} client={client} onClientChange={setClient} onLogout={logout} />;
}

function WholesaleLogin({ onLogin }) {
  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = normalizeDni(dni);
    if (clean.length < 7) {
      setError('Ingresá un DNI válido, sin puntos.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const found = await wholesaleLogin(clean);
      if (found) onLogin(clean, found);
      else setError('not-enabled');
    } catch (err) {
      console.error(err);
      setError('No pudimos verificar tu DNI. Probá de nuevo en unos minutos.');
    } finally {
      setLoading(false);
    }
  }

  const contactText = encodeURIComponent(`Hola ${STORE_NAME}! Quiero darme de alta como cliente mayorista. Mi DNI es ${normalizeDni(dni)}.`);

  return (
    <div className="min-h-screen bg-moss-700 flex flex-col items-center justify-center px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-paper rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="font-display text-3xl font-semibold text-moss-700">
            {STORE_NAME}<span className="text-turmeric-400">.</span>
          </div>
          <span className="inline-block mt-2 rounded bg-turmeric-400 text-moss-900 text-xs font-bold uppercase tracking-wide px-2 py-0.5">
            Mayoristas
          </span>
          <p className="mt-4 text-sm text-ink/60">
            Ingresá con tu DNI para ver los precios por mayor.
          </p>
        </div>

        <label className="block text-xs font-medium text-ink/70 mb-1" htmlFor="dni">DNI</label>
        <input
          id="dni"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={dni}
          onChange={(e) => { setDni(e.target.value); setError(''); }}
          placeholder="Ej: 30123456"
          className="w-full rounded-lg border border-ink/20 px-3 py-2.5 text-base font-mono bg-white focus:outline-none focus:ring-1 focus:ring-moss-600"
        />

        {error === 'not-enabled' ? (
          <div className="mt-3 text-sm bg-paprika-500/10 text-paprika-600 rounded-lg px-3 py-2">
            Tu DNI no está habilitado como cliente mayorista.{' '}
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${contactText}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              Pedí el alta por WhatsApp
            </a>
          </div>
        ) : error ? (
          <p className="mt-3 text-sm bg-paprika-500/10 text-paprika-600 rounded-lg px-3 py-2">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-full bg-moss-700 text-paper font-semibold py-3 hover:bg-moss-600 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Verificando...' : 'Ingresar'}
        </button>

        <Link to="/" className="block mt-4 text-center text-xs text-ink/50 hover:text-moss-700">
          ← Volver a la tienda
        </Link>
      </form>
    </div>
  );
}

function WholesaleStore({ dni, client, onClientChange, onLogout }) {
  const { isOpen } = useCart();
  const { categories, products, loading, error } = useWholesaleCatalog(dni, onClientChange, onLogout);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = !activeCategory || p.category_id === activeCategory;
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.code || '').toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, activeCategory]);

  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        products: filtered.filter((p) => p.category_id === cat.id),
      }))
      .filter((g) => g.products.length > 0);
  }, [categories, filtered]);

  // Only categories that have wholesale products
  const visibleCategories = useMemo(
    () => categories.filter((c) => products.some((p) => p.category_id === c.id)),
    [categories, products]
  );

  return (
    <div className={`min-h-screen flex flex-col transition-[padding] duration-300 ease-in-out ${isOpen ? 'lg:pr-[28rem]' : ''}`}>
      <Header
        search={search}
        onSearchChange={setSearch}
        wholesaleClient={client}
        onLogout={onLogout}
      />

      <div className="bg-moss-900 text-paper border-b border-moss-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row justify-between items-center gap-1 text-sm sm:text-base text-center">
          <span>
            Hola, <strong className="text-turmeric-400">{client.name}</strong> 👋 Estos son tus precios por mayor.
          </span>
          {client.minOrder > 0 && (
            <span className="text-paper/70 text-xs sm:text-sm">
              Pedido mínimo: <strong className="text-paper">{currency.format(client.minOrder)}</strong>
            </span>
          )}
        </div>
      </div>

      <CategoryNav categories={visibleCategories} activeCategory={activeCategory} onSelect={setActiveCategory} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">
        {loading && <p className="text-center text-ink/50 py-20">Cargando catálogo mayorista...</p>}
        {error && (
          <p className="text-center text-paprika-500 py-20">
            No pudimos cargar el catálogo mayorista. Detalle: {error}
          </p>
        )}
        {!loading && !error && products.length === 0 && (
          <p className="text-center text-ink/50 py-20">Todavía no hay productos con precio mayorista.</p>
        )}
        {!loading && !error && products.length > 0 && <ProductGrid groupedProducts={grouped} />}
      </main>

      <Footer />
      <CartDrawer wholesale={{ name: client.name, dni, minOrder: client.minOrder }} />
      <FloatingSocials />
    </div>
  );
}

function useWholesaleCatalog(dni, onClientChange, onLogout) {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Refs so new callback identities from the parent don't retrigger the fetch
  const onClientChangeRef = useRef(onClientChange);
  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onClientChangeRef.current = onClientChange;
    onLogoutRef.current = onLogout;
  });

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      // Re-check the client each time: picks up a new minimum order, or kicks
      // them out if the admin disabled their DNI
      const [client, catalog, cats] = await Promise.all([
        wholesaleLogin(dni),
        fetchWholesaleCatalog(dni),
        isMock()
          ? import('../lib/mockData.js').then((m) => m.MOCK_CATEGORIES)
          : supabase.from('categories').select('*').order('sort_order', { ascending: true }).then(({ data, error: catErr }) => {
              if (catErr) throw new Error(catErr.message);
              return data || [];
            }),
      ]);
      if (!client) {
        onLogoutRef.current();
        return;
      }
      onClientChangeRef.current(client);
      setCategories(cats);
      setProducts(catalog);
      setError(null);
    } catch (err) {
      console.error(err);
      if (!silent) setError(err.message || 'Error de red.');
    } finally {
      setLoading(false);
    }
  }, [dni]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live updates, same as the retail catalog. Wholesale prices and clients are
  // private tables, so their changes arrive via the tab-visible refresh instead.
  useEffect(() => {
    if (isMock()) return;

    let timer;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reload({ silent: true }), 400);
    };

    const channel = supabase
      .channel('wholesale-catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, refresh)
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { categories, products, loading, error };
}
