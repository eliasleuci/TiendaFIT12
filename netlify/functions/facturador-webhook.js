// netlify/functions/facturador-webhook.js
// Lo llama el Database Webhook del Supabase del facturador cada vez que se crea o
// modifica un producto ahí, y actualiza el precio de los productos de la tienda
// vinculados a él. La tienda lo muestra al instante (realtime).

import { facturadorPrice } from '../../src/lib/utils.js';
import { json, rest, storeConfig } from '../lib/supabase.js';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = process.env.FACTURADOR_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return json({ error: 'No autorizado' }, 401);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Body inválido' }, 400);
  }

  const { type, record, old_record: oldRecord } = payload || {};
  if (!['INSERT', 'UPDATE'].includes(type) || !record?.id) {
    return json({ ignored: 'evento no relevante' });
  }
  if (oldRecord && Number(oldRecord.sellPrice) === Number(record.sellPrice)) {
    return json({ ignored: 'el precio no cambió' });
  }

  const { url, serviceKey } = storeConfig();
  if (!url || !serviceKey) {
    return json({ error: 'Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Netlify' }, 500);
  }

  try {
    const linked = await rest(
      url,
      serviceKey,
      `products?facturador_id=eq.${encodeURIComponent(record.id)}&select=id,name,price,facturador_factor`
    );
    if (!linked?.length) return json({ ignored: 'producto no vinculado a la tienda' });

    const now = new Date().toISOString();
    const updated = [];
    for (const product of linked) {
      const price = facturadorPrice(record.sellPrice, product.facturador_factor);
      if (price === Number(product.price)) continue;
      await rest(url, serviceKey, `products?id=eq.${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ price, price_synced_at: now }),
      });
      console.log(`Precio actualizado: ${product.name} ${product.price} → ${price}`);
      updated.push({ name: product.name, from: Number(product.price), to: price });
    }
    return json({ updated });
  } catch (err) {
    console.error(err);
    return json({ error: err.message }, 502);
  }
};
