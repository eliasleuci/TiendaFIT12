import { useState, useRef, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const SUGGESTIONS = [
  '🥞 Desayunos proteicos para la semana',
  '🏋️‍♂️ Combo Músculo & Recuperación',
  '🏃 Pre-entreno natural & Energía',
  '🥑 Snacks Keto & Low Carb',
  '🌿 Hierbas para la digestión o acidez',
  '😴 Té y hierbas para relajar y dormir',
  '📜 Pegar mi receta para armar el carrito',
];

export default function AISearch({ products, categories, isOpen, onClose }) {
  const { addItem, addMultipleItems } = useCart();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = sin buscar todavía
  const [aiMessage, setAiMessage] = useState('');
  const [nutriTip, setNutriTip] = useState(null);
  const [recipeTitle, setRecipeTitle] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Bloquear scroll de fondo al abrir modal (clave en iOS Safari)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setResults(null);
      setAiMessage('');
      setNutriTip(null);
      setRecipeTitle(null);
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Construimos el catálogo compacto para la API (optimizado para ahorrar tokens)
  const buildCatalog = useCallback(() => {
    if (!products || !Array.isArray(products)) return [];
    const catMap = {};
    if (categories && Array.isArray(categories)) {
      categories.forEach((c) => { if (c && c.id) catMap[c.id] = c.name; });
    }
    return products.map((p) => ({
      id: p.id,
      name: p.name || '',
      description: p.description ? p.description.slice(0, 50) : '',
      category: catMap[p.category_id] || '',
    }));
  }, [products, categories]);

  async function handleSearch(q = query) {
    const term = q.trim();
    if (!term || loading) return;
    setLoading(true);
    setError('');
    setResults(null);
    setAiMessage('');
    setNutriTip(null);
    setRecipeTitle(null);

    try {
      const res = await fetch('/.netlify/functions/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: term, products: buildCatalog() }),
      });

      if (!res.ok) throw new Error('Error del servidor');

      const data = await res.json();
      const matchedProducts = (data.ids || [])
        .map((id) => products.find((p) => p && p.id === id))
        .filter(Boolean);

      setResults(matchedProducts);
      setAiMessage(data.message || '');
      setNutriTip(data.nutriTip || null);
      setRecipeTitle(data.recipeTitle || null);
    } catch (err) {
      console.error('AI search error:', err);
      setError('No pudimos conectar con la IA. Revisá tu conexión o intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(s) {
    setQuery(s);
    handleSearch(s);
  }

  function handleAddAll() {
    if (results && results.length > 0) {
      addMultipleItems(results);
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-[8vh] px-3 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-moss-900/90"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-paper rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh]">

        {/* Header */}
        <div className="bg-moss-700 rounded-t-2xl px-4 sm:px-5 py-3.5 flex items-center gap-3 shrink-0 border-b border-moss-800">
          <span className="text-2xl">🤖</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold text-paper leading-tight flex items-center gap-2">
              <span>FitBot</span>
              <span className="text-turmeric-300 text-xs font-sans font-normal opacity-90">
                · Asistente Nutricional
              </span>
            </h2>
            <p className="text-moss-100/70 text-xs truncate">
              Pedí recetas, combos o consultá dudas sobre tu alimentación y metas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-paper/60 hover:text-paper p-1 transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Form Input */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-ink/10 shrink-0 bg-white/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej: Desayunos proteicos, receta de pancakes o dudas..."
              className="flex-1 rounded-xl border border-ink/20 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-moss-500 focus:ring-2 focus:ring-moss-500/20 shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="rounded-xl bg-turmeric-400 text-moss-900 font-bold px-4 py-2.5 text-sm hover:bg-turmeric-500 disabled:opacity-40 transition-all shrink-0 flex items-center justify-center min-w-[5rem] shadow-sm active:scale-95"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4 text-moss-900" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <span>Consultar</span>
              )}
            </button>
          </form>

          {/* Sugerencias de Objetivos */}
          {!results && !loading && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold text-moss-800 uppercase tracking-wider mb-2">
                🎯 Objetivos sugeridos &amp; Recetas rápidas:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-xs bg-moss-50 text-moss-800 border border-moss-600/20 rounded-full px-3 py-1 hover:bg-moss-700 hover:text-paper hover:border-transparent transition-all text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Body — resultados & NutriTip */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">

          {/* Cargando */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-ink/50">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-moss-700/20" />
                <div className="absolute inset-0 rounded-full border-4 border-moss-700 border-t-transparent animate-spin" />
              </div>
              <p className="text-sm font-medium text-moss-800">FitBot analizando tu consulta y catálogo...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-center gap-3 bg-paprika-500/10 border border-paprika-500/20 rounded-xl p-4">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-paprika-600 font-medium">{error}</p>
            </div>
          )}

          {/* Sin resultados */}
          {results && results.length === 0 && !loading && (
            <div className="text-center py-12 bg-white/50 rounded-xl border border-ink/5 p-6">
              <p className="text-3xl mb-2">🔍</p>
              <p className="font-display text-base text-ink/80 font-medium">{aiMessage || 'No encontré productos específicos para esa búsqueda.'}</p>
              {nutriTip && (
                <div className="mt-4 text-left bg-turmeric-50/80 border border-turmeric-400/30 rounded-xl p-4 text-xs text-moss-900">
                  <p className="font-bold text-moss-800 flex items-center gap-1.5 mb-1">
                    <span>💡 Consejo de FitBot:</span>
                  </p>
                  <p>{nutriTip}</p>
                </div>
              )}
              <p className="text-xs text-ink/40 mt-3">Probá consultar con otras palabras o seleccionar un objetivo de la lista.</p>
            </div>
          )}

          {/* Resultados encontrados */}
          {results && results.length > 0 && !loading && (
            <div className="space-y-4">

              {/* Título de Receta / Mensaje */}
              <div className="bg-moss-700/10 border border-moss-700/20 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {recipeTitle && (
                    <span className="text-[10px] font-mono uppercase font-bold text-turmeric-600 bg-turmeric-100 border border-turmeric-300 px-2 py-0.5 rounded inline-block mb-1">
                      Receta / Combo Recomendado
                    </span>
                  )}
                  <h3 className="font-display text-base font-bold text-moss-900 leading-tight">
                    {recipeTitle || aiMessage || 'Productos Recomendados'}
                  </h3>
                  {aiMessage && recipeTitle && (
                    <p className="text-xs text-moss-700 mt-0.5">{aiMessage}</p>
                  )}
                </div>

                {/* Botón 1-Clic para agregar todo el combo */}
                {results.length > 1 && (
                  <button
                    onClick={handleAddAll}
                    className="w-full sm:w-auto shrink-0 bg-turmeric-400 hover:bg-turmeric-500 text-moss-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 border border-turmeric-500/30"
                  >
                    <span>🛒 Agregar Combo Completo ({results.length} ítems)</span>
                  </button>
                )}
              </div>

              {/* Nutri-Tip / Asesoramiento Nutricional */}
              {nutriTip && (
                <div className="bg-gradient-to-br from-moss-50 to-emerald-50/50 border border-moss-600/20 rounded-xl p-3.5 sm:p-4 text-xs text-moss-900 shadow-sm">
                  <div className="flex items-center gap-2 font-bold text-moss-800 text-xs uppercase tracking-wider mb-1.5">
                    <span className="text-base">🌿</span>
                    <span>Asesoramiento FitBot</span>
                  </div>
                  <p className="leading-relaxed text-ink/80">{nutriTip}</p>
                </div>
              )}

              {/* Lista Grid de Productos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((product) => (
                  <div
                    key={product.id || product.name}
                    className="flex items-start justify-between gap-3 bg-white border border-ink/10 rounded-xl p-3 hover:border-moss-500 transition-all shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      {product.code && (
                        <span className="font-mono text-[10px] text-moss-600 border border-moss-600/30 rounded px-1.5 py-0.5 mb-1.5 inline-block">
                          #{product.code}
                        </span>
                      )}
                      <p className="font-display text-sm font-semibold text-ink leading-snug">{product.name || ''}</p>
                      {product.description && (
                        <p className="text-xs text-ink/50 mt-0.5 line-clamp-1">{product.description}</p>
                      )}
                      <p className="font-mono text-sm font-bold text-paprika-500 mt-1.5">
                        {currency.format(product?.price || 0)}
                      </p>
                    </div>
                    <button
                      onClick={() => addItem(product, 1)}
                      className="shrink-0 rounded-full bg-moss-700 text-paper text-xs font-semibold px-3 py-1.5 hover:bg-moss-600 active:scale-95 transition-all mt-1 shadow-sm"
                    >
                      + Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-ink/8 bg-ink/[0.02] rounded-b-2xl">
          <p className="text-center text-xs text-ink/40">
            Presioná <kbd className="font-mono bg-ink/10 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> para cerrar · FitBot IA
          </p>
        </div>
      </div>
    </div>
  );
}

