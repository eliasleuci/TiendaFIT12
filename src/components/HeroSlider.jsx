import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { checkIsWeighable } from '../lib/utils';

const SLIDES = [
  {
    src: '/slides/slide1.jpg',
    label: '💪 Suplementos premium',
    sub: 'Whey Protein · Creatina · Colágeno — Sin TACC',
  },
  {
    src: '/slides/slide2.jpg',
    label: '',
    sub: '',
  },
  {
    src: '/slides/slide3.jpg',
    label: '🥜 Almendras laminadas',
    sub: 'Frutos secos naturales, directo del distribuidor',
  },
  {
    src: '/slides/slide4.jpg',
    label: '🌾 Cereales & Legumbres',
    sub: 'Maíz, porotos, ají molido y mucho más',
  },
  {
    src: '/slides/slide5.jpg',
    label: '',
    sub: '',
  },
  {
    src: '/slides/slide6.jpg',
    label: '🌿 Hierbas Medicinales',
    sub: 'Orégano, romero, tomillo, menta y más',
  },
  {
    src: '/slides/slide7.jpg',
    label: '🌿 Espirulina en hebras',
    sub: '100% pura, sin aditivos ni conservantes.',
  },
];

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

const INTERVAL_MS = 5000;
const TRANSITION_MS = 800;

export default function HeroSlider({ featuredProducts = [] }) {
  const { addItem } = useCart();

  // Featured products (set from the admin) replace the default slides;
  // the defaults are only a fallback when nothing is featured
  const slides = useMemo(() => {
    const productSlides = featuredProducts
      .filter((p) => p.image_url)
      .map((p) => ({
        src: p.image_url,
        label: p.featured_title || p.name,
        sub: p.featured_subtitle || p.description || '',
        product: p,
      }));
    return productSlides.length > 0 ? productSlides : SLIDES;
  }, [featuredProducts]);

  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);

  // Refs to avoid stale closures inside interval callback
  const currentRef = useRef(0);
  const animatingRef = useRef(false);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const lengthRef = useRef(slides.length);

  useEffect(() => {
    lengthRef.current = slides.length;
    // Featured products load async: restart from the first slide when the list changes
    currentRef.current = 0;
    setCurrent(0);
    setPrev(null);
  }, [slides.length]);

  const goTo = useCallback((index) => {
    if (animatingRef.current) return;
    if (index === currentRef.current) return;

    const from = currentRef.current;
    animatingRef.current = true;
    currentRef.current = index;

    setPrev(from);
    setCurrent(index);

    setTimeout(() => {
      setPrev(null);
      animatingRef.current = false;
    }, TRANSITION_MS);
  }, []);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      const next = (currentRef.current + 1) % lengthRef.current;
      goTo(next);
    }, INTERVAL_MS);
  }, [goTo]);

  // Mount: start timer once, clean up on unmount
  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  const handlePrev = () => {
    goTo((currentRef.current - 1 + lengthRef.current) % lengthRef.current);
  };
  const handleNext = () => {
    goTo((currentRef.current + 1) % lengthRef.current);
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-moss-900"
      style={{ height: 'clamp(240px, 42vw, 500px)' }}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      {slides.map((slide, i) => {
        const isActive = i === current;
        const isPrev = i === prev;

        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              zIndex: isActive ? 2 : isPrev ? 1 : 0,
              opacity: isActive ? 1 : 0,
              transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.4,0,0.2,1)`,
            }}
          >
            {/* Blurred background */}
            <img
              src={slide.src}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: 'blur(22px) brightness(0.45) saturate(1.4)',
                transform: 'scale(1.12)',
              }}
            />

            {/* Main image — fully contained, no crop */}
            <img
              src={slide.src}
              alt={slide.label || 'Fit 12'}
              className="relative z-10 h-full mx-auto object-contain drop-shadow-2xl"
              style={{ maxWidth: '100%' }}
            />

            {/* Bottom gradient for text */}
            {slide.label && (
              <div className={`absolute inset-x-0 bottom-0 z-20 ${slide.product ? 'h-56' : 'h-40'} bg-gradient-to-t from-black/65 via-black/15 to-transparent pointer-events-none`} />
            )}

            {/* Text */}
            {slide.label && (
              <div className="absolute bottom-0 left-0 right-0 z-30 px-6 sm:px-12 pb-6 sm:pb-10">
                <div
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateY(0)' : 'translateY(16px)',
                    transition: `opacity 0.55s ease ${isActive ? '0.3s' : '0s'}, transform 0.55s ease ${isActive ? '0.3s' : '0s'}`,
                  }}
                >
                  <h2 className="font-display text-xl sm:text-3xl lg:text-4xl font-bold text-white drop-shadow-xl leading-tight">
                    {slide.label}
                  </h2>
                  {slide.sub && (
                    <p className="mt-1.5 text-white/80 text-sm sm:text-base font-medium drop-shadow-md max-w-xl line-clamp-2">
                      {slide.sub}
                    </p>
                  )}
                  {slide.product && (
                    <div className="mt-3 flex items-center gap-3">
                      <span className="font-mono text-lg sm:text-2xl font-bold text-turmeric-400 drop-shadow-md">
                        {currency.format(slide.product.price)}
                        {checkIsWeighable(slide.product) && (
                          <span className="ml-1 text-xs text-white/70 font-medium">/ kg</span>
                        )}
                      </span>
                      <button
                        onClick={() => addItem(slide.product, 1)}
                        tabIndex={isActive ? 0 : -1}
                        className="rounded-full bg-turmeric-400 text-moss-900 text-xs sm:text-sm font-semibold px-4 py-2 hover:bg-turmeric-500 active:scale-95 transition-all shadow-lg"
                      >
                        + Agregar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Prev arrow */}
      <button
        onClick={handlePrev}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/55 transition-all hover:scale-110"
        aria-label="Anterior"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      {/* Next arrow */}
      <button
        onClick={handleNext}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/55 transition-all hover:scale-110"
        aria-label="Siguiente"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex gap-1.5 items-center">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            style={{
              width: i === current ? '28px' : '8px',
              height: '8px',
              opacity: i === current ? 1 : 0.45,
              transition: 'all 0.3s ease',
            }}
            className="rounded-full bg-white shadow"
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Counter */}
      <div className="absolute top-3 right-4 z-40 text-white/60 text-xs font-mono bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full select-none">
        {current + 1} / {slides.length}
      </div>
    </div>
  );
}
