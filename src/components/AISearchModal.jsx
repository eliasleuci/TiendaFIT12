import { useState, useMemo } from 'react';
import { useCart } from '../context/CartContext';
import { checkIsWeighable } from '../lib/utils';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export default function AISearchModal({ isOpen, onClose, products = [] }) {
  const [query, setQuery] = useState('');
  const { addItem } = useCart();

  const suggestedQueries = [
    'Sin TACC para la merienda',
    'Frutos secos con alto contenido de proteína',
    'Especias y condimentos para guisos',
    'Suplementos deportivos',
  ];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products
      .filter((p) => {
        const text = `${p.name} ${p.description || ''} ${p.category_name || ''} ${p.code || ''}`.toLowerCase();
        return tokens.some((token) => text.includes(token));
      })
      .slice(0, 8);
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-moss-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-paper text-ink w-full max-w-xl rounded-2xl shadow-2xl border border-moss-600/20 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Modal Header */}
        <div className="bg-moss-700 text-paper p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="text-turmeric-400 text-xl">✨</span>
            <span>Buscador Inteligente IA</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-moss-600 hover:bg-moss-500 text-paper flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="relative">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué estás buscando? (ej: snacks saludables, sin tacc...)"
              className="w-full bg-white border border-moss-300 focus:border-moss-600 rounded-xl px-4 py-3 text-sm outline-none transition-all shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink text-sm"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Prompt Suggestions */}
          {!query && (
            <div>
              <p className="text-xs font-semibold text-moss-700 uppercase tracking-wider mb-2">
                Sugerencias de búsqueda
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(sug)}
                    className="text-xs bg-moss-50 hover:bg-turmeric-100 text-moss-800 border border-moss-200 rounded-full px-3 py-1.5 transition-colors text-left"
                  >
                    ✨ {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          {query && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-moss-700 uppercase tracking-wider">
                {results.length > 0 ? `Resultados encontrados (${results.length})` : 'No encontramos coincidencias directas'}
              </p>

              {results.map((product) => {
                const isWeighable = checkIsWeighable(product);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-ink/10 hover:border-moss-400 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-contain bg-moss-50 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-moss-100 flex items-center justify-center shrink-0 text-moss-600 font-bold text-xs">
                          Fit12
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-ink">{product.name}</h4>
                        <span className="font-mono text-xs font-bold text-paprika-500">
                          {currency.format(product.price)} {isWeighable && '/ Kg'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => addItem(product, 1)}
                      className="rounded-full bg-moss-700 text-paper text-xs font-semibold px-3 py-1.5 hover:bg-moss-600 active:scale-95 transition-all shrink-0"
                    >
                      + Agregar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
