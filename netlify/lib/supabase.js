// Helpers shared by the facturador sync functions.
// They talk to Supabase through its REST API with plain fetch (no extra dependencies).

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// The store project (this site). VITE_* vars are already set in Netlify for the build.
export function storeConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// The facturador project (the invoicing app, a separate Supabase project)
export function facturadorConfig() {
  return {
    url: process.env.FACTURADOR_SUPABASE_URL,
    serviceKey: process.env.FACTURADOR_SUPABASE_SERVICE_KEY,
  };
}

export async function rest(baseUrl, key, path, init = {}) {
  const res = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// True if the request carries a valid session of the store admin
// (in this store every authenticated user is the admin)
export async function isStoreAdmin(req) {
  const { url, anonKey } = storeConfig();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || !url || !anonKey) return false;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
