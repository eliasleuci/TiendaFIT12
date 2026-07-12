import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function BulkPriceModal({ categories, onClose, onDone }) {
  const [mode, setMode] = useState('all'); // 'all' | 'category'
  const [categoryId, setCategoryId] = useState('');
  const [pct, setPct] = useState('');
  const [type, setType] = useState('increase'); // 'increase' | 'decrease'
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleApply(e) {
    e.preventDefault();
    const pctNum = parseFloat(pct);
    if (!pct || isNaN(pctNum) || pctNum <= 0 || pctNum > 100) {
      setError('Ingresá un porcentaje válido entre 1 y 100.');
      return;
    }
    if (mode === 'category' && !categoryId) {
      setError('Seleccioná una categoría.');
      return;
    }
    const confirmed = confirm(
      `¿Confirmás aplicar un ${type === 'increase' ? 'aumento' : 'descuento'} del ${pctNum}% a ${mode === 'all' ? 'TODOS los productos' : 'la categoría seleccionada'}?`
    );
    if (!confirmed) return;

    setApplying(true);
    setError('');

    // Fetch products to update
    let query = supabase.from('products').select('id, price');
    if (mode === 'category') query = query.eq('category_id', categoryId);
    const { data: products, error: fetchErr } = await query;

    if (fetchErr) {
      setError(fetchErr.message);
      setApplying(false);
      return;
    }

    const multiplier = type === 'increase' ? 1 + pctNum / 100 : 1 - pctNum / 100;
    const updates = products.map((p) => ({
      id: p.id,
      price: Math.round(p.price * multiplier * 100) / 100,
    }));

    // Upsert in batches of 50
    for (let i = 0; i < updates.length; i += 50) {
      const batch = updates.slice(i, i + 50);
      const { error: upsertErr } = await supabase.from('products').upsert(batch);
      if (upsertErr) {
        setError(upsertErr.message);
        setApplying(false);
        return;
      }
    }

    setApplying(false);
    setDone(true);
    setTimeout(() => {
      onDone();
      onClose();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-paper rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-moss-700">Ajuste de precios en lote</h2>
          <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-display text-lg font-semibold text-moss-700">¡Precios actualizados!</p>
          </div>
        ) : (
          <form onSubmit={handleApply} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2">Tipo de ajuste</label>
              <div className="grid grid-cols-2 gap-2">
                {[['increase', '📈 Aumento'], ['decrease', '📉 Descuento']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setType(val)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      type === val
                        ? 'bg-moss-700 text-paper border-moss-700'
                        : 'border-ink/20 hover:border-moss-500 text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Percentage */}
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Porcentaje (%)</label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.5"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                placeholder="Ej: 15"
                className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
              />
            </div>

            {/* Scope */}
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-2">Aplicar a</label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[['all', '📦 Todos los productos'], ['category', '🗂️ Una categoría']].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMode(val)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      mode === val
                        ? 'bg-moss-700 text-paper border-moss-700'
                        : 'border-ink/20 hover:border-moss-500 text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {mode === 'category' && (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {pct && (
              <div className="bg-turmeric-50 border border-turmeric-200 rounded-lg px-4 py-3 text-sm text-turmeric-800">
                Se aplicará un <strong>{type === 'increase' ? 'aumento' : 'descuento'} del {pct}%</strong> a{' '}
                {mode === 'all'
                  ? 'todos los productos'
                  : `los productos de "${categories.find((c) => c.id === categoryId)?.name || '...'}"`}
              </div>
            )}

            {error && <p className="text-paprika-500 text-sm bg-paprika-50 px-3 py-2 rounded-md">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={applying}
                className="flex-1 rounded-full bg-moss-700 text-paper font-medium py-2.5 hover:bg-moss-600 disabled:opacity-50 transition-colors"
              >
                {applying ? 'Aplicando...' : 'Aplicar cambio'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:border-moss-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
