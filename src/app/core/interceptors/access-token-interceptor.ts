import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../auth/auth.service";

export const accessTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const accessToken = authService.getAccessToken();

  if (!accessToken || isAuthRequest(req)) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};

function isAuthRequest(req: { url: string }): boolean {
  return [
    "/auth/login",
    "/auth/signup",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some((path) => req.url.includes(path));
}
