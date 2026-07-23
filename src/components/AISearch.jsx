import { useState, useRef, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const SUGGESTIONS = [
  '🌿 hierbas para la digestión o acidez',
  '🥜 frutos secos para snack saludable',
  '🍯 endulzantes naturales sin azúcar',
  '💪 suplementos y proteínas para entrenar',
  '🧉 algo sano para acompañar el mate',
  '🧂 especias y condimentos para cocinar',
  '🥥 aceite de coco y frutos desecados',
  '😴 té o hierbas para relajar y dormir',
];

export default function AISearch({ products, categories, isOpen, onClose }) {
  const { addItem } = useCart();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // null = sin buscar todavía
  const [aiMessage, setAiMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Bloquear scroll de fondo al abrir modal (clave en iOS Safari)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQuery('');
      setResults(null);
      setAiMessage('');
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

  // Construimos el catálogo compacto para la API (optimizado para móviles)
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-[10vh] px-3 sm:px-4">
      {/* Backdrop — sin backdrop-blur para evitar fallos de GPU en iOS Safari */}
      <div
        className="absolute inset-0 bg-moss-900/90"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-paper rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh]">

        {/* Header */}
        <div className="bg-moss-700 px-4 sm:px-5 py-3.5 flex items-center gap-3 shrink-0">
          <span className="text-2xl">✨</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-base sm:text-lg font-semibold text-paper leading-tight">
              Buscador inteligente
            </h2>
            <p className="text-moss-100/70 text-xs truncate">
              Describí lo que buscás — la IA encuentra los productos
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
        <div className="px-4 sm:px-5 py-3.5 border-b border-ink/10 shrink-0">
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
              placeholder="Ej: algo para la digestión o acidez..."
              className="flex-1 rounded-xl border border-ink/20 bg-white px-3.5 py-2 text-sm focus:outline-none focus:border-moss-500 focus:ring-1 focus:ring-moss-500/30"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="rounded-xl bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 disabled:opacity-40 transition-colors shrink-0 flex items-center justify-center min-w-[4rem]"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : 'Buscar'}
            </button>
          </form>

          {/* Sugerencias */}
          {!results && !loading && (
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  className="text-xs bg-moss-100 text-moss-700 border border-moss-600/20 rounded-full px-3 py-1 hover:bg-moss-700 hover:text-paper transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body — resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* Cargando */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-ink/50">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-4 border-moss-700/20" />
                <div className="absolute inset-0 rounded-full border-4 border-moss-700 border-t-transparent animate-spin" />
              </div>
              <p className="text-sm">La IA está buscando en el catálogo...</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="flex items-center gap-3 bg-paprika-500/10 border border-paprika-500/20 rounded-xl p-4">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-paprika-600">{error}</p>
            </div>
          )}

          {/* Sin resultados */}
          {results && results.length === 0 && !loading && (
            <div className="text-center py-14">
              <p className="text-3xl mb-3">🔍</p>
              <p className="font-display text-lg text-ink/70">{aiMessage || 'No encontré productos para esa búsqueda.'}</p>
              <p className="text-sm text-ink/40 mt-1">Probá con otras palabras o navegá el catálogo.</p>
            </div>
          )}

          {/* Resultados */}
          {results && results.length > 0 && !loading && (
            <div>
              {aiMessage && (
                <div className="flex items-center gap-2 mb-4 bg-moss-700/8 border border-moss-700/15 rounded-xl px-4 py-3">
                  <span className="text-lg">✨</span>
                  <p className="text-sm text-moss-700 font-medium">{aiMessage}</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((product) => (
                  <div
                    key={product.id || product.name}
                    className="flex items-start justify-between gap-3 bg-white/80 border border-ink/10 rounded-xl p-3 hover:border-moss-500 transition-all"
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
                      onClick={() => {
                        addItem(product, 1);
                      }}
                      className="shrink-0 rounded-full bg-moss-700 text-paper text-xs font-semibold px-3 py-1.5 hover:bg-moss-600 active:scale-95 transition-all mt-1"
                    >
                      + Agregar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-ink/8 bg-ink/[0.02]">
          <p className="text-center text-xs text-ink/30">
            Presioná <kbd className="font-mono bg-ink/10 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> para cerrar · Powered by Claude AI
          </p>
        </div>
      </div>
    </div>
  );
}
