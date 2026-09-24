import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { parseArsAmount } from '../../lib/utils';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
});

// Same Argentine format the inputs accept: 8910.5 → "8.910,5"
function formatAmount(value) {
  return Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// Which categories the wholesale section shows, and each product's wholesale price.
// A product reaches wholesale clients when its category is enabled AND it has a wholesale price.
export default function WholesaleCatalog({ categories, products, reload }) {
  const [enabledIds, setEnabledIds] = useState(() => new Set());
  const [loadingCats, setLoadingCats] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [drafts, setDrafts] = useState({}); // productId -> input text while editing
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [pct, setPct] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('wholesale_categories')
      .select('category_id')
      .then(({ data, error: loadError }) => {
        if (loadError) setError(`No se pudieron cargar las categorías mayoristas: ${loadError.message}`);
        setEnabledIds(new Set((data || []).map((r) => r.category_id)));
        setLoadingCats(false);
      });
  }, []);

  // Default to the first category once categories arrive
  const currentCat = selectedCat ?? categories[0]?.id ?? null;

  const statsByCat = useMemo(() => {
    const stats = {};
    for (const p of products) {
      const s = (stats[p.category_id] ||= { total: 0, priced: 0 });
      s.total += 1;
      if (p.wholesale_price != null) s.priced += 1;
    }
    return stats;
  }, [products]);

  const catProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.category_id === currentCat &&
        (!term || p.name.toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term))
    );
  }, [products, currentCat, search]);

  const visibleCount = useMemo(
    () => products.filter((p) => p.active && p.wholesale_price != null && enabledIds.has(p.category_id)).length,
    [products, enabledIds]
  );

  async function toggleCategory(catId) {
    const enable = !enabledIds.has(catId);
    setError('');
    const { error: saveError } = enable
      ? await supabase.from('wholesale_categories').insert({ category_id: catId })
      : await supabase.from('wholesale_categories').delete().eq('category_id', catId);
    if (saveError) { setError(saveError.message); return; }
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (enable) next.add(catId);
      else next.delete(catId);
      return next;
    });
  }

  async function savePrice(product) {
    const raw = drafts[product.id];
    if (raw === undefined) return;
    const value = parseArsAmount(raw);
    if (value !== null && (Number.isNaN(value) || value < 0)) {
      setError(`Precio inválido para "${product.name}". Ejemplo: 8.910 o 8.910,50`);
      return;
    }
    if (value === (product.wholesale_price == null ? null : Number(product.wholesale_price))) {
      clearDraft(product.id);
      return;
    }

    setError('');
    setSavingIds((prev) => new Set(prev).add(product.id));
    const { error: saveError } = value === null
      ? await supabase.from('wholesale_prices').delete().eq('product_id', product.id)
      : await supabase
          .from('wholesale_prices')
          .upsert({ product_id: product.id, price: value, updated_at: new Date().toISOString() });
    await reload();
    setSavingIds((prev) => {
      const next = new Set(prev);
      next.delete(product.id);
      return next;
    });
    if (saveError) { setError(`"${product.name}": ${saveError.message}`); return; }
    clearDraft(product.id);
  }

  function clearDraft(id) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function applyPercentage(onlyEmpty) {
    const discount = Number(pct);
    if (!discount || discount <= 0 || discount >= 100) {
      setError('Ingresá un porcentaje entre 1 y 99.');
      return;
    }
    const targets = products.filter(
      (p) => p.category_id === currentCat && (!onlyEmpty || p.wholesale_price == null)
    );
    if (targets.length === 0) {
      setError('No hay productos para actualizar en esta categoría.');
      return;
    }
    const catName = categories.find((c) => c.id === currentCat)?.name || '';
    const scope = onlyEmpty ? 'los productos SIN precio mayorista' : 'TODOS los productos';
    if (!confirm(`Poner a ${scope} de "${catName}" (${targets.length}) un ${discount}% menos que el precio minorista?`)) return;

    setError('');
    const now = new Date().toISOString();
    const rows = targets.map((p) => ({
      product_id: p.id,
      price: Math.round(Number(p.price) * (1 - discount / 100)),
      updated_at: now,
    }));
    const { error: saveError } = await supabase.from('wholesale_prices').upsert(rows);
    if (saveError) { setError(saveError.message); return; }
    setDrafts({});
    await reload();
  }

  const currentCatName = categories.find((c) => c.id === currentCat)?.name;
  const currentEnabled = enabledIds.has(currentCat);
  const inputClass = 'rounded-md border border-ink/20 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-600';

  return (
    <div>
      <div className="rounded-xl bg-moss-700 text-paper px-4 py-3 mb-4 text-sm">
        Los mayoristas ven <strong className="text-turmeric-400">{visibleCount}</strong> productos: los de categorías
        habilitadas que tienen precio mayorista.
      </div>

      {error && <p className="text-paprika-500 text-sm mb-4 bg-paprika-500/10 px-3 py-2 rounded-md">{error}</p>}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Categories */}
        <div className="lg:w-72 shrink-0 rounded-xl border border-ink/10 bg-white/60 overflow-hidden self-start w-full">
          <div className="px-4 py-3 border-b border-ink/10 text-xs uppercase tracking-wide text-ink/50">
            Categorías
          </div>
          {loadingCats ? (
            <div className="px-4 py-8 text-center text-sm text-ink/40">Cargando...</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {categories.map((c) => {
                const enabled = enabledIds.has(c.id);
                const stats = statsByCat[c.id] || { total: 0, priced: 0 };
                const selected = c.id === currentCat;
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-3 px-4 py-2.5 border-b border-ink/5 cursor-pointer transition-colors ${
                      selected ? 'bg-moss-700/10' : 'hover:bg-ink/5'
                    }`}
                    onClick={() => { setSelectedCat(c.id); setSearch(''); }}
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleCategory(c.id); }}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${enabled ? 'bg-moss-600' : 'bg-ink/20'}`}
                      aria-label={enabled ? `Ocultar ${c.name} a mayoristas` : `Mostrar ${c.name} a mayoristas`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : ''}`} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm truncate ${selected ? 'font-semibold text-ink' : 'text-ink/80'}`}>{c.name}</div>
                      <div className="text-[11px] text-ink/45">
                        {stats.priced} de {stats.total} con precio
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Products of the selected category */}
        <div className="flex-1 min-w-0">
          {currentCat && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{currentCatName}</h3>
                  <p className={`text-xs ${currentEnabled ? 'text-moss-600' : 'text-paprika-500'}`}>
                    {currentEnabled ? '✓ Visible para mayoristas' : 'Oculta para mayoristas — activala con el interruptor'}
                  </p>
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar en la categoría..."
                  className={`${inputClass} min-w-[200px]`}
                />
              </div>

              {/* Bulk fill */}
              <div className="flex flex-wrap items-center gap-2 mb-3 rounded-lg border border-dashed border-ink/20 px-3 py-2 text-sm">
                <span className="text-ink/60">Completar con</span>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={pct}
                  onChange={(e) => setPct(e.target.value)}
                  placeholder="%"
                  className={`${inputClass} w-16 text-center`}
                />
                <span className="text-ink/60">% menos que el minorista:</span>
                <button
                  type="button"
                  onClick={() => applyPercentage(true)}
                  className="rounded-full bg-moss-700 text-paper text-xs font-medium px-3 py-1.5 hover:bg-moss-600 transition-colors"
                >
                  Solo los vacíos
                </button>
                <button
                  type="button"
                  onClick={() => applyPercentage(false)}
                  className="rounded-full border border-ink/20 text-xs px-3 py-1.5 hover:border-moss-600 transition-colors"
                >
                  Todos
                </button>
              </div>

              <div className="overflow-x-auto bg-white/60 rounded-xl border border-ink/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10">
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3 text-right">Minorista</th>
                      <th className="px-4 py-3 text-right">Mayorista</th>
                      <th className="px-4 py-3 text-right hidden sm:table-cell">Dif.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catProducts.map((p) => {
                      const draft = drafts[p.id];
                      const shown = draft ?? (p.wholesale_price != null ? formatAmount(p.wholesale_price) : '');
                      const wholesale = p.wholesale_price != null ? Number(p.wholesale_price) : null;
                      const diff = wholesale != null && Number(p.price) > 0
                        ? Math.round((1 - wholesale / Number(p.price)) * 100)
                        : null;
                      return (
                        <tr key={p.id} className="border-b border-ink/5">
                          <td className="px-4 py-2">
                            <div className="font-medium text-ink">{p.name}</div>
                            <div className="text-[11px] text-ink/45">
                              {p.code ? `#${p.code}` : ''}
                              {!p.active && <span className="ml-1 text-paprika-500">· oculto en la tienda</span>}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-mono text-ink/60 whitespace-nowrap">
                            {currency.format(p.price)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              inputMode="decimal"
                              value={shown}
                              placeholder="Sin precio"
                              disabled={savingIds.has(p.id)}
                              onChange={(e) => setDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                              onBlur={() => savePrice(p)}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                              className={`${inputClass} w-28 text-right font-mono disabled:opacity-50 ${
                                draft !== undefined ? 'border-turmeric-500' : ''
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-xs text-ink/50 hidden sm:table-cell whitespace-nowrap">
                            {diff != null ? `${diff > 0 ? '-' : '+'}${Math.abs(diff)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                    {catProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-ink/40">
                          Sin productos en esta categoría.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink/45">
                Escribí el precio y apretá Enter o hacé clic afuera para guardarlo. Dejalo vacío para que ese producto no se muestre.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
