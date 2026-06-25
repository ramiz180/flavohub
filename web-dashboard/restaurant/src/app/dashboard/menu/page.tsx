'use client';

import { useCallback, useEffect, useState } from 'react';
import ImageUploadWithCrop from '@/components/ImageUploadWithCrop';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import type { MenuCategoryWithItems, MenuItem } from '@/types/menu';

const EMPTY_ITEM = { name: '', description: '', price: '', imageUrl: '' };

type ItemFormState = typeof EMPTY_ITEM;

export default function MenuPage() {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [actionError, setActionError] = useState('');

  // Add category
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // Rename category
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameCatName, setRenameCatName] = useState('');

  // Add item (open for which category)
  const [addingItemCatId, setAddingItemCatId] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState<ItemFormState>(EMPTY_ITEM);

  // Edit item
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemForm, setEditItemForm] = useState<ItemFormState>(EMPTY_ITEM);

  const loadMenu = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setFetchError('');
    try {
      const data = await apiClient.menu.getFullMenu(accessToken);
      setCategories(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  function setError(e: unknown) {
    setActionError(e instanceof Error ? e.message : 'Action failed');
  }

  // â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !newCatName.trim()) return;
    setAddingCat(true);
    setActionError('');
    try {
      await apiClient.menu.createCategory(accessToken, { name: newCatName.trim() });
      setNewCatName('');
      await loadMenu();
    } catch (e) {
      setError(e);
    } finally {
      setAddingCat(false);
    }
  }

  function startRenameCategory(catId: string, current: string) {
    setRenamingCatId(catId);
    setRenameCatName(current);
    setActionError('');
  }

  async function handleRenameCategory(catId: string) {
    if (!accessToken || !renameCatName.trim()) return;
    setActionError('');
    try {
      await apiClient.menu.updateCategory(accessToken, catId, { name: renameCatName.trim() });
      setRenamingCatId(null);
      await loadMenu();
    } catch (e) {
      setError(e);
    }
  }

  async function handleDeleteCategory(catId: string, catName: string) {
    if (!window.confirm(`Delete category "${catName}" and all its items?`)) return;
    if (!accessToken) return;
    setActionError('');
    try {
      await apiClient.menu.deleteCategory(accessToken, catId);
      await loadMenu();
    } catch (e) {
      setError(e);
    }
  }

  // â”€â”€ Items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function openAddItem(catId: string) {
    setAddingItemCatId(catId);
    setNewItemForm(EMPTY_ITEM);
    setActionError('');
  }

  async function handleAddItem(e: React.FormEvent, catId: string) {
    e.preventDefault();
    if (!accessToken) return;
    setActionError('');
    try {
      await apiClient.menu.createItem(accessToken, {
        categoryId: catId,
        name: newItemForm.name?.trim() || '',
        ...(newItemForm.description?.trim() && { description: newItemForm.description.trim() }),
        price: newItemForm.price?.trim() || '',
        ...(newItemForm.imageUrl?.trim() && { imageUrl: newItemForm.imageUrl.trim() }),
      });
      setAddingItemCatId(null);
      setNewItemForm(EMPTY_ITEM);
      await loadMenu();
    } catch (e) {
      setError(e);
    }
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setEditItemForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      imageUrl: item.imageUrl ?? '',
    });
    setActionError('');
  }

  async function handleEditItem(e: React.FormEvent, itemId: string) {
    e.preventDefault();
    if (!accessToken) return;
    setActionError('');
    try {
      await apiClient.menu.updateItem(accessToken, itemId, {
        name: editItemForm.name?.trim() || '',
        description: editItemForm.description?.trim() || undefined,
        price: editItemForm.price?.trim() || '',
        imageUrl: editItemForm.imageUrl?.trim() || undefined,
      });
      setEditingItemId(null);
      await loadMenu();
    } catch (e) {
      setError(e);
    }
  }

  async function handleDeleteItem(itemId: string, itemName: string) {
    if (!window.confirm(`Delete item "${itemName}"?`)) return;
    if (!accessToken) return;
    setActionError('');
    try {
      await apiClient.menu.deleteItem(accessToken, itemId);
      await loadMenu();
    } catch (e) {
      setError(e);
    }
  }

  async function handleToggleAvailability(item: MenuItem) {
    if (!accessToken) return;
    setActionError('');
    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((i) => (i.id === item.id ? { ...i, isAvailable: !i.isAvailable } : i)),
      })),
    );
    try {
      await apiClient.menu.updateAvailability(accessToken, item.id, !item.isAvailable);
    } catch (e) {
      setError(e);
      // Revert on failure
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          items: cat.items.map((i) =>
            i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i,
          ),
        })),
      );
    }
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Menu</h2>

      {/* Add category */}
      <form onSubmit={(e) => void handleAddCategory(e)} className="flex flex-col sm:flex-row gap-3">
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="New category name"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={addingCat || !newCatName.trim()}
          className="w-full sm:w-auto shrink-0 rounded-xl bg-emerald-600 px-5 py-3 sm:py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          {addingCat ? 'Adding…' : '+ Add Category'}
        </button>
      </form>

      {actionError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </div>
      )}

      {fetchError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">No categories yet. Add one above.</p>
        </div>
      )}

      {/* Category sections */}
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          {/* Category header */}
          {renamingCatId === cat.id ? (
            <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                value={renameCatName}
                onChange={(e) => setRenameCatName(e.target.value)}
                autoFocus
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void handleRenameCategory(cat.id)}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingCatId(null)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => startRenameCategory(cat.id, cat.name)}
                  className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Rename
                </button>
                <button
                  onClick={() => void handleDeleteCategory(cat.id, cat.name)}
                  className="flex-1 sm:flex-none rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          {/* Items */}
          {cat.items.length === 0 && <p className="mb-3 text-sm text-slate-400">No items yet.</p>}
          <div className="space-y-2">
            {cat.items.map((item) =>
              editingItemId === item.id ? (
                <form
                  key={item.id}
                  onSubmit={(e) => void handleEditItem(e, item.id)}
                  className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      value={editItemForm.name}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Name"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    />
                    <input
                      value={editItemForm.price}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="Price (e.g. 9.99)"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    />
                    <input
                      value={editItemForm.description}
                      onChange={(e) => setEditItemForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Description (optional)"
                      className="w-full sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                    />
                    <div className="sm:col-span-2 w-max">
                      <ImageUploadWithCrop
                        initialUrl={editItemForm.imageUrl}
                        onUploadComplete={(url) => setEditItemForm((f) => ({ ...f, imageUrl: url }))}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <button
                      type="submit"
                      className="w-full sm:w-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingItemId(null)}
                      className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={item.id}
                  className="flex flex-col md:flex-row md:items-center justify-between rounded-2xl border border-slate-100 p-4 transition-colors hover:bg-slate-50 gap-4"
                >
                  <div className="flex min-w-0 flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-800">{item.name}</span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-bold text-emerald-700">&#8377;{item.price}</span>
                    </div>
                    {item.description && (
                      <p className="truncate text-sm text-slate-500">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 shrink-0">
                    <button
                      onClick={() => void handleToggleAvailability(item)}
                      className={`flex-1 md:flex-none rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                        item.isAvailable
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                    <button
                      onClick={() => startEditItem(item)}
                      className="flex-1 md:flex-none rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDeleteItem(item.id, item.name)}
                      className="flex-1 md:flex-none rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* Add item */}
          {addingItemCatId === cat.id ? (
            <form
              onSubmit={(e) => void handleAddItem(e, cat.id)}
              className="mt-3 space-y-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                />
                <input
                  value={newItemForm.price}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="Price (e.g. 9.99)"
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                />
                <input
                  value={newItemForm.description}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                />
                <div className="sm:col-span-2 w-max">
                  <ImageUploadWithCrop
                    onUploadComplete={(url) => setNewItemForm((f) => ({ ...f, imageUrl: url }))}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingItemCatId(null);
                    setNewItemForm(EMPTY_ITEM);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => openAddItem(cat.id)}
              className="mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              + Add item
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
