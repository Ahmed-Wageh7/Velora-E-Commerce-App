import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../services/auth.service";

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthInitializing()) {
    await authService.restoreSession();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(["/auth/signin"]);
};
