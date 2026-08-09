import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequest$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAuthRequest = isAuthenticationRequest(req);
  const accessToken = authService.getAccessToken();
  const request = !isAuthRequest && accessToken ? addAuthorizationHeader(req, accessToken) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (isAuthRequest || !(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return handleUnauthorizedRequest(request, next, authService);
    }),
  );
};

function handleUnauthorizedRequest(
  request: HttpRequest<unknown>,
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
) {
  if (!refreshRequest$) {
    refreshRequest$ = authService.refreshAccessToken().pipe(
      finalize(() => {
        refreshRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }

  return refreshRequest$.pipe(
    switchMap((accessToken) => next(addAuthorizationHeader(request, accessToken))),
    catchError((error: unknown) => {
      authService.handleExpiredSession();
      return throwError(() => error);
    }),
  );
}

function addAuthorizationHeader(request: HttpRequest<unknown>, accessToken: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isAuthenticationRequest(request: HttpRequest<unknown>): boolean {
  return ['/auth/login', '/auth/signup', '/auth/register', '/auth/refresh', '/auth/logout'].some((path) =>
    request.url.includes(path),
  );
}
