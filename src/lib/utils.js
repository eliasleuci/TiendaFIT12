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

export function formatWeight(qty) {
  if (qty < 1) {
    return `${qty * 1000}g`;
  }
  if (Number.isInteger(qty)) {
    return `${qty} kg`;
  }
  // For cases like 1.5 kg, 1.25 kg
  return `${qty} kg`;
}
