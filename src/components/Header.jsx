import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { STORE_NAME } from '../lib/config';

// wholesaleClient: set inside the wholesale section (shows the client and a logout button)
export default function Header({ search, onSearchChange, onAISearch, wholesaleClient, onLogout }) {
  const { itemCount, setIsOpen } = useCart();
  const isWholesale = !!wholesaleClient;

  const sectionLink = isWholesale ? (
    <button
      type="button"
      onClick={onLogout}
      className="rounded-full border border-paper/30 px-3 py-2 text-xs sm:text-sm font-medium text-paper/85 hover:bg-moss-600 hover:text-paper transition-colors shrink-0"
      title={`Conectado como ${wholesaleClient.name}`}
    >
      Salir
    </button>
  ) : (
    <Link
      to="/mayorista"
      className="rounded-full bg-turmeric-400 text-moss-900 font-semibold px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-turmeric-500 transition-colors shrink-0"
    >
      Mayoristas
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 bg-moss-700 text-paper shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        {/* Top row: logo + cart button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <a href={isWholesale ? '/mayorista' : '/'} className="font-display text-2xl sm:text-3xl font-semibold tracking-tight shrink-0">
              {STORE_NAME}
              <span className="text-turmeric-400">.</span>
            </a>
            {isWholesale && (
              <span className="rounded bg-turmeric-400 text-moss-900 text-[10px] sm:text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
                Mayorista
              </span>
            )}
          </div>
          {/* Section link + cart button — mobile */}
          <div className="sm:hidden flex items-center gap-2 shrink-0">
            {sectionLink}
            <button
              onClick={() => setIsOpen(true)}
              className="relative flex items-center gap-2 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 transition-colors shrink-0"
            >
              Pedido
              {itemCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-paprika-500 text-paper text-xs font-mono">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar + desktop AI search button (hidden on mobile) */}
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar productos"
              className="w-full rounded-full bg-moss-600/60 border border-moss-400/40 text-paper placeholder:text-paper/60 px-4 py-2 text-sm focus:bg-moss-900 transition-colors"
            />
          </div>
          {/* AI Search button: HIDDEN on mobile (hidden), VISIBLE on desktop (sm:inline-flex) */}
          {onAISearch && (
            <button
              type="button"
              onClick={onAISearch}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-3.5 py-2 text-xs sm:text-sm hover:bg-turmeric-500 transition-all shrink-0 shadow-sm active:scale-95"
              title="Buscador inteligente con IA"
            >
              <span>✨</span>
              <span>IA</span>
            </button>
          )}
        </div>

        {/* Section link — desktop */}
        <div className="hidden sm:block">{sectionLink}</div>

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
