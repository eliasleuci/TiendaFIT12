import { useCart } from '../context/CartContext';
import { STORE_NAME } from '../lib/config';

export default function Header({ search, onSearchChange, onAISearch }) {
  const { itemCount, setIsOpen } = useCart();

  return (
    <header className="sticky top-0 z-30 bg-moss-700 text-paper shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        {/* Top row: logo + cart button */}
        <div className="flex items-center justify-between">
          <a href="/" className="font-display text-2xl sm:text-3xl font-semibold tracking-tight shrink-0">
            {STORE_NAME}
            <span className="text-turmeric-400">.</span>
          </a>
          {/* Cart button — mobile */}
          <button
            onClick={() => setIsOpen(true)}
            className="sm:hidden relative flex items-center gap-2 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 transition-colors shrink-0"
          >
            Pedido
            {itemCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-paprika-500 text-paper text-xs font-mono">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Search row */}
        <div className="flex-1 flex items-center gap-2">
          {/* Buscador normal */}
          <div className="flex-1 relative">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar productos"
              className="w-full rounded-full bg-moss-600/60 border border-moss-400/40 text-paper placeholder:text-paper/60 px-4 py-2 text-sm focus:bg-moss-900 transition-colors"
            />
          </div>

          {/* Botón IA */}
          <button
            onClick={onAISearch}
            title="Búsqueda inteligente con IA"
            className="shrink-0 relative flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 via-turmeric-400 to-amber-500 text-moss-950 font-bold px-3.5 py-1.5 text-xs sm:text-sm shadow-lg shadow-amber-400/30 hover:shadow-amber-400/50 hover:scale-105 active:scale-95 transition-all ring-2 ring-amber-300/40 border border-white/20"
          >
            <span className="text-sm leading-none animate-pulse">✨</span>
            <span className="font-extrabold tracking-wide">IA</span>
          </button>
        </div>

        {/* Cart button — desktop */}
        <button
          onClick={() => setIsOpen(true)}
          className="hidden sm:flex relative items-center gap-2 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 transition-colors shrink-0"
        >
          Pedido
          {itemCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-paprika-500 text-paper text-xs font-mono">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
