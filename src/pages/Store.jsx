import { useMemo, useState } from 'react';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import CategoryNav from '../components/CategoryNav';
import ProductGrid from '../components/ProductGrid';
import CartDrawer from '../components/CartDrawer';
import Footer from '../components/Footer';
import FloatingSocials from '../components/FloatingSocials';
import { useCatalog } from '../lib/useCatalog';
import { useCart } from '../context/CartContext';

export default function Store() {
  const { categories, products, loading, error } = useCatalog();
  const { isOpen } = useCart();
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

  return (
    <div className={`min-h-screen flex flex-col transition-[padding] duration-300 ease-in-out ${isOpen ? 'lg:pr-[28rem]' : ''}`}>
      <Header search={search} onSearchChange={setSearch} />
      <HeroSlider />

      {/* Info Banner */}
      <div className="bg-moss-700 text-paper border-b border-moss-900/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:flex-wrap justify-center items-center gap-y-2 sm:gap-x-8 sm:gap-y-3 text-sm sm:text-base font-medium">
          <span className="flex items-center gap-2"><span>🌿</span> Productos saludables &amp; sin TACC</span>
          <span className="flex items-center gap-2"><span>🥜</span> Frutos secos • Suplementos • Aceites</span>
          <span className="flex items-center gap-2"><span>🌶️</span> Especies y Condimentos</span>
          <span className="flex items-center gap-2"><span>📦</span> Envíos sin cargo</span>
          <span className="flex items-center gap-2"><span>📍</span> Córdoba</span>
        </div>
      </div>

      <CategoryNav categories={categories} activeCategory={activeCategory} onSelect={setActiveCategory} />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">
        {loading && <p className="text-center text-ink/50 py-20">Cargando catálogo...</p>}
        {error && (
          <p className="text-center text-paprika-500 py-20">
            No pudimos cargar el catálogo. Revisá la configuración de Supabase. Detalle: {error}
          </p>
        )}
        {!loading && !error && <ProductGrid groupedProducts={grouped} />}
      </main>

      <Footer />
      <CartDrawer />
      <FloatingSocials />
    </div>
  );
}
