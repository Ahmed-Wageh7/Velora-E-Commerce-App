export type RequestState<T> =
  | { status: 'loading'; data: T; message: string }
  | { status: 'success'; data: T; message: string }
  | { status: 'empty'; data: T; message: string }
  | { status: 'error'; data: T; message: string };

export interface RequestStateOptions<T> {
  initialData: T;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  isEmpty?: (value: T) => boolean;
}
