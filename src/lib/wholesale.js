import { supabase } from './supabaseClient';

const SESSION_KEY = 'fit12_wholesale_dni';

export function isMock() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return !supabaseUrl || supabaseUrl.includes('tu-proyecto') || supabaseUrl.includes('mock.supabase');
}

export function normalizeDni(dni) {
  return String(dni || '').replace(/\D/g, '');
}

export function getSavedDni() {
  try {
    return localStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDni(dni) {
  try {
    if (dni) localStorage.setItem(SESSION_KEY, dni);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage unavailable: the client just has to log in again next time
  }
}

// Returns { name, minOrder } if the DNI is enabled, null otherwise
export async function wholesaleLogin(dni) {
  const clean = normalizeDni(dni);
  if (!clean) return null;

  if (isMock()) {
    return { name: 'Cliente demo', minOrder: 50000 };
  }

  const { data, error } = await supabase.rpc('wholesale_login', { p_dni: clean });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return row ? { name: row.name, minOrder: Number(row.min_order) || 0 } : null;
}

// Active products with a wholesale price; "price" is the wholesale price
export async function fetchWholesaleCatalog(dni) {
  if (isMock()) {
    const { MOCK_PRODUCTS } = await import('./mockData.js');
    return MOCK_PRODUCTS.map((p) => ({ ...p, retail_price: p.price, price: Math.round(p.price * 0.8) }));
  }

  const { data, error } = await supabase.rpc('wholesale_catalog', { p_dni: normalizeDni(dni) });
  if (error) throw new Error(error.message);
  return data || [];
}
