import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const empty = { code: '', name: '', description: '', price: '', category_id: '', active: true, image_url: '' };

export default function ProductForm({ categories, product, onClose, onSaved }) {
  const [form, setForm] = useState(
    product
      ? {
          code: product.code || '',
          name: product.name || '',
          description: product.description || '',
          price: product.price ?? '',
          category_id: product.category_id || '',
          active: product.active,
          image_url: product.image_url || '',
        }
      : { ...empty, category_id: categories[0]?.id || '' }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(product?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview('');
    update('image_url', '');
  }

  async function uploadImage(productId) {
    if (!imageFile) return form.image_url;
    setUploadingImage(true);
    const ext = imageFile.name.split('.').pop();
    const path = `products/${productId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(path, imageFile, { upsert: true });
    setUploadingImage(false);
    if (uploadError) {
      console.error('Error subiendo imagen:', uploadError.message);
      return form.image_url;
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || form.price === '' || !form.category_id) {
      setError('Completá al menos nombre, precio y categoría.');
      return;
    }
    setSaving(true);
    setError('');

    // For new products we need to insert first to get an ID, then upload
    const payload = {
      code: form.code.trim() || null,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category_id: form.category_id,
      active: form.active,
    };

    if (product) {
      // Editing: upload image first using existing ID
      const imageUrl = await uploadImage(product.id);
      const { error: saveError } = await supabase
        .from('products')
        .update({ ...payload, image_url: imageUrl })
        .eq('id', product.id);
      setSaving(false);
      if (saveError) { setError(saveError.message); return; }
    } else {
      // New: insert then upload
      const { data: inserted, error: insertError } = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single();
      if (insertError) { setSaving(false); setError(insertError.message); return; }
      const imageUrl = await uploadImage(inserted.id);
      if (imageUrl) {
        await supabase.from('products').update({ image_url: imageUrl }).eq('id', inserted.id);
      }
      setSaving(false);
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Cerrar" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-paper rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-semibold text-moss-700">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink transition-colors">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Image upload */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-ink/70 mb-2">Foto del producto</label>
          {imagePreview ? (
            <div className="relative w-full h-48 rounded-lg overflow-hidden border border-ink/10 bg-white mb-3">
              <img src={imagePreview} alt="preview" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paprika-500 text-white flex items-center justify-center hover:bg-paprika-600 shadow"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed border-ink/20 bg-white hover:border-moss-500 hover:bg-moss-50 cursor-pointer transition-colors mb-3">
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-ink/30 mb-2">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span className="text-xs text-ink/40">Clic para subir imagen</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}

          <label className="block text-xs font-medium text-ink/70 mb-1">O pegar URL de la imagen</label>
          <input
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={!imageFile ? form.image_url : ''}
            onChange={(e) => {
              update('image_url', e.target.value);
              setImagePreview(e.target.value);
            }}
            disabled={!!imageFile}
            className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500 disabled:opacity-50 disabled:bg-ink/5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Código (opcional)</label>
            <input
              value={form.code}
              onChange={(e) => update('code', e.target.value)}
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/70 mb-1">Precio (ARS)</label>
            <input
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-ink/70 mb-1">Nombre *</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-ink/70 mb-1">Descripción (opcional)</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500 resize-none"
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-medium text-ink/70 mb-1">Categoría *</label>
          <select
            value={form.category_id}
            onChange={(e) => update('category_id', e.target.value)}
            className="w-full rounded-md border border-ink/20 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-moss-500"
          >
            <option value="">Seleccionar categoría...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm cursor-pointer select-none">
          <div
            onClick={() => update('active', !form.active)}
            className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-moss-600' : 'bg-ink/20'}`}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-4' : ''}`} />
          </div>
          <span className={form.active ? 'text-moss-700 font-medium' : 'text-ink/50'}>
            {form.active ? 'Visible en la tienda' : 'Oculto'}
          </span>
        </label>

        {error && <p className="text-paprika-500 text-sm mt-3 bg-paprika-50 px-3 py-2 rounded-md">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="flex-1 rounded-full bg-moss-700 text-paper font-medium py-2.5 hover:bg-moss-600 disabled:opacity-50 transition-colors"
          >
            {saving || uploadingImage ? 'Guardando...' : 'Guardar producto'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-ink/20 px-5 py-2.5 text-sm hover:border-moss-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
