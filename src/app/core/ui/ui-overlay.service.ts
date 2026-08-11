import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiOverlayService {
  private readonly authModalState = signal<{ open: boolean; mode: 'signin' | 'register' }>({
    open: false,
    mode: 'signin',
  });

  readonly authModal = this.authModalState.asReadonly();

  openAuthModal(mode: 'signin' | 'register' = 'signin'): void {
    this.authModalState.set({ open: true, mode });
  }

  closeAuthModal(): void {
    this.authModalState.set({ open: false, mode: 'signin' });
  }

  setAuthMode(mode: 'signin' | 'register'): void {
    this.authModalState.update((state) => ({ ...state, mode }));
  }
}
