export interface UrlItem {
  id: string;
  url: string;
  host: string;
  name: string;
  category: string;
}

export interface Category {
  name: string;
  persistedName: string;
  count: number;
  color: string;
  icon: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  error?: string;
  data?: T;
}
