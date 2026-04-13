import { Injectable, signal } from '@angular/core';

export interface ToastProductPreview {
  name: string;
  image: string;
  price?: number;
  quantity?: number;
}

export interface ToastMessage {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'cart';
  duration: number;
  visible: boolean;
  paused: boolean;
  remaining: number;
  startedAt: number;
  product?: ToastProductPreview;
}

type ToastInput = Pick<ToastMessage, 'title' | 'message' | 'type' | 'duration' | 'product'>;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  private readonly toastsSignal = signal<ToastMessage[]>([]);
  private readonly timer = globalThis.setTimeout.bind(globalThis);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this.toastsSignal.asReadonly();

  show(title: string, message: string, type: ToastMessage['type'] = 'info', duration = 3000): void {
    this.createToast({
      title,
      message,
      type,
      duration: this.getDefaultDuration(type, duration),
    });
  }

  showExact(title: string, message: string, type: ToastMessage['type'] = 'info', duration = 3000): void {
    this.createToast({
      title,
      message,
      type,
      duration,
    });
  }

  showAddedToCart(product: ToastProductPreview, duration = 3200): void {
    this.createToast({
      title: 'Added to cart',
      message: product.name,
      type: 'cart',
      duration,
      product,
    });
  }

  private createToast({ title, message, type, duration, product }: ToastInput): void {
    const id = ++this.nextId;
    const toast: ToastMessage = {
      id,
      title,
      message,
      type,
      duration,
      visible: false,
      paused: false,
      remaining: duration,
      startedAt: Date.now(),
      product,
    };

    this.toastsSignal.update((toasts) => [...toasts, toast]);

    queueMicrotask(() => {
      this.toastsSignal.update((toasts) =>
        toasts.map((item) => (item.id === id ? { ...item, visible: true } : item)),
      );
    });

    this.startTimer(id, duration);
  }

  hide(id: number): void {
    const timeoutId = this.timers.get(id);

    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timers.delete(id);
    }

    this.toastsSignal.update((toasts) =>
      toasts.map((toast) => (toast.id === id ? { ...toast, visible: false } : toast)),
    );

    this.timer(() => {
      this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
    }, 320);
  }

  pause(id: number): void {
    const timeoutId = this.timers.get(id);

    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timers.delete(id);
    }

    this.toastsSignal.update((toasts) =>
      toasts.map((toast) => {
        if (toast.id !== id || toast.paused) {
          return toast;
        }

        const elapsed = Date.now() - toast.startedAt;

        return {
          ...toast,
          paused: true,
          remaining: Math.max(0, toast.remaining - elapsed),
        };
      }),
    );
  }

  resume(id: number): void {
    let remaining = 0;

    this.toastsSignal.update((toasts) =>
      toasts.map((toast) => {
        if (toast.id !== id || !toast.paused) {
          return toast;
        }

        remaining = toast.remaining;

        return {
          ...toast,
          paused: false,
          startedAt: Date.now(),
        };
      }),
    );

    if (remaining > 0) {
      this.startTimer(id, remaining);
    } else {
      this.hide(id);
    }
  }

  private startTimer(id: number, delay: number): void {
    const timeoutId = this.timer(() => this.hide(id), delay);
    this.timers.set(id, timeoutId);
  }

  private getDefaultDuration(type: ToastMessage['type'], requestedDuration: number): number {
    if (type === 'cart') {
      return requestedDuration;
    }

    if (type === 'success') {
      return 2000;
    }

    return requestedDuration;
  }
}
