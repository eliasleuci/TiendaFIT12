export function checkIsWeighable(product) {
  // Check if there is an explicit flag (future-proof)
  if (typeof product.is_weighable === 'boolean') {
    return product.is_weighable;
  }
  
  // Fallback heuristic based on product name
  if (!product.name) return false;
  const name = product.name.toLowerCase();
  return name.includes('kg') || name.includes('gramos') || name.includes('grs') || name.includes(' g ') || name.endsWith(' g');
}
