import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, firstValueFrom, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';

interface AuthApiUser {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  phone?: string;
}

interface AuthApiResponse {
  success?: boolean;
  message?: string;
  accessToken?: string;
  token?: string;
  user?: AuthApiUser;
  data?:
    | AuthApiUser
    | {
        user?: AuthApiUser;
        token?: string;
        accessToken?: string;
      };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly accessTokenState = signal<string | null>(null);
  private readonly currentUserState = signal<AuthUser | null>(null);
  private readonly authInitializingState = signal(false);
  private sessionExpiryHandled = false;
  private restorePromise: Promise<boolean> | null = null;

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthInitializing = this.authInitializingState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.accessTokenState()));

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.restoreSession();
    }
  }

  async signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const response = await firstValueFrom(
        this.http
          .post<AuthApiResponse>(
            `${this.apiBaseUrl}/auth/login`,
            {
              email: email.trim().toLowerCase(),
              password,
            },
            { withCredentials: true },
          )
          .pipe(timeout(15000)),
      );

      this.applyAuthResponse(response, { requireUser: true });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getLoginErrorMessage(error) };
    }
  }

  async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const derivedName = this.deriveNameFromEmail(normalizedEmail);

    try {
      const response = await firstValueFrom(
        this.http
          .post<AuthApiResponse>(
            `${this.apiBaseUrl}/auth/signup`,
            {
              name: derivedName,
              email: normalizedEmail,
              password,
            },
            { withCredentials: true },
          )
          .pipe(timeout(15000)),
      );

      if (this.extractAccessToken(response)) {
        this.applyAuthResponse(response, { requireUser: true });
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getRegisterErrorMessage(error) };
    }
  }

  async signOut(options?: { navigate?: boolean; showToast?: boolean }): Promise<void> {
    try {
      await firstValueFrom(
        this.http
          .post(`${this.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
          .pipe(timeout(10000), catchError(() => of(null))),
      );
    } finally {
      this.clearAuthState();

      if (options?.showToast) {
        this.toastService.show('Signed out', 'Your session has been cleared.', 'info', 1400);
      }

      if (options?.navigate ?? true) {
        void this.router.navigate(['/auth/signin']);
      }
    }
  }

  refreshAccessToken(): Observable<string> {
    return this.http
      .post<AuthApiResponse>(`${this.apiBaseUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        timeout(15000),
        map((response) => {
          const accessToken = this.extractAccessToken(response);

          if (!accessToken) {
            throw new Error('Unexpected auth response shape.');
          }

          return { response, accessToken };
        }),
        tap(({ response, accessToken }) => {
          this.sessionExpiryHandled = false;
          this.setAccessToken(accessToken);

          const user = this.extractUser(response);

          if (user) {
            this.setCurrentUser(user);
          }
        }),
        map(({ accessToken }) => accessToken),
      );
  }

  restoreSession(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve(false);
    }

    if (this.restorePromise) {
      return this.restorePromise;
    }

    this.authInitializingState.set(true);
    this.restorePromise = firstValueFrom(
      this.refreshAccessToken().pipe(
        map(() => true),
        catchError(() => {
          this.clearAuthState();
          return of(false);
        }),
      ),
    ).finally(() => {
      this.authInitializingState.set(false);
      this.restorePromise = null;
    });

    return this.restorePromise;
  }

  getAccessToken(): string | null {
    return this.accessTokenState();
  }

  setAccessToken(token: string): void {
    this.accessTokenState.set(token);
  }

  clearAccessToken(): void {
    this.accessTokenState.set(null);
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserState();
  }

  setCurrentUser(user: AuthUser): void {
    this.currentUserState.set(user);
  }

  clearCurrentUser(): void {
    this.currentUserState.set(null);
  }

  clearAuthState(): void {
    this.sessionExpiryHandled = false;
    this.clearAccessToken();
    this.clearCurrentUser();
    this.authInitializingState.set(false);
  }

  handleExpiredSession(): void {
    if (this.sessionExpiryHandled) {
      return;
    }

    const currentPath = this.router.url;
    const returnUrl =
      currentPath && !currentPath.startsWith('/auth/signin') && !currentPath.startsWith('/auth/register')
        ? currentPath
        : '/';

    this.clearAuthState();
    this.sessionExpiryHandled = true;
    this.toastService.show('Session expired', 'Please sign in again to continue.', 'error', 2200);
    void this.router.navigate(['/auth/signin'], {
      queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : undefined,
    });
  }

  private applyAuthResponse(response: AuthApiResponse, options?: { requireUser?: boolean }): void {
    const accessToken = this.extractAccessToken(response);
    const user = this.extractUser(response);

    if (!accessToken || (options?.requireUser && !user)) {
      throw new Error('Unexpected auth response shape.');
    }

    this.sessionExpiryHandled = false;
    this.setAccessToken(accessToken);

    if (user) {
      this.setCurrentUser(user);
    }
  }

  private extractAccessToken(response: AuthApiResponse): string | null {
    const responseData = this.getResponseData(response);
    const accessToken = response.accessToken ?? responseData?.accessToken ?? response.token ?? responseData?.token;

    return typeof accessToken === 'string' && accessToken.trim() ? accessToken : null;
  }

  private extractUser(response: AuthApiResponse): AuthUser | null {
    const responseData = this.getResponseData(response);
    const user = response.user ?? responseData?.user ?? (this.isAuthApiUser(response.data) ? response.data : null);

    if (!user?.email) {
      return null;
    }

    return {
      id: user._id ?? user.id ?? user.email,
      name: user.name?.trim() || this.deriveNameFromEmail(user.email),
      email: user.email,
      phone: user.phone,
    };
  }

  private getResponseData(response: AuthApiResponse): { user?: AuthApiUser; token?: string; accessToken?: string } | null {
    return response.data && !this.isAuthApiUser(response.data) ? response.data : null;
  }

  private isAuthApiUser(value: unknown): value is AuthApiUser {
    return Boolean(value && typeof value === 'object' && typeof (value as AuthApiUser).email === 'string');
  }

  private deriveNameFromEmail(email: string): string {
    const raw = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Customer';
    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private getLoginErrorMessage(error: unknown): string {
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'The request took too long. Please try again.';
    }

    if ((error as { message?: string })?.message === 'Unexpected auth response shape.') {
      return 'The backend login response does not match what the app expects.';
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Could not connect to the server. Please check your connection.';
        case 401:
          return 'Invalid email or password.';
        case 403:
          return 'Please verify your account before signing in.';
        case 429:
          return 'Too many login attempts. Please try again later.';
      }
    }

    return 'Incorrect email or password.';
  }

  private getRegisterErrorMessage(error: unknown): string {
    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'The request took too long. Please try again.';
    }

    if ((error as { message?: string })?.message === 'Unexpected auth response shape.') {
      return 'The backend registration response does not match what the app expects.';
    }

    if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          return 'Could not connect to the server. Please check your connection.';
        case 400:
          return 'Please check your registration details.';
        case 409:
          return 'An account with this email already exists.';
        case 422:
          return 'Please fix the highlighted registration details.';
        case 429:
          return 'Too many registration attempts. Please try again later.';
      }
    }

    return 'We could not create your account right now.';
  }
}
