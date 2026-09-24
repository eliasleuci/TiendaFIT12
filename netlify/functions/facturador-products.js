// netlify/functions/facturador-products.js
// Devuelve la lista de productos del facturador (id, nombre, precio, unidad) para
// la pantalla de vinculación del admin. Solo para el admin logueado.
// La clave del facturador vive solo en Netlify, nunca llega al navegador.

import { facturadorConfig, isStoreAdmin, json, rest } from '../lib/supabase.js';

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  if (!(await isStoreAdmin(req))) return json({ error: 'No autorizado' }, 401);

  const { url, serviceKey } = facturadorConfig();
  if (!url || !serviceKey) {
    return json({ error: 'Faltan FACTURADOR_SUPABASE_URL o FACTURADOR_SUPABASE_SERVICE_KEY en Netlify', setup: true }, 500);
  }

  try {
    const products = await rest(url, serviceKey, 'Product?select=id,name,sellPrice,unitType&order=name.asc');
    return json({ products });
  } catch (err) {
    console.error(err);
    return json({ error: `No se pudo leer el facturador: ${err.message}` }, 502);
  }
};
