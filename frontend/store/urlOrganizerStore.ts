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
  uncategorizedExpanded: boolean;
  urlsByCategory(name: string): UrlItem[];
  uncategorizedItems(): UrlItem[];
  showCategoryGroup(name: string): boolean;
  showUncategorizedGroup(): boolean;
  toggleCategoryExpanded(category: Category): void;
  createCategory(): Promise<void>;
  autoSaveCategory(category: Category): Promise<void>;
  saveCategory(category: Category): Promise<void>;
  saveUrlName(item: UrlItem): Promise<void>;
  updateUrlCategory(item: UrlItem): Promise<void>;
  setUrlCategory(item: UrlItem, categoryName: string): Promise<void>;
  deleteUrl(item: UrlItem): Promise<void>;
  importFromFile(content: string): Promise<void>;
  importFromSelectedFile(ev: Event): Promise<void>;
  confirmVisible: boolean;
  confirmTitle: string;
  confirmMessage: string;
  confirmResolve: (value: boolean) => void;
  showConfirm(title: string, message: string): Promise<boolean>;
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
    uncategorizedExpanded: true,
    confirmVisible: false,
    confirmTitle: '',
    confirmMessage: '',
    confirmResolve: () => {},
    toastMessage: '',
    toastType: 'info',
    toastVisible: false,

    async init(this: UrlOrganizerStore) {
      try {
        await this.refreshAll();
      } catch (error) {
        this.showToast(`Loading error: ${(error as Error).message}`, 'error');
      }
    },

    async refreshAll(this: UrlOrganizerStore) {
      await Promise.all([this.loadItems(), this.loadCategories()]);
    },

    async loadItems(this: UrlOrganizerStore) {
      const prevState = new Map(this.items.map((item) => [item.id, !!item._categoryOpen]));
      const data = await apiRequest<UrlsResponse>('/api/urls');
      this.items = (data.items || []).map((item) => ({
        ...item,
        _categoryOpen: prevState.get(item.id) || false,
      }));
    },

    async loadCategories(this: UrlOrganizerStore) {
      const prevState = new Map(
        this.categories.map((category) => [
          category.persistedName || category.name,
          {
            _pickerOpen: !!category._pickerOpen,
            _expanded: !!category._expanded,
          },
        ]),
      );
      const data = await apiRequest<CategoriesResponse>('/api/categories');
      const rows = data.categories || [];
      this.categories = rows.map((row) => ({
        ...row,
        persistedName: row.persistedName || row.name,
        _pickerOpen: prevState.get(row.persistedName || row.name)?._pickerOpen ?? false,
        _expanded: prevState.get(row.persistedName || row.name)?._expanded ?? true,
      }));
    },

    filteredItems(this: UrlOrganizerStore) {
      const q = this.search.trim().toLowerCase();
      return this.items.filter((item) => {
        if (this.categoryFilter && item.category !== this.categoryFilter) return false;
        if (!q) return true;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q) ||
          (item.category || '').toLowerCase().includes(q)
        );
      });
    },

    visibleCount(this: UrlOrganizerStore) {
      return this.filteredItems().length;
    },

    categoryOptions(this: UrlOrganizerStore) {
      return this.categories;
    },

    categoryMeta(this: UrlOrganizerStore, name) {
      if (!name) return null;
      return this.categories.find((category) => category.name === name) || null;
    },

    urlsByCategory(this: UrlOrganizerStore, name) {
      if (!name) return [];
      const q = this.search.trim().toLowerCase();
      return this.items.filter((item) => {
        if (item.category !== name) return false;
        if (!q) return true;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q)
        );
      });
    },

    uncategorizedItems(this: UrlOrganizerStore) {
      const q = this.search.trim().toLowerCase();
      return this.items.filter((item) => {
        if (item.category) return false;
        if (!q) return true;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q)
        );
      });
    },

    showCategoryGroup(this: UrlOrganizerStore, name) {
      if (this.categoryFilter && this.categoryFilter !== name) return false;
      const q = this.search.trim().toLowerCase();
      if (!q) return true;
      return this.items.some((item) => {
        if (item.category !== name) return false;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q)
        );
      });
    },

    showUncategorizedGroup(this: UrlOrganizerStore) {
      if (this.categoryFilter) return false;
      const q = this.search.trim().toLowerCase();
      if (!q) return this.items.some((item) => !item.category);
      return this.items.some((item) => {
        if (item.category) return false;
        return (
          item.url.toLowerCase().includes(q) ||
          item.host.toLowerCase().includes(q) ||
          (item.name || '').toLowerCase().includes(q)
        );
      });
    },

    toggleCategoryExpanded(this: UrlOrganizerStore, category) {
      category._expanded = !category._expanded;
    },

    async createCategory(this: UrlOrganizerStore) {
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

    async saveCategory(this: UrlOrganizerStore, category) {
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

    async autoSaveCategory(this: UrlOrganizerStore, category) {
      const oldName = category.persistedName || category.name;
      const nextName = category.name.trim();
      if (!nextName) {
        return;
      }

      try {
        await apiRequest(`/api/categories/${encodeURIComponent(oldName)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: nextName,
            icon: category.icon || 'folder',
            color: category.color,
          }),
        });

        await this.refreshAll();
      } catch (error) {
        this.showToast(`Category update error: ${(error as Error).message}`, 'error');
      }
    },

    async saveUrlName(this: UrlOrganizerStore, item) {
      const name = item.name?.trim() || '';
      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      item.name = name;
    },

    async updateUrlCategory(this: UrlOrganizerStore, item) {
      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ category: item.category || '' }),
      });
      await this.loadCategories();
    },

    async setUrlCategory(this: UrlOrganizerStore, item, categoryName) {
      item.category = categoryName;
      item._categoryOpen = false;
      await this.updateUrlCategory(item);
    },

    async deleteUrl(this: UrlOrganizerStore, item) {
      const ok = await this.showConfirm('Delete this link?', item.name ? `"${item.name}" will be permanently removed.` : 'This link will be permanently removed.');
      if (!ok) return;

      await apiRequest(`/api/urls/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted: true }),
      });

      this.items = this.items.filter((row) => row.id !== item.id);
      await this.loadCategories();
      this.showToast('URL deleted', 'success');
    },

    

    async importFromFile(this: UrlOrganizerStore, content: string) {
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

    async importFromSelectedFile(this: UrlOrganizerStore, ev: Event) {
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

    showConfirm(this: UrlOrganizerStore, title, message) {
      this.confirmTitle = title;
      this.confirmMessage = message;
      this.confirmVisible = true;
      return new Promise<boolean>((resolve) => {
        this.confirmResolve = (value: boolean) => {
          this.confirmVisible = false;
          resolve(value);
        };
      });
    },

    showToast(this: UrlOrganizerStore, message, type = 'info') {
      this.toastMessage = message;
      this.toastType = type;
      this.toastVisible = true;

      window.setTimeout(() => {
        this.toastVisible = false;
      }, 2600);
    },
  };
}
