import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpEvent,
  HttpRequest,
} from "@angular/common/http";
import { inject } from "@angular/core";
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  finalize,
  switchMap,
  take,
  throwError,
} from "rxjs";
import { AuthService } from "../services/auth.service";

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const refreshTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  if (isRefreshRequest(req)) {
    return next(req);
  }

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return handleUnauthorizedRequest(req, next, authService);
    }),
  );
};

function handleUnauthorizedRequest(
  req: HttpRequest<unknown>,
  next: Parameters<HttpInterceptorFn>[1],
  authService: AuthService,
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshAccessToken().pipe(
      switchMap((accessToken) => {
        refreshTokenSubject.next(accessToken);

        return next(addAuthorizationHeader(req, accessToken));
      }),
      catchError((error: unknown) => {
        authService.handleExpiredSession();
        return throwError(() => error);
      }),
      finalize(() => {
        isRefreshing = false;
      }),
    );
  }

  return refreshTokenSubject.pipe(
    filter((accessToken): accessToken is string => accessToken !== null),
    take(1),
    switchMap((accessToken) => next(addAuthorizationHeader(req, accessToken))),
  );
}

function addAuthorizationHeader(
  req: HttpRequest<unknown>,
  accessToken: string,
): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

function isRefreshRequest(req: HttpRequest<unknown>): boolean {
  return [
    "/auth/login",
    "/auth/signup",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some((path) => req.url.includes(path));
}
