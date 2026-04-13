import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';

@Component({
  selector: 'app-auth-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SiteNavbar],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class AuthPageComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  protected isSubmitting = false;
  protected errorMessage = '';
  protected readonly currentUser = this.authService.currentUser;
  protected readonly mode = computed<'signin' | 'register'>(() =>
    this.route.snapshot.routeConfig?.path === 'auth/register' ? 'register' : 'signin',
  );

  protected readonly signInForm = this.formBuilder.group({
    email: this.formBuilder.control('', [Validators.required, Validators.email]),
    password: this.formBuilder.control('', [Validators.required]),
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
      void this.router.navigateByUrl('/');
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

  protected signOut(): void {
    this.authService.signOut();
    this.toastService.show('Signed out', 'Your session has been cleared.', 'info', 1400);
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
