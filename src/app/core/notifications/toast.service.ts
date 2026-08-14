import { Injectable, signal } from "@angular/core";
import {
  ToastInput,
  ToastMessage,
  ToastProductPreview,
} from "../../models/notification/toast.model";

@Injectable({
  providedIn: "root",
})
export class ToastService {
  private nextId = 0;

  private readonly toastsSignal = signal<ToastMessage[]>([]);
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  readonly toasts = this.toastsSignal.asReadonly();

  show(
    title: string,
    message: string,
    type: ToastMessage["type"] = "info",
    duration = 3000,
  ): void {
    this.createToast({
      title,
      message,
      type,
      duration,
    });
  }

  showExact(
    title: string,
    message: string,
    type: ToastMessage["type"] = "info",
    duration = 3000,
  ): void {
    this.createToast({
      title,
      message,
      type,
      duration,
    });
  }

  showAddedToCart(product: ToastProductPreview, duration = 2000): void {
    this.createToast({
      title: "Added to cart",
      message: product.name,
      type: "cart",
      duration,
      product,
      replaceGroup: "cart",
    });
  }

  showCartStatus(
    title: string,
    message: string,
    type: Extract<ToastMessage["type"], "success" | "info" | "error"> = "info",
    duration = 1600,
  ): void {
    this.createToast({
      title,
      message,
      type,
      duration,
      replaceGroup: "cart",
    });
  }

  hide(id: number): void {
    this.clearTimer(id);

    const toastExists = this.toasts().some((toast) => toast.id === id);

    if (!toastExists) {
      return;
    }

    this.toastsSignal.update((toasts) =>
      toasts.map((toast) =>
        toast.id === id ? { ...toast, visible: false } : toast,
      ),
    );

    setTimeout(() => {
      this.toastsSignal.update((toasts) =>
        toasts.filter((toast) => toast.id !== id),
      );
    }, 320);
  }

  pause(id: number): void {
    const toast = this.toasts().find((item) => item.id === id);

    if (!toast || toast.paused) {
      return;
    }

    this.clearTimer(id);

    const elapsed = Date.now() - toast.startedAt;
    const remaining = Math.max(0, toast.remaining - elapsed);

    this.toastsSignal.update((toasts) =>
      toasts.map((item) =>
        item.id === id
          ? {
              ...item,
              paused: true,
              remaining,
            }
          : item,
      ),
    );
  }

  resume(id: number): void {
    const toast = this.toasts().find((item) => item.id === id);

    if (!toast || !toast.paused) {
      return;
    }

    if (toast.remaining <= 0) {
      this.hide(id);
      return;
    }

    this.toastsSignal.update((toasts) =>
      toasts.map((item) =>
        item.id === id
          ? {
              ...item,
              paused: false,
              startedAt: Date.now(),
            }
          : item,
      ),
    );

    this.startTimer(id, toast.remaining);
  }

  private createToast({
    title,
    message,
    type,
    duration,
    product,
    replaceGroup,
  }: ToastInput): void {
    if (replaceGroup) {
      this.dismissToastGroup(replaceGroup);
    }

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
      replaceGroup,
    };

    this.toastsSignal.update((toasts) => [...toasts, toast]);

    queueMicrotask(() => {
      this.toastsSignal.update((toasts) =>
        toasts.map((item) =>
          item.id === id ? { ...item, visible: true } : item,
        ),
      );
    });

    this.startTimer(id, duration);
  }

  private startTimer(id: number, duration: number): void {
    this.clearTimer(id);

    const timer = setTimeout(() => {
      this.hide(id);
    }, duration);

    this.timers.set(id, timer);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);

    if (!timer) {
      return;
    }

    clearTimeout(timer);
    this.timers.delete(id);
  }

  private dismissToastGroup(group: string): void {
    const matchingToasts = this.toasts().filter(
      (toast) => toast.replaceGroup === group,
    );

    for (const toast of matchingToasts) {
      this.clearTimer(toast.id);
    }

    if (matchingToasts.length === 0) {
      return;
    }

    this.toastsSignal.update((toasts) =>
      toasts.filter((toast) => toast.replaceGroup !== group),
    );
  }
}
