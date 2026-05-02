import { apiRequest } from '../api.js';
import type { Category, UrlItem } from '../types.js';

type ToastType = 'info' | 'success' | 'error';

interface UrlOrganizerStore {
  search: string;
  categoryFilter: string;
  items: UrlItem[];
  categories: Category[];
  newCategoryName: string;
  newCategoryIcon: string;
  newCategoryPickerOpen: boolean;
  newCategoryColor: string;
  isImporting: boolean;
  toastMessage: string;
  toastType: ToastType;
  toastVisible: boolean;

  init(): Promise<void>;
  refreshAll(): Promise<void>;
  loadItems(): Promise<void>;
  loadCategories(): Promise<void>;
  filteredItems(): UrlItem[];
  visibleCount(): number;
  categoryOptions(): Category[];
  categoryMeta(name: string): Category | null;
  createCategory(): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  saveUrlName(item: UrlItem): Promise<void>;
  updateUrlCategory(item: UrlItem): Promise<void>;
  deleteUrl(item: UrlItem): Promise<void>;
  importFromFile(content: string): Promise<void>;
  importFromSelectedFile(ev: Event): Promise<void>;
  showToast(message: string, type?: ToastType): void;
}

interface UrlsResponse {
  items: UrlItem[];
}

interface CategoriesResponse {
  categories: Category[];
}

interface IngestResponse {
  inserted: number;
  skipped: number;
}

// IMPORTANT: All methods use `this` rather than a closure-captured reference.
// Alpine.data wraps the returned object in a reactive Proxy and binds `this`
// to that proxy when invoking methods. Mutating a closure-captured object
// would bypass the proxy and silently break reactivity (data loads but UI
// never updates).
export function createUrlOrganizerStore(): UrlOrganizerStore {
  return {
    search: '',
    categoryFilter: '',
    items: [],
    categories: [],
    newCategoryName: '',
    newCategoryIcon: 'folder',
    newCategoryPickerOpen: false,
    newCategoryColor: '#3b82f6',
    isImporting: false,
    toastMessage: '',
    toastType: 'info',
    toastVisible: false,

    async init() {
      try {
        await this.refreshAll();
      } catch (error) {
        this.showToast(`Loading error: ${(error as Error).message}`, 'error');
      }
    },

    async refreshAll() {
      await Promise.all([this.loadItems(), this.loadCategories()]);
    },

    async loadItems() {
      const data = await apiRequest<UrlsResponse>('/api/urls');
      this.items = data.items || [];
    },

    async loadCategories() {
      const data = await apiRequest<CategoriesResponse>('/api/categories');
      const rows = data.categories || [];
      this.categories = rows.map((row) => ({
        ...row,
        persistedName: row.persistedName || row.name,
        _pickerOpen: false,
      }));
    },

    filteredItems() {
      const q = this.search.trim().toLowerCase();
      const categoryFilter = this.categoryFilter;
      return this.items.filter((item) => {
        if (categoryFilter && item.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q)
        );
      });
    },

    visibleCount() {
      return this.filteredItems().length;
    },

    categoryOptions() {
      return this.categories;
    },

    categoryMeta(name) {
      if (!name) return null;
      return this.categories.find((category) => category.name === name) || null;
    },

    async createCategory() {
      const name = this.newCategoryName.trim();
      if (!name) {
        this.showToast('Category name is required.', 'error');
        return;
      }

      await apiRequest('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          icon: this.newCategoryIcon || 'folder',
          color: this.newCategoryColor || '#3b82f6',
        }),
      });

      this.newCategoryName = '';
      await this.loadCategories();
      this.showToast('Category created', 'success');
    },

    async saveCategory(category) {
      const oldName = category.persistedName || category.name;
      const nextName = category.name.trim();
      if (!nextName) {
        this.showToast('Category name is required.', 'error');
        return;
      }

      await apiRequest(`/api/categories/${encodeURIComponent(oldName)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: nextName,
          icon: category.icon || 'folder',
          color: category.color,
        }),
      });

      await this.refreshAll();
      this.showToast('Category updated', 'success');
    },

    async saveUrlName(item) {
      const name = item.name?.trim() || '';
      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      item.name = name;
    },

    async updateUrlCategory(item) {
      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category: item.category || '' }),
      });
      await this.loadCategories();
    },

    async deleteUrl(item) {
      const ok = window.confirm('Delete this URL?');
      if (!ok) return;

      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted: true }),
      });

      this.items = this.items.filter((row) => row.id !== item.id);
      await this.loadCategories();
      this.showToast('URL deleted', 'success');
    },

    async importFromFile(content: string) {
      if (this.isImporting) return;
      this.isImporting = true;
      try {
        const result = await apiRequest<IngestResponse>('/api/ingest/upload', {
          method: 'POST',
          body: JSON.stringify({ content }),
        });
        this.showToast(`Import done: ${result.inserted} added, ${result.skipped} existing.`, 'success');
        await this.refreshAll();
      } catch (error) {
        this.showToast(`Import error: ${(error as Error).message}`, 'error');
      } finally {
        this.isImporting = false;
      }
    },

    async importFromSelectedFile(ev: Event) {
      const input = ev.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        await this.importFromFile(text);
      } catch (error) {
        this.showToast(`File read error: ${(error as Error).message}`, 'error');
      } finally {
        // clear the input so same file can be reselected
        input.value = '';
      }
    },

    showToast(message, type = 'info') {
      this.toastMessage = message;
      this.toastType = type;
      this.toastVisible = true;

      window.setTimeout(() => {
        this.toastVisible = false;
      }, 2600);
    },
  };
}
