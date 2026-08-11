export interface ApiResponseEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface ApiPagination {
  page?: number;
  limit?: number;
  total?: number;
  pages?: number;
}
