import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './mockData';

function isMock() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return !supabaseUrl || supabaseUrl.includes('tu-proyecto.supabase') || supabaseUrl.includes('mock.supabase');
}

export function useCatalog() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // silent: refresh in the background without showing the loading state
  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    if (isMock()) {
      setTimeout(() => {
        setCategories(MOCK_CATEGORIES);
        setProducts(MOCK_PRODUCTS);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const [{ data: cats, error: catErr }, { data: prods, error: prodErr }] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);
      if (catErr || prodErr) {
        if (silent) return;
        setError(catErr?.message || prodErr?.message || 'Error al cargar el catálogo');
      } else {
        setCategories(cats || []);
        setProducts(prods || []);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      if (!silent) setError('Error de red al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live updates: refetch when the admin changes products or categories.
  // Requires the tables in the supabase_realtime publication (supabase/realtime.sql).
  useEffect(() => {
    if (isMock()) return;

    let timer;
    // Debounced so bulk edits (e.g. price updates) trigger a single refetch
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => reload({ silent: true }), 400);
    };

    const channel = supabase
      .channel('catalog-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, refresh)
      .subscribe();

    // Backup: realtime can't deliver changes that hide a product from anonymous
    // visitors (RLS), so also refresh when the tab becomes visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [reload]);

  return { categories, products, loading, error, reload };
}
