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

// Parses an amount typed the Argentine way: "300.000" → 300000, "8.910,50" → 8910.5.
// A single dot followed by 1-2 digits ("15.5") is taken as a decimal point.
// Returns null for empty input and NaN for anything unparseable.
export function parseArsAmount(text) {
  const raw = String(text ?? '').replace(/[$\s]/g, '');
  if (raw === '') return null;
  let normalized;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    normalized = raw.replace(/\./g, '');
  } else {
    normalized = raw;
  }
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

// Store price for a product linked to the facturador (also used by the Netlify sync function)
export function facturadorPrice(sellPrice, factor = 1) {
  return Math.round(Number(sellPrice) * Number(factor || 1) * 100) / 100;
}
