import ProductCard from './ProductCard';

export default function ProductGrid({ groupedProducts }) {
  if (groupedProducts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-display text-2xl text-ink/70">Sin resultados</p>
        <p className="mt-2 text-ink/50 text-sm">Probá con otro nombre o código de producto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {groupedProducts.map(({ category, products }) => (
        <section key={category.id} id={`cat-${category.id}`}>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="font-display text-2xl font-semibold text-moss-700">{category.name}</h2>
            <span className="font-mono text-xs text-ink/40">{products.length} items</span>
            <div className="flex-1 border-t border-ink/15" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
