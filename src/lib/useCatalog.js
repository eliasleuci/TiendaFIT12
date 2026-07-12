import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './mockData';

export function useCatalog() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('tu-proyecto.supabase') || supabaseUrl.includes('mock.supabase')) {
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
        setError(catErr?.message || prodErr?.message || 'Error al cargar el catálogo');
      } else {
        setCategories(cats || []);
        setProducts(prods || []);
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al conectar con Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, products, loading, error, reload };
}
