import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { normalizeDni } from '../../lib/wholesale';
import { parseArsAmount } from '../../lib/utils';
import WholesaleCatalog from './WholesaleCatalog';

const emptyForm = { dni: '', name: '', phone: '' };

const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

const TABS = [
  { id: 'catalog', label: 'Catálogo y precios' },
  { id: 'clients', label: 'Clientes y pedido mínimo' },
];

export default function WholesaleManager({ categories, products, reload }) {
  const [tab, setTab] = useState('catalog');

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-ink">Mayoristas</h2>
        <p className="text-sm text-ink/50 mt-0.5">
          Elegí qué categorías y precios ven tus clientes mayoristas, y quiénes pueden ingresar con su DNI.
        </p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-ink/10 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'border-moss-700 text-moss-700' : 'border-transparent text-ink/50 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'catalog' && <WholesaleCatalog categories={categories} products={products} reload={reload} />}
      {tab === 'clients' && <ClientsPanel />}
    </div>
  );
}

function ClientsPanel() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minOrder, setMinOrder] = useState('');
  const [savedMinOrder, setSavedMinOrder] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);

  const wholesaleUrl = `${window.location.origin}/mayorista`;

  async function load() {
    const [{ data: rows, error: clientsError }, { data: settings }] = await Promise.all([
      supabase.from('wholesale_clients').select('*').order('name', { ascending: true }),
      supabase.from('wholesale_settings').select('min_order').eq('id', 1).maybeSingle(),
    ]);
    if (clientsError) setError(`No se pudieron cargar los clientes: ${clientsError.message}`);
    setClients(rows || []);
    if (settings) {
      setMinOrder(Number(settings.min_order) ? currency.format(Number(settings.min_order)).replace(/[$\s]/g, '') : '');
      setSavedMinOrder(Number(settings.min_order) || 0);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(term) || c.dni.includes(normalizeDni(term) || term));
  }, [clients, search]);

  async function saveMinOrder() {
    const value = parseArsAmount(minOrder) ?? 0;
    if (Number.isNaN(value) || value < 0) { setError('Monto mínimo inválido. Ejemplo: 300.000'); return; }
    setError('');
    const { error: saveError } = await supabase.from('wholesale_settings').upsert({ id: 1, min_order: value });
    if (saveError) { setError(saveError.message); return; }
    setSavedMinOrder(value);
  }

  function startEdit(client) {
    setEditingId(client.id);
    setForm({ dni: client.dni, name: client.name, phone: client.phone || '' });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const dni = normalizeDni(form.dni);
    if (dni.length < 7 || !form.name.trim()) {
      setError('Completá un DNI válido (sin puntos) y el nombre.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = { dni, name: form.name.trim(), phone: form.phone.trim() || null };
    const { error: saveError } = editingId
      ? await supabase.from('wholesale_clients').update(payload).eq('id', editingId)
      : await supabase.from('wholesale_clients').insert(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.code === '23505' ? `Ya hay un cliente con el DNI ${dni}.` : saveError.message);
      return;
    }
    cancelEdit();
    load();
  }

  async function toggleActive(client) {
    await supabase.from('wholesale_clients').update({ active: !client.active }).eq('id', client.id);
    load();
  }

  async function deleteClient(client) {
    if (!confirm(`¿Eliminar a "${client.name}" (DNI ${client.dni})? Ya no va a poder ingresar al sector mayorista.`)) return;
    await supabase.from('wholesale_clients').delete().eq('id', client.id);
    if (editingId === client.id) cancelEdit();
    load();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(wholesaleUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available: the link is visible to copy by hand
    }
  }

  const inputClass = 'w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-600';

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2 mb-6">
        {/* Settings */}
        <div className="rounded-xl border border-ink/10 bg-white/60 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Pedido mínimo mayorista (ARS)</label>
            <div className="flex gap-2">
              <input
                inputMode="decimal"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="Ej: 300.000 (vacío = sin mínimo)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={saveMinOrder}
                disabled={(parseArsAmount(minOrder) ?? 0) === savedMinOrder}
                className="rounded-full bg-moss-700 text-paper text-sm font-medium px-4 hover:bg-moss-600 disabled:opacity-40 transition-colors shrink-0"
              >
                Guardar
              </button>
            </div>
            {savedMinOrder !== null && (
              <p className="mt-1 text-xs text-ink/50">
                Mínimo actual: <strong className="text-ink">{savedMinOrder > 0 ? currency.format(savedMinOrder) : 'sin mínimo'}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Link para tus clientes</label>
            <div className="flex gap-2">
              <input readOnly value={wholesaleUrl} className={`${inputClass} font-mono text-xs`} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                onClick={copyLink}
                className="rounded-full border border-ink/20 text-sm px-4 hover:border-moss-600 transition-colors shrink-0"
              >
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Add / edit client */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-ink/10 bg-white/60 p-4">
          <h3 className="font-medium text-sm text-ink mb-3">{editingId ? 'Editar cliente' : 'Dar de alta un cliente'}</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              value={form.dni}
              onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
              placeholder="DNI *"
              className={`${inputClass} font-mono`}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Teléfono"
              className={inputClass}
            />
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre o comercio *"
              className={`${inputClass} col-span-2`}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-full bg-turmeric-400 text-moss-900 font-semibold py-2 text-sm hover:bg-turmeric-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : '+ Dar de alta'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-full border border-ink/20 px-4 text-sm hover:border-moss-600">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {error && <p className="text-paprika-500 text-sm mb-4 bg-paprika-500/10 px-3 py-2 rounded-md">{error}</p>}

      {/* Clients list */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-ink/50">
          {clients.length} {clients.length === 1 ? 'cliente' : 'clientes'} · {clients.filter((c) => c.active).length} habilitados
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="rounded-lg border border-ink/20 px-3 py-2 text-sm bg-white w-full sm:w-auto sm:min-w-[220px] focus:outline-none focus:ring-1 focus:ring-moss-600"
        />
      </div>

      {!loading && filtered.length === 0 && (
        <div className="sm:hidden rounded-xl border border-ink/10 bg-white/60 px-4 py-12 text-center text-sm text-ink/40">
          {clients.length === 0 ? 'Todavía no diste de alta ningún cliente mayorista.' : 'Sin clientes que coincidan.'}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-ink/40">Cargando clientes...</div>
      ) : (
        <>
        {/* Mobile: cards */}
        <ul className="sm:hidden space-y-2">
          {filtered.map((c) => (
            <li key={c.id} className="rounded-xl border border-ink/10 bg-white/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{c.name}</div>
                  <div className="text-xs text-ink/55 mt-0.5">
                    DNI <span className="font-mono">{c.dni}</span>
                    {c.phone && <> · {c.phone}</>}
                  </div>
                </div>
                <Toggle on={c.active} onClick={() => toggleActive(c)} label={c.active ? 'Deshabilitar' : 'Habilitar'} />
              </div>
              <div className="mt-2 flex gap-4 text-sm">
                <button onClick={() => startEdit(c)} className="text-moss-700 font-medium py-1">Editar</button>
                <button onClick={() => deleteClient(c)} className="text-paprika-500 py-1">Eliminar</button>
              </div>
            </li>
          ))}
        </ul>

        {/* Desktop: table */}
        <div className="hidden sm:block overflow-x-auto bg-white/60 rounded-xl border border-ink/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10">
                <th className="px-4 py-3">DNI</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-center">Habilitado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-ink/5 hover:bg-white/60 transition-colors">
                  <td className="px-4 py-2 font-mono text-xs">{c.dni}</td>
                  <td className="px-4 py-2 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-2 text-ink/60 text-xs">{c.phone || '—'}</td>
                  <td className="px-4 py-2 text-center">
                    <Toggle on={c.active} onClick={() => toggleActive(c)} label={c.active ? 'Deshabilitar' : 'Habilitar'} />
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(c)} className="text-xs text-moss-700 hover:underline mr-3 font-medium">
                      Editar
                    </button>
                    <button onClick={() => deleteClient(c)} className="text-xs text-paprika-500 hover:underline">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-ink/40">
                    {clients.length === 0 ? 'Todavía no diste de alta ningún cliente mayorista.' : 'Sin clientes que coincidan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-moss-600' : 'bg-ink/20'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}
