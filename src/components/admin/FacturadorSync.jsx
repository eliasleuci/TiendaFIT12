import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { facturadorPrice, parseArsAmount } from '../../lib/utils';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const FILTERS = [
  { id: 'pending', label: 'Para revisar' },
  { id: 'unlinked', label: 'Sin vincular' },
  { id: 'diff', label: 'Precio distinto' },
  { id: 'all', label: 'Todos' },
];

// Words that don't help to tell products apart
const STOPWORDS = new Set(['x', 'kg', 'kgs', 'g', 'gr', 'grs', 'gramos', 'de', 'con', 'en', 'la', 'el', 'y', 'por', 'und', 'u']);

function normalize(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(name) {
  return new Set(normalize(name).split(' ').filter((t) => t && !STOPWORDS.has(t)));
}

function similarity(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

// Runs async updates a few at a time so we don't flood Supabase
async function inChunks(items, size, fn) {
  const errors = [];
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.all(items.slice(i, i + size).map(fn));
    results.forEach((r) => r?.error && errors.push(r.error.message));
  }
  return errors;
}

export default function FacturadorSync({ products, reload }) {
  const [factProducts, setFactProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // { message, setup }
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  const loadFacturador = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/facturador-products', {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        setLoadError({
          message: body?.error || 'No se pudo conectar con el facturador (la función de Netlify no respondió).',
          setup: body?.setup || !body,
        });
        return;
      }
      setFactProducts(body.products || []);
    } catch (err) {
      setLoadError({ message: err.message, setup: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFacturador(); }, [loadFacturador]);

  const factById = useMemo(() => new Map(factProducts.map((f) => [f.id, f])), [factProducts]);
  const factTokens = useMemo(() => factProducts.map((f) => ({ f, t: tokens(f.name) })), [factProducts]);

  const rows = useMemo(() => products.map((p) => {
    const f = p.facturador_id ? factById.get(p.facturador_id) : null;
    const target = f ? facturadorPrice(f.sellPrice, p.facturador_factor) : null;
    return {
      p,
      f,
      brokenLink: !!p.facturador_id && !f && factProducts.length > 0,
      target,
      diff: target != null && target !== Number(p.price),
    };
  }), [products, factById, factProducts.length]);

  const stats = useMemo(() => ({
    linked: rows.filter((r) => r.f).length,
    unlinked: rows.filter((r) => !r.f).length,
    diff: rows.filter((r) => r.diff).length,
  }), [rows]);

  // Unlinked store products whose normalized name matches exactly one facturador product
  const autoMatches = useMemo(() => {
    const byName = new Map();
    for (const f of factProducts) {
      const key = normalize(f.name);
      byName.set(key, (byName.get(key) || []).concat(f));
    }
    return rows
      .filter((r) => !r.f)
      .map((r) => ({ p: r.p, cands: byName.get(normalize(r.p.name)) || [] }))
      .filter((m) => m.cands.length === 1)
      .map((m) => ({ product: m.p, fact: m.cands[0] }));
  }, [rows, factProducts]);

  const visibleRows = useMemo(() => {
    const term = normalize(search);
    return rows.filter((r) => {
      if (filter === 'unlinked' && r.f) return false;
      if (filter === 'diff' && !r.diff) return false;
      if (filter === 'pending' && r.f && !r.diff) return false;
      return !term || normalize(r.p.name).includes(term) || (r.f && normalize(r.f.name).includes(term));
    });
  }, [rows, filter, search]);

  function suggestionsFor(product) {
    const t = tokens(product.name);
    return factTokens
      .map(({ f, t: ft }) => ({ f, score: similarity(t, ft) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.f);
  }

  async function runUpdate(label, fn) {
    setBusy(true);
    setMessage(null);
    try {
      const text = await fn();
      if (text) setMessage({ type: 'ok', text });
    } catch (err) {
      setMessage({ type: 'error', text: `${label}: ${err.message}` });
    } finally {
      await reload();
      setBusy(false);
    }
  }

  function autoLink() {
    if (!confirm(`Vincular ${autoMatches.length} productos que tienen el mismo nombre en los dos sistemas?`)) return;
    runUpdate('Vincular', async () => {
      const errors = await inChunks(autoMatches, 10, ({ product, fact }) =>
        supabase.from('products').update({ facturador_id: fact.id }).eq('id', product.id)
      );
      if (errors.length) throw new Error(errors[0]);
      return `Se vincularon ${autoMatches.length} productos.`;
    });
  }

  function syncAll() {
    const pending = rows.filter((r) => r.diff);
    if (!confirm(`Actualizar ${pending.length} precios de la tienda con los del facturador?`)) return;
    runUpdate('Sincronizar', async () => {
      const now = new Date().toISOString();
      const errors = await inChunks(pending, 10, ({ p, target }) =>
        supabase.from('products').update({ price: target, price_synced_at: now }).eq('id', p.id)
      );
      if (errors.length) throw new Error(errors[0]);
      return `Se actualizaron ${pending.length} precios.`;
    });
  }

  function link(product, factId) {
    setEditingId(null);
    runUpdate('Vincular', async () => {
      const { error } = await supabase
        .from('products')
        .update({ facturador_id: factId || null })
        .eq('id', product.id);
      if (error) throw error;
      return null;
    });
  }

  function saveFactor(product, text) {
    const value = parseArsAmount(text);
    if (value === null || Number.isNaN(value) || value <= 0) {
      setMessage({ type: 'error', text: `Multiplicador inválido para "${product.name}". Ejemplo: 0,5` });
      return;
    }
    if (value === Number(product.facturador_factor)) return;
    runUpdate('Multiplicador', async () => {
      const { error } = await supabase.from('products').update({ facturador_factor: value }).eq('id', product.id);
      if (error) throw error;
      return null;
    });
  }

  function syncOne(row) {
    runUpdate('Actualizar precio', async () => {
      const { error } = await supabase
        .from('products')
        .update({ price: row.target, price_synced_at: new Date().toISOString() })
        .eq('id', row.p.id);
      if (error) throw error;
      return null;
    });
  }

  const sortedFact = useMemo(
    () => [...factProducts].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [factProducts]
  );

  function renderFactSelect(product) {
    const suggestions = suggestionsFor(product);
    return (
      <select
        autoFocus={editingId === product.id}
        value={product.facturador_id || ''}
        disabled={busy}
        onChange={(e) => link(product, e.target.value)}
        onBlur={() => editingId === product.id && setEditingId(null)}
        className="w-full sm:max-w-xs rounded-md border border-ink/20 px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-600"
      >
        <option value="">— Elegir producto del facturador —</option>
        {suggestions.length > 0 && (
          <optgroup label="Sugeridos">
            {suggestions.map((f) => (
              <option key={`s-${f.id}`} value={f.id}>{f.name} · {currency.format(f.sellPrice)}</option>
            ))}
          </optgroup>
        )}
        <optgroup label="Todos">
          {sortedFact.map((f) => (
            <option key={f.id} value={f.id}>{f.name} · {currency.format(f.sellPrice)}</option>
          ))}
        </optgroup>
      </select>
    );
  }

  function renderFactCell(r) {
    if (r.f && editingId !== r.p.id) {
      return (
        <div>
          <div className="text-ink">{r.f.name}</div>
          <div className="text-xs text-ink/50">
            <span className="font-mono">{currency.format(r.f.sellPrice)}</span> / {r.f.unitType}
            <button onClick={() => setEditingId(r.p.id)} className="ml-3 py-1 text-moss-700 hover:underline">Cambiar</button>
            <button onClick={() => link(r.p, null)} className="ml-3 py-1 text-paprika-500 hover:underline">Desvincular</button>
          </div>
        </div>
      );
    }
    return (
      <>
        {renderFactSelect(r.p)}
        {r.brokenLink && (
          <p className="text-[11px] text-paprika-500 mt-1">El producto vinculado ya no existe en el facturador.</p>
        )}
      </>
    );
  }

  function renderFactor(r) {
    return (
      <input
        key={`${r.p.id}-${r.p.facturador_factor}`}
        defaultValue={Number(r.p.facturador_factor || 1).toLocaleString('es-AR')}
        inputMode="decimal"
        disabled={busy}
        onBlur={(e) => saveFactor(r.p, e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        title="Ej: 0,5 si en la tienda se vende por 1/2 kg y en el facturador por kg"
        className="w-14 rounded-md border border-ink/20 px-1.5 py-1 text-center text-sm font-mono bg-white focus:outline-none focus:ring-1 focus:ring-moss-600"
      />
    );
  }

  function renderPriceStatus(r) {
    if (r.target == null) return <span className="text-xs text-ink/40">—</span>;
    if (!r.diff) return <span className="text-xs text-moss-600 font-medium">✓ Igual</span>;
    return (
      <div>
        <div className="font-mono font-semibold text-paprika-500">{currency.format(r.target)}</div>
        <button onClick={() => syncOne(r)} disabled={busy} className="text-xs text-moss-700 hover:underline py-1">
          Aplicar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Facturador</h2>
          <p className="text-sm text-ink/50 mt-0.5 max-w-2xl">
            Vinculá cada producto de la tienda con el del facturador. Cuando cambies un precio en el facturador,
            se actualiza solo en la tienda.
          </p>
        </div>
        <button
          type="button"
          onClick={loadFacturador}
          disabled={loading || busy}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm hover:border-moss-600 disabled:opacity-50 transition-colors"
        >
          ↻ Recargar facturador
        </button>
      </div>

      {loading && <div className="text-center py-16 text-ink/40">Leyendo productos del facturador...</div>}

      {!loading && loadError && (
        <div className="rounded-xl border border-paprika-500/30 bg-paprika-500/10 p-4 text-sm text-ink">
          <p className="font-semibold text-paprika-600">No se pudo conectar con el facturador</p>
          <p className="mt-1 text-ink/70">{loadError.message}</p>
          {loadError.setup && (
            <p className="mt-2 text-ink/60">
              Revisá que en Netlify estén cargadas las variables <code>FACTURADOR_SUPABASE_URL</code> y{' '}
              <code>FACTURADOR_SUPABASE_SERVICE_KEY</code>, y que el sitio se haya vuelto a publicar.
              En modo local (<code>npm run dev</code>) esta sección no funciona.
            </p>
          )}
        </div>
      )}

      {!loading && !loadError && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-moss-700 text-paper p-4">
              <div className="text-2xl font-display font-bold">{stats.linked}</div>
              <div className="text-xs opacity-80 mt-0.5">vinculados de {products.length}</div>
            </div>
            <div className="rounded-xl bg-ink/10 text-ink p-4">
              <div className="text-2xl font-display font-bold">{stats.unlinked}</div>
              <div className="text-xs opacity-70 mt-0.5">sin vincular</div>
            </div>
            <div className={`rounded-xl p-4 ${stats.diff ? 'bg-turmeric-400 text-moss-900' : 'bg-ink/10 text-ink'}`}>
              <div className="text-2xl font-display font-bold">{stats.diff}</div>
              <div className="text-xs opacity-80 mt-0.5">con precio distinto</div>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {autoMatches.length > 0 && (
              <button
                type="button"
                onClick={autoLink}
                disabled={busy}
                className="rounded-full bg-moss-700 text-paper text-sm font-medium px-4 py-2 hover:bg-moss-600 disabled:opacity-50 transition-colors"
              >
                Vincular {autoMatches.length} por nombre
              </button>
            )}
            {stats.diff > 0 && (
              <button
                type="button"
                onClick={syncAll}
                disabled={busy}
                className="rounded-full bg-turmeric-400 text-moss-900 text-sm font-semibold px-4 py-2 hover:bg-turmeric-500 disabled:opacity-50 transition-colors"
              >
                Actualizar {stats.diff} precios desde el facturador
              </button>
            )}
          </div>

          {message && (
            <p className={`text-sm mb-4 px-3 py-2 rounded-md ${
              message.type === 'ok' ? 'bg-moss-700/10 text-moss-700' : 'bg-paprika-500/10 text-paprika-600'
            }`}>
              {message.text}
            </p>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f.id ? 'bg-moss-700 text-paper' : 'bg-white/60 border border-ink/15 text-ink/70 hover:border-moss-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto..."
              className="rounded-lg border border-ink/20 px-3 py-2 text-sm bg-white w-full sm:w-auto sm:min-w-[200px] focus:outline-none focus:ring-1 focus:ring-moss-600"
            />
          </div>

          {/* Mobile: cards */}
          <ul className="sm:hidden space-y-2">
            {visibleRows.map((r) => (
              <li key={r.p.id} className={`rounded-xl border border-ink/10 bg-white/60 p-3 ${busy ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wide text-ink/40">Tienda</div>
                    <div className="font-medium text-ink">{r.p.name}</div>
                    <div className="font-mono text-xs text-ink/50">{currency.format(r.p.price)}</div>
                  </div>
                  <div className="text-right shrink-0">{renderPriceStatus(r)}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-ink/10">
                  <div className="text-[10px] uppercase tracking-wide text-ink/40 mb-0.5">Facturador</div>
                  {renderFactCell(r)}
                </div>
                {r.f && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-ink/60">
                    Multiplicador ×{renderFactor(r)}
                    <span className="text-ink/40">(ej: 0,5 para 1/2 kg)</span>
                  </label>
                )}
              </li>
            ))}
            {visibleRows.length === 0 && (
              <li className="rounded-xl border border-ink/10 bg-white/60 px-4 py-12 text-center text-sm text-ink/40">
                {filter === 'pending' ? '¡Todo vinculado y con el mismo precio! 🎉' : 'Sin productos que coincidan.'}
              </li>
            )}
          </ul>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto bg-white/60 rounded-xl border border-ink/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10">
                  <th className="px-4 py-3">Tienda</th>
                  <th className="px-4 py-3">Facturador</th>
                  <th className="px-4 py-3 text-center" title="Multiplicador sobre el precio del facturador">×</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.p.id} className={`border-b border-ink/5 align-top ${busy ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-ink">{r.p.name}</div>
                      <div className="font-mono text-xs text-ink/50">{currency.format(r.p.price)}</div>
                    </td>
                    <td className="px-4 py-2.5 min-w-[240px]">{renderFactCell(r)}</td>
                    <td className="px-4 py-2.5 text-center">{r.f && renderFactor(r)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{renderPriceStatus(r)}</td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-ink/40">
                      {filter === 'pending' ? '¡Todo vinculado y con el mismo precio! 🎉' : 'Sin productos que coincidan.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
