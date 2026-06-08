'use client';

import { useCallback, useEffect, useState } from 'react';
import AuthGuard from '@/components/auth-guard';
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

  // ── Categories ──────────────────────────────────────────────────────────────

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

  // ── Items ────────────────────────────────────────────────────────────────────

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
        name: newItemForm.name.trim(),
        ...(newItemForm.description.trim() && { description: newItemForm.description.trim() }),
        price: newItemForm.price.trim(),
        ...(newItemForm.imageUrl.trim() && { imageUrl: newItemForm.imageUrl.trim() }),
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
        name: editItemForm.name.trim(),
        description: editItemForm.description.trim() || undefined,
        price: editItemForm.price.trim(),
        imageUrl: editItemForm.imageUrl.trim() || undefined,
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

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AuthGuard>
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Menu</h1>

        {/* Add category */}
        <form onSubmit={(e) => void handleAddCategory(e)} className="flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="New category name"
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={addingCat || !newCatName.trim()}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {addingCat ? 'Adding…' : '+ Add Category'}
          </button>
        </form>

        {actionError && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {loading && <p className="text-sm text-gray-500">Loading menu…</p>}

        {fetchError && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {!loading && !fetchError && categories.length === 0 && (
          <p className="text-sm text-gray-500">No categories yet. Add one above.</p>
        )}

        {/* Category sections */}
        {categories.map((cat) => (
          <div key={cat.id} className="rounded bg-white p-5 shadow">
            {/* Category header */}
            {renamingCatId === cat.id ? (
              <div className="mb-4 flex items-center gap-2">
                <input
                  value={renameCatName}
                  onChange={(e) => setRenameCatName(e.target.value)}
                  autoFocus
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => void handleRenameCategory(cat.id)}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingCatId(null)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{cat.name}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => startRenameCategory(cat.id, cat.name)}
                    className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => void handleDeleteCategory(cat.id, cat.name)}
                    className="rounded border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            {cat.items.length === 0 && <p className="mb-3 text-sm text-gray-400">No items yet.</p>}
            <div className="space-y-2">
              {cat.items.map((item) =>
                editingItemId === item.id ? (
                  <form
                    key={item.id}
                    onSubmit={(e) => void handleEditItem(e, item.id)}
                    className="space-y-2 rounded border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editItemForm.name}
                        onChange={(e) => setEditItemForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Name"
                        required
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        value={editItemForm.price}
                        onChange={(e) => setEditItemForm((f) => ({ ...f, price: e.target.value }))}
                        placeholder="Price (e.g. 9.99)"
                        required
                        className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <input
                        value={editItemForm.description}
                        onChange={(e) =>
                          setEditItemForm((f) => ({ ...f, description: e.target.value }))
                        }
                        placeholder="Description (optional)"
                        className="col-span-2 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="col-span-2">
                        <ImageUploadWithCrop
                          initialUrl={editItemForm.imageUrl}
                          onUploadComplete={(url) =>
                            setEditItemForm((f) => ({ ...f, imageUrl: url }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItemId(null)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="text-sm text-gray-500">₹{item.price}</span>
                      {item.description && (
                        <span className="hidden truncate text-xs text-gray-400 sm:block">
                          {item.description}
                        </span>
                      )}
                      <button
                        onClick={() => void handleToggleAvailability(item)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                    </div>
                    <div className="ml-3 flex shrink-0 gap-2">
                      <button
                        onClick={() => startEditItem(item)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDeleteItem(item.id, item.name)}
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
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
                className="mt-3 space-y-2 rounded border border-dashed border-emerald-300 bg-emerald-50 p-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Name"
                    required
                    autoFocus
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    value={newItemForm.price}
                    onChange={(e) => setNewItemForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="Price (e.g. 9.99)"
                    required
                    className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="col-span-2 rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="col-span-2">
                    <ImageUploadWithCrop
                      onUploadComplete={(url) => setNewItemForm((f) => ({ ...f, imageUrl: url }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  >
                    Add Item
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingItemCatId(null);
                      setNewItemForm(EMPTY_ITEM);
                    }}
                    className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => openAddItem(cat.id)}
                className="mt-3 text-sm text-emerald-600 hover:text-emerald-700"
              >
                + Add item
              </button>
            )}
          </div>
        ))}
      </div>
    </AuthGuard>
  );
}
