import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function CategoryManager({ categories, onChanged }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { error: err } = await supabase
      .from('categories')
      .insert({ name: newName.trim(), sort_order: categories.length });
    if (err) {
      setError(err.message);
      return;
    }
    setNewName('');
    setError('');
    onChanged();
  }

  async function renameCategory(cat, name) {
    if (!name.trim() || name === cat.name) return;
    await supabase.from('categories').update({ name: name.trim() }).eq('id', cat.id);
    onChanged();
  }

  async function deleteCategory(cat) {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"? Los productos quedarán sin categoría.`)) return;
    await supabase.from('categories').delete().eq('id', cat.id);
    onChanged();
  }

  return (
    <div className="bg-white/50 rounded-lg p-5">
      <h2 className="font-display text-lg font-semibold text-moss-700 mb-3">Categorías</h2>
      <ul className="space-y-2 mb-4">
        {categories.map((cat) => (
          <li key={cat.id} className="flex items-center gap-2">
            <input
              defaultValue={cat.name}
              onBlur={(e) => renameCategory(cat, e.target.value)}
              className="flex-1 rounded-md border border-ink/20 px-2 py-1.5 text-sm bg-white"
            />
            <button
              onClick={() => deleteCategory(cat)}
              className="text-xs text-paprika-500 hover:underline shrink-0"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addCategory} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-md border border-ink/20 px-2 py-1.5 text-sm bg-white"
        />
        <button
          type="submit"
          className="rounded-md bg-moss-700 text-paper text-sm px-3 py-1.5 hover:bg-moss-600"
        >
          Agregar
        </button>
      </form>
      {error && <p className="text-paprika-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
