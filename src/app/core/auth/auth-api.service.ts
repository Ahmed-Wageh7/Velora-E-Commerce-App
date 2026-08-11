import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, timeout } from "rxjs";
import { environment } from "../../../environments/environment";
import { AuthApiResponse, AuthApiUser } from "../../models/auth/auth.model";

@Injectable({
  providedIn: "root",
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/$/, "");

  login(email: string, password: string): Observable<AuthApiResponse> {
    return this.http
      .post<AuthApiResponse>(
        `${this.apiBaseUrl}/auth/login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        { withCredentials: true },
      )
      .pipe(timeout(15000));
  }

  register(email: string, password: string): Observable<AuthApiResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const name = this.deriveNameFromEmail(normalizedEmail);

    return this.http
      .post<AuthApiResponse>(
        `${this.apiBaseUrl}/auth/signup`,
        {
          name,
          email: normalizedEmail,
          password,
        },
        { withCredentials: true },
      )
      .pipe(timeout(15000));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(timeout(10000));
  }

  refresh(): Observable<AuthApiResponse> {
    return this.http
      .post<AuthApiResponse>(
        `${this.apiBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(timeout(15000));
  }

  getProfile(): Observable<AuthApiUser> {
    return this.http
      .get<AuthApiUser>(`${this.apiBaseUrl}/users/profile`, {
        withCredentials: true,
      })
      .pipe(timeout(15000));
  }

  private deriveNameFromEmail(email: string): string {
    const raw =
      email
        .split("@")[0]
        ?.replace(/[._-]+/g, " ")
        .trim() || "Customer";

    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
