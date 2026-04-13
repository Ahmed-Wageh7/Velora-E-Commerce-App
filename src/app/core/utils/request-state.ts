import { Observable, catchError, map, of, startWith } from 'rxjs';

export type RequestState<T> =
  | { status: 'loading'; data: T; message: string }
  | { status: 'success'; data: T; message: string }
  | { status: 'empty'; data: T; message: string }
  | { status: 'error'; data: T; message: string };

interface RequestStateOptions<T> {
  initialData: T;
  loadingMessage?: string;
  emptyMessage?: string;
  errorMessage?: string;
  isEmpty?: (value: T) => boolean;
}

export function toRequestState<T>(
  source$: Observable<T>,
  {
    initialData,
    loadingMessage = 'Loading data...',
    emptyMessage = 'No data available.',
    errorMessage = 'Something went wrong while loading data.',
    isEmpty = defaultIsEmpty,
  }: RequestStateOptions<T>,
): Observable<RequestState<T>> {
  return source$.pipe(
    map((data) =>
      isEmpty(data)
        ? { status: 'empty' as const, data, message: emptyMessage }
        : { status: 'success' as const, data, message: '' },
    ),
    startWith({ status: 'loading' as const, data: initialData, message: loadingMessage }),
    catchError(() => of({ status: 'error' as const, data: initialData, message: errorMessage })),
  );
}

function defaultIsEmpty<T>(value: T): boolean {
  return Array.isArray(value) ? value.length === 0 : value === null || value === undefined;
}
