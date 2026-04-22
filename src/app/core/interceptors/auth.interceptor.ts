import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/signup');
  const accessToken = authService.accessToken();

  const request =
    !isAuthRequest && accessToken
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!isAuthRequest && error instanceof HttpErrorResponse && error.status === 401) {
        authService.handleExpiredSession();
      }

      return throwError(() => error);
    }),
  );
};
