import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

const emptyPromo = {
  name: '',
  description: '',
  discount_pct: '',
  active: true,
  starts_at: '',
  ends_at: '',
};

function promoStatus(promo) {
  const now = new Date();
  if (!promo.active) return 'inactive';
  if (promo.ends_at && new Date(promo.ends_at) < now) return 'expired';
  if (promo.starts_at && new Date(promo.starts_at) > now) return 'upcoming';
  return 'active';
}

const statusLabel = {
  active: { text: 'Activa', cls: 'bg-moss-100 text-moss-700' },
  inactive: { text: 'Inactiva', cls: 'bg-ink/10 text-ink/60' },
  expired: { text: 'Vencida', cls: 'bg-paprika-100 text-paprika-600' },
  upcoming: { text: 'Próxima', cls: 'bg-turmeric-100 text-turmeric-700' },
};

function PromoForm({ promo, onClose, onSaved }) {
  const [form, setForm] = useState(
    promo
      ? {
          name: promo.name,
          description: promo.description || '',
          discount_pct: promo.discount_pct ?? '',
          active: promo.active,
          starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : '',
          ends_at: promo.ends_at ? promo.ends_at.slice(0, 16) : '',
        }
      : { ...emptyPromo }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || form.discount_pct === '') {
      setError('Completá nombre y % de descuento.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      discount_pct: Number(form.discount_pct),
      active: form.active,
      starts_at: form.starts_at || null,
      ends_at: form.ends_at || null,
    };
    const q = promo
      ? supabase.from('promotions').update(payload).eq('id', promo.id)
      : supabase.from('promotions').insert(payload);
    const { error: err } = await q;
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-paper rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-moss-700">
            {promo ? 'Editar promoción' : 'Nueva promoción'}
          </h2>
          <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Nombre de la promoción *</label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)}
              placeholder="Ej: Descuento de verano"
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Descripción (visible en tienda)</label>
            <textarea value={form.description} onChange={(e) => update('description', e.target.value)}
              rows={2}
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Descuento % *</label>
            <input type="number" min="0" max="100" step="0.5"
              value={form.discount_pct} onChange={(e) => update('discount_pct', e.target.value)}
              placeholder="Ej: 15"
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Inicia</label>
              <input type="datetime-local" value={form.starts_at} onChange={(e) => update('starts_at', e.target.value)}
                className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/70 mb-1">Vence</label>
              <input type="datetime-local" value={form.ends_at} onChange={(e) => update('ends_at', e.target.value)}
                className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none pt-1">
            <div onClick={() => update('active', !form.active)}
              className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-moss-600' : 'bg-ink/20'}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-4' : ''}`} />
            </div>
            <span className={form.active ? 'text-moss-700 font-medium' : 'text-ink/50'}>
              {form.active ? 'Activa' : 'Inactiva'}
            </span>
          </label>
        </div>

        {error && <p className="text-paprika-500 text-sm mt-3 bg-paprika-50 px-3 py-2 rounded-md">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" disabled={saving}
            className="flex-1 rounded-full bg-moss-700 text-paper font-medium py-2.5 hover:bg-moss-600 disabled:opacity-50 transition-colors">
            {saving ? 'Guardando...' : 'Guardar promoción'}
          </button>
          <button type="button" onClick={onClose}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:border-moss-600 transition-colors">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPromo, setEditingPromo] = useState(undefined); // undefined=closed, null=new

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    setPromotions(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(promo) {
    await supabase.from('promotions').update({ active: !promo.active }).eq('id', promo.id);
    load();
  }

  async function deletePromo(promo) {
    if (!confirm(`¿Eliminar la promoción "${promo.name}"?`)) return;
    await supabase.from('promotions').delete().eq('id', promo.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Promociones</h2>
          <p className="text-sm text-ink/50 mt-0.5">Creá descuentos y ofertas especiales para tu tienda</p>
        </div>
        <button
          onClick={() => setEditingPromo(null)}
          className="flex items-center gap-2 rounded-full bg-turmeric-400 text-moss-900 font-semibold px-4 py-2 text-sm hover:bg-turmeric-500 transition-colors shadow-sm"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva promoción
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-ink/40">Cargando...</div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-xl border-2 border-dashed border-ink/10">
          <div className="text-4xl mb-3">🏷️</div>
          <p className="font-display text-xl text-ink/60">Sin promociones todavía</p>
          <p className="text-sm text-ink/40 mt-1">Creá tu primera promoción para mostrarla en la tienda</p>
          <button onClick={() => setEditingPromo(null)}
            className="mt-4 rounded-full bg-moss-700 text-paper px-5 py-2 text-sm font-medium hover:bg-moss-600 transition-colors">
            Crear promoción
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {promotions.map((promo) => {
            const status = promoStatus(promo);
            const badge = statusLabel[status];
            return (
              <div key={promo.id} className="bg-white/70 rounded-xl border border-ink/10 p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-display text-lg font-semibold text-ink">{promo.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
                    </div>
                    {promo.description && <p className="text-sm text-ink/60 mb-2">{promo.description}</p>}
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-2xl font-bold text-turmeric-600">{promo.discount_pct}%</span>
                      <span className="text-ink/50">de descuento</span>
                    </div>
                    {(promo.starts_at || promo.ends_at) && (
                      <p className="text-xs text-ink/40 mt-2 font-mono">
                        {promo.starts_at && `Desde: ${new Date(promo.starts_at).toLocaleDateString('es-AR')}`}
                        {promo.starts_at && promo.ends_at && ' · '}
                        {promo.ends_at && `Hasta: ${new Date(promo.ends_at).toLocaleDateString('es-AR')}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-ink/8">
                  <button onClick={() => setEditingPromo(promo)}
                    className="text-xs text-moss-700 hover:underline font-medium">Editar</button>
                  <span className="text-ink/20">·</span>
                  <button onClick={() => toggleActive(promo)}
                    className="text-xs text-ink/50 hover:text-ink hover:underline">
                    {promo.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <span className="text-ink/20">·</span>
                  <button onClick={() => deletePromo(promo)}
                    className="text-xs text-paprika-500 hover:underline">Eliminar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPromo !== undefined && (
        <PromoForm
          promo={editingPromo}
          onClose={() => setEditingPromo(undefined)}
          onSaved={() => { setEditingPromo(undefined); load(); }}
        />
      )}
    </div>
  );
}
