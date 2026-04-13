import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';

interface AuthApiUser {
  _id?: string;
  id?: string;
  name?: string;
  email: string;
  phone?: string;
}

interface AuthApiResponse {
  success?: boolean;
  accessToken?: string;
  token?: string;
  refreshToken?: string;
  user?: AuthApiUser;
  data?:
    | AuthApiUser
    | {
        user?: AuthApiUser;
        token?: string;
        accessToken?: string;
        refreshToken?: string;
      };
}

interface SignupApiResponse {
  success?: boolean;
  message: string;
  token?: string;
  user?: AuthApiUser;
  data?: AuthApiUser | { user?: AuthApiUser; token?: string; accessToken?: string; refreshToken?: string };
}

interface StoredSession {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
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
  private readonly document = inject(DOCUMENT);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private readonly sessionKey = 'veloura-auth-session';
  private readonly session = signal<StoredSession | null>(null);

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly accessToken = computed(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.restoreSession();
    }
  }

  async signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthApiResponse>(`${this.apiBaseUrl}/auth/login`, {
          email: email.trim().toLowerCase(),
          password,
        }).pipe(timeout(15000)),
      );

      this.setSession(this.toStoredSession(response));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error, 'Incorrect email or password.') };
    }
  }

  async register(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const derivedName = this.deriveNameFromEmail(normalizedEmail);

    try {
      const response = await firstValueFrom(
        this.http.post<SignupApiResponse>(`${this.apiBaseUrl}/auth/signup`, {
          name: derivedName,
          email: normalizedEmail,
          password,
        }).pipe(timeout(15000)),
      );

      return { ok: true };
    } catch (error) {
      return { ok: false, error: this.getErrorMessage(error, 'We could not create your account right now.') };
    }
  }

  signOut(): void {
    this.session.set(null);

    if (isPlatformBrowser(this.platformId)) {
      this.document.defaultView?.localStorage.removeItem(this.sessionKey);
    }
  }

  private restoreSession(): void {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(this.sessionKey);

      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as StoredSession;

      if (!parsed?.accessToken || !parsed?.user?.email) {
        return;
      }

      this.session.set(parsed);
    } catch {
      this.document.defaultView?.localStorage.removeItem(this.sessionKey);
    }
  }

  private setSession(session: StoredSession): void {
    this.session.set(session);

    if (isPlatformBrowser(this.platformId)) {
      this.document.defaultView?.localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  private toStoredSession(response: AuthApiResponse): StoredSession {
    const responseData =
      response.data && 'email' in response.data ? { user: response.data } : response.data;
    const user = response.user ?? responseData?.user;
    const accessToken = response.accessToken ?? responseData?.accessToken ?? response.token ?? responseData?.token;

    if (!user?.email || !accessToken) {
      throw new Error('Unexpected auth response shape.');
    }

    return {
      accessToken,
      refreshToken: response.refreshToken ?? responseData?.refreshToken ?? null,
      user: {
        id: user._id ?? user.id ?? user.email,
        name: user.name?.trim() || this.deriveNameFromEmail(user.email),
        email: user.email,
        phone: user.phone,
      },
    };
  }

  private deriveNameFromEmail(email: string): string {
    const raw = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || 'Customer';
    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    const message = (error as { error?: { message?: string } })?.error?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if ((error as { name?: string })?.name === 'TimeoutError') {
      return 'The request took too long. Please try again.';
    }

    if ((error as { message?: string })?.message === 'Unexpected auth response shape.') {
      return 'The backend login response does not match what the app expects.';
    }

    return fallback;
  }
}
