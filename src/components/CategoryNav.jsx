import { useRef, useState, useEffect } from 'react';

export default function CategoryNav({ categories, activeCategory, onSelect }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  return (
    <nav className="sticky top-[57px] sm:top-[61px] z-20 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="relative max-w-6xl mx-auto">
        {/* Fade + arrow left */}
        {canScrollLeft && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-paper/95 to-transparent z-10 pointer-events-none" />
            <button
              onClick={() => scroll(-1)}
              aria-label="Categorías anteriores"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-ink/15 shadow-sm hover:bg-moss-50 transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
          </>
        )}

        {/* Scrollable list */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none py-3 px-4 sm:px-6"
        >
          <button
            onClick={() => onSelect(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
              activeCategory === null
                ? 'bg-moss-700 text-paper border-moss-700'
                : 'bg-transparent text-ink border-ink/20 hover:border-moss-600'
            }`}
          >
            Todo
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                activeCategory === cat.id
                  ? 'bg-moss-700 text-paper border-moss-700'
                  : 'bg-transparent text-ink border-ink/20 hover:border-moss-600'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Fade + arrow right */}
        {canScrollRight && (
          <>
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-paper/95 to-transparent z-10 pointer-events-none" />
            <button
              onClick={() => scroll(1)}
              aria-label="Más categorías"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-white border border-ink/15 shadow-sm hover:bg-moss-50 transition-colors"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
