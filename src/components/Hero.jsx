import { STORE_LOCATION, STORE_TAGLINE } from '../lib/config';

export default function Hero({ productCount, categoryCount }) {
  return (
    <section className="bg-moss-700 text-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20">
        <p className="font-mono text-xs sm:text-sm uppercase tracking-[0.2em] text-turmeric-400 mb-4">
          {STORE_LOCATION} · Mayor y menor
        </p>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] font-semibold max-w-2xl">
          {STORE_TAGLINE}, directo desde el mostrador.
        </h1>
        <div className="mt-5 max-w-xl text-moss-100/90 text-base sm:text-lg flex flex-col gap-1">
          <p>🌿 Productos saludables & sin TACC</p>
          <p>🥜 Frutos secos • Suplementos • Aceites</p>
          <p>🌶️ Especies y Condimentos</p>
          <p>📦 Envíos sin cargo</p>
          <p>📍 Córdoba | 🛒 Pedí online 👇</p>
        </div>

        <div className="mt-8 flex gap-8 font-mono text-sm">
          <div>
            <div className="text-2xl sm:text-3xl text-turmeric-400 font-semibold">{productCount}</div>
            <div className="text-moss-100/70 uppercase tracking-wide text-xs mt-1">productos</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl text-turmeric-400 font-semibold">{categoryCount}</div>
            <div className="text-moss-100/70 uppercase tracking-wide text-xs mt-1">categorías</div>
          </div>
        </div>
      </div>
    </section>
  );
}
