import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../core/notifications/toast.service';
import { SiteNavbar } from '../../../../layout/site-navbar/site-navbar';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SiteNavbar],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPageComponent {
  protected readonly demoCredentials = {
    email: 'a7medgado77@gmail.com',
    password: 'AhmedWageh123',
  };

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected isSubmitting = false;
  protected isSigningOut = false;
  protected errorMessage = '';
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mode = computed<'signin' | 'register'>(() =>
    this.route.snapshot.routeConfig?.path === 'auth/register' ? 'register' : 'signin',
  );

  protected readonly signInForm = this.formBuilder.group({
    email: this.formBuilder.control(this.demoCredentials.email, [Validators.required, Validators.email]),
    password: this.formBuilder.control(this.demoCredentials.password, [Validators.required]),
  });

  protected readonly registerForm = this.formBuilder.group(
    {
      email: this.formBuilder.control('', [Validators.required, Validators.email]),
      password: this.formBuilder.control('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(72),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/),
      ]),
      confirmPassword: this.formBuilder.control('', [Validators.required]),
    },
    { validators: [AuthPageComponent.passwordsMatchValidator] },
  );

  protected async submitSignIn(): Promise<void> {
    this.signInForm.markAllAsTouched();
    this.errorMessage = '';

    if (this.signInForm.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const { email, password } = this.signInForm.getRawValue();
      const result = await Promise.race([
        this.authService.signIn(email, password),
        this.createAuthTimeoutResult('The login request timed out. Please try again.'),
      ]);

      if (!result.ok) {
        this.errorMessage = result.error;
        return;
      }

      this.toastService.show('Signed in', 'Welcome back.', 'success', 1500);
      this.isSubmitting = false;
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      void this.router.navigateByUrl(returnUrl);
      return;
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async submitRegister(): Promise<void> {
    this.registerForm.markAllAsTouched();
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      return;
    }

    this.isSubmitting = true;

    try {
      const { email, password } = this.registerForm.getRawValue();
      const result = await Promise.race([
        this.authService.register(email, password),
        this.createAuthTimeoutResult('The register request timed out. Please try again.'),
      ]);

      if (!result.ok) {
        this.errorMessage = result.error;
        return;
      }

      if (this.authService.isAuthenticated()) {
        this.toastService.show('Account created', 'Welcome to Veloura.', 'success', 1500);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        void this.router.navigateByUrl(returnUrl);
        return;
      }

      this.toastService.showExact(
        'Account created',
        'We sent a verification email to your inbox. Check your email before signing in.',
        'success',
        8000,
      );
      this.isSubmitting = false;
      void this.router.navigate(['/auth/signin']);
      return;
    } finally {
      this.isSubmitting = false;
    }
  }

  protected async signOut(): Promise<void> {
    if (this.isSigningOut) {
      return;
    }

    this.isSigningOut = true;

    try {
      await this.authService.signOut({ showToast: true });
    } finally {
      this.isSigningOut = false;
    }
  }

  protected hasControlError(control: AbstractControl | null, errorKey: string): boolean {
    return Boolean(control && control.touched && control.hasError(errorKey));
  }

  protected shouldShowGroupError(control: AbstractControl | null, errorKey: string): boolean {
    return Boolean(control && (control.touched || control.dirty) && control.hasError(errorKey));
  }

  private static passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (!password || !confirmPassword || password === confirmPassword) {
      return null;
    }

    return { passwordMismatch: true };
  }

  private createAuthTimeoutResult(message: string): Promise<{ ok: false; error: string }> {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve({ ok: false, error: message }), 8000);
    });
  }
}
