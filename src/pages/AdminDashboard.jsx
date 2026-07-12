import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ProductForm from '../components/admin/ProductForm';
import CategoryManager from '../components/admin/CategoryManager';
import PromotionManager from '../components/admin/PromotionManager';
import BulkPriceModal from '../components/admin/BulkPriceModal';
import { STORE_NAME } from '../lib/config';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
});

// ─── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  {
    id: 'dashboard', label: 'Inicio', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
      </svg>
    ),
  },
  {
    id: 'products', label: 'Productos', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
  },
  {
    id: 'categories', label: 'Categorías', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
      </svg>
    ),
  },
  {
    id: 'promotions', label: 'Promociones', icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/>
      </svg>
    ),
  },
];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'moss' }) {
  const colors = {
    moss: 'bg-moss-700 text-paper',
    turmeric: 'bg-turmeric-400 text-moss-900',
    paprika: 'bg-paprika-500 text-white',
    ink: 'bg-ink/10 text-ink',
  };
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <div className="text-3xl font-display font-bold">{value}</div>
      <div className="text-sm font-medium mt-1 opacity-90">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-60">{sub}</div>}
    </div>
  );
}

// ─── Dashboard home section ───────────────────────────────────────────────────
function DashboardHome({ products, categories, onTab, onNewProduct, onBulkPrice }) {
  const activeProducts = products.filter((p) => p.active).length;
  const inactiveProducts = products.filter((p) => !p.active).length;

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold text-ink mb-6">Panel de control</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard label="Productos activos" value={activeProducts} color="moss" />
        <StatCard label="Productos ocultos" value={inactiveProducts} color="ink" />
        <StatCard label="Categorías" value={categories.length} color="turmeric" />
        <StatCard label="Total productos" value={products.length} sub="activos + inactivos" color="ink" />
      </div>

      {/* Quick actions */}
      <h3 className="font-display text-lg font-semibold text-ink mb-3">Acciones rápidas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          {
            label: 'Nuevo producto',
            icon: '📦',
            desc: 'Agregar un producto al catálogo',
            action: onNewProduct,
            accent: true,
          },
          {
            label: 'Ajuste de precios',
            icon: '💰',
            desc: 'Actualizar precios en lote con %',
            action: onBulkPrice,
          },
          {
            label: 'Gestionar categorías',
            icon: '🗂️',
            desc: 'Crear, renombrar o eliminar categorías',
            action: () => onTab('categories'),
          },
          {
            label: 'Crear promoción',
            icon: '🏷️',
            desc: 'Añadir una oferta o descuento',
            action: () => onTab('promotions'),
          },
          {
            label: 'Ver tienda',
            icon: '🛍️',
            desc: 'Ver cómo se ve la tienda pública',
            action: () => window.open('/', '_blank'),
          },
        ].map(({ label, icon, desc, action, accent }) => (
          <button
            key={label}
            onClick={action}
            className={`text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
              accent
                ? 'bg-moss-700 text-paper border-moss-700 hover:bg-moss-600'
                : 'bg-white/60 border-ink/10 hover:border-moss-400'
            }`}
          >
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`font-medium text-sm ${accent ? '' : 'text-ink'}`}>{label}</div>
            <div className={`text-xs mt-0.5 ${accent ? 'text-paper/70' : 'text-ink/50'}`}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Products section ─────────────────────────────────────────────────────────
function ProductsSection({ categories, products, loading, reload }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState(undefined);
  const [showBulkPrice, setShowBulkPrice] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
      const matchesSearch =
        !term || p.name.toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, search, categoryFilter]);

  async function toggleActive(product) {
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id);
    reload();
  }

  async function deleteProduct(product) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    await supabase.from('products').delete().eq('id', product.id);
    reload();
  }

  function categoryName(id) {
    return categories.find((c) => c.id === id)?.name || '—';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Productos</h2>
          <p className="text-sm text-ink/50 mt-0.5">{products.length} productos en total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkPrice(true)}
            className="flex items-center gap-1.5 rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-moss-500 text-ink transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            Precios en lote
          </button>
          <button
            onClick={() => setEditingProduct(null)}
            className="flex items-center gap-2 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 transition-colors shadow-sm"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nuevo producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o código..."
          className="rounded-lg border border-ink/20 px-3 py-2 text-sm bg-white flex-1 min-w-[200px] focus:outline-none focus:ring-1 focus:ring-moss-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink/40">Cargando productos...</div>
      ) : (
        <div className="overflow-x-auto bg-white/60 rounded-xl border border-ink/8">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-center">Visible</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-ink/5 hover:bg-white/60 transition-colors">
                  <td className="px-4 py-2">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-8 h-8 rounded-md object-cover border border-ink/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-md bg-ink/5 flex items-center justify-center text-ink/20">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01"/>
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-ink/50">{p.code || '—'}</td>
                  <td className="px-4 py-2 font-medium text-ink max-w-[220px] truncate">{p.name}</td>
                  <td className="px-4 py-2 text-ink/60 text-xs">{categoryName(p.category_id)}</td>
                  <td className="px-4 py-2 text-right font-mono font-semibold text-paprika-500">
                    {currency.format(p.price)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${p.active ? 'bg-moss-600' : 'bg-ink/20'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.active ? 'translate-x-4' : ''}`} />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditingProduct(p)} className="text-xs text-moss-700 hover:underline mr-3 font-medium">
                      Editar
                    </button>
                    <button onClick={() => deleteProduct(p)} className="text-xs text-paprika-500 hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink/40">
                    Sin productos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct !== undefined && (
        <ProductForm
          categories={categories}
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
          onSaved={() => { setEditingProduct(undefined); reload(); }}
        />
      )}
      {showBulkPrice && (
        <BulkPriceModal
          categories={categories}
          onClose={() => setShowBulkPrice(false)}
          onDone={reload}
        />
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { signOut } = useAuth();
  const { categories, products, loading, reload } = useAllProducts();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showBulkPrice, setShowBulkPrice] = useState(false);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top bar */}
      <header className="bg-moss-700 text-paper z-30 sticky top-0">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-md hover:bg-moss-600 transition-colors"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div>
              <span className="font-display text-lg font-bold">{STORE_NAME}</span>
              <span className="text-paper/50 text-sm ml-2 hidden sm:inline">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" target="_blank" rel="noreferrer"
              className="text-sm text-paper/70 hover:text-paper transition-colors flex items-center gap-1">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Ver tienda
            </a>
            <button onClick={signOut} className="text-sm text-paper/70 hover:text-paper transition-colors">
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-screen-xl mx-auto w-full">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-ink/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed lg:static top-[52px] bottom-0 left-0 z-20
          w-56 bg-white border-r border-ink/10 flex-shrink-0
          transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:block
        `}>
          <nav className="p-3 space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? 'bg-moss-700 text-paper'
                    : 'text-ink/70 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardHome
              products={products}
              categories={categories}
              onTab={setActiveTab}
              onNewProduct={() => setShowNewProduct(true)}
              onBulkPrice={() => setShowBulkPrice(true)}
            />
          )}
          {activeTab === 'products' && (
            <ProductsSection
              categories={categories}
              products={products}
              loading={loading}
              reload={reload}
            />
          )}
          {activeTab === 'categories' && (
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink mb-6">Categorías</h2>
              <div className="max-w-md">
                <CategoryManager categories={categories} onChanged={reload} />
              </div>
            </div>
          )}
          {activeTab === 'promotions' && <PromotionManager />}
        </main>
      </div>

      {/* Global modals from dashboard home */}
      {showNewProduct && (
        <ProductForm
          categories={categories}
          product={null}
          onClose={() => setShowNewProduct(false)}
          onSaved={() => { setShowNewProduct(false); reload(); }}
        />
      )}
      {showBulkPrice && (
        <BulkPriceModal
          categories={categories}
          onClose={() => setShowBulkPrice(false)}
          onDone={reload}
        />
      )}
    </div>
  );
}

// Admin necesita ver también los productos inactivos
function useAllProducts() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const isMock = !supabaseUrl || supabaseUrl.includes('tu-proyecto') || supabaseUrl.includes('mock.supabase');
    if (isMock) {
      // Use mock data from mockData.js
      const { MOCK_CATEGORIES, MOCK_PRODUCTS } = await import('../lib/mockData.js');
      setCategories(MOCK_CATEGORIES);
      setProducts(MOCK_PRODUCTS);
      setLoading(false);
      return;
    }
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
    ]);
    setCategories(cats || []);
    setProducts(prods || []);
    setLoading(false);
  }

  useEffect(() => { reload(); }, []);

  return { categories, products, loading, reload };
}
