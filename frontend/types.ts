export interface UrlItem {
  id: string;
  url: string;
  host: string;
  name: string;
  category: string;
  _categoryOpen?: boolean;
}

export interface Category {
  name: string;
  persistedName: string;
  count: number;
  color: string;
  icon: string;
  _pickerOpen?: boolean;
  _expanded?: boolean;
}

export interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  data?: T;
}
