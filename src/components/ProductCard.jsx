import { useCart } from '../context/CartContext';
import { checkIsWeighable } from '../lib/utils';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const isWeighable = checkIsWeighable(product);

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-ink/10 bg-white/50 hover:border-moss-500 hover:bg-white/80 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Image area */}
      {product.image_url ? (
        <div className="relative w-full h-44 overflow-hidden">
          {/* Blurred background */}
          <img
            src={product.image_url}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(14px) brightness(0.5) saturate(1.3)',
              transform: 'scale(1.1)',
            }}
          />
          {/* Main image — contained, no crop */}
          <img
            src={product.image_url}
            alt={product.name}
            className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-lg"
          />
        </div>
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-moss-50 to-ink/5 flex items-center justify-center">
          <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="text-ink/15">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
      )}


      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div>
          {product.code && (
            <span className="font-mono text-[10px] text-moss-600 border border-moss-600/30 rounded px-1.5 py-0.5 mb-2 inline-block">
              #{product.code}
            </span>
          )}
          <h3 className="font-display text-base leading-snug font-semibold text-ink">{product.name}</h3>
          {product.description && (
            <p className="mt-1 text-xs text-ink/55 line-clamp-2">{product.description}</p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="font-mono text-base font-bold text-paprika-500">
              {currency.format(product.price)}
            </span>
            {isWeighable && (
              <span className="text-[10px] text-ink/50 uppercase tracking-wide">por Kg</span>
            )}
          </div>
          <button
            onClick={() => addItem(product, 1)}
            className="rounded-full bg-moss-700 text-paper text-xs font-semibold px-3 py-1.5 hover:bg-moss-600 active:scale-95 transition-all shadow-sm shrink-0"
          >
            + Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
