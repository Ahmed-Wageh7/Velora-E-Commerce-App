import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ToastService],
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses a 2 second duration for success toasts', () => {
    const service = TestBed.inject(ToastService);

    service.show('Saved', 'Changes saved successfully.', 'success', 5000);

    const [toast] = service.toasts();
    expect(toast.type).toBe('success');
    expect(toast.duration).toBe(2000);
  });

  it('shows and fully removes a toast after its timer finishes', () => {
    const service = TestBed.inject(ToastService);

    service.show('Info', 'Background sync completed.', 'info', 1000);

    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(service.toasts()[0].visible).toBe(false);

    vi.advanceTimersByTime(320);
    expect(service.toasts()).toHaveLength(0);
  });

  it('replaces the current cart toast immediately when another product is added', () => {
    const service = TestBed.inject(ToastService);

    service.showAddedToCart({ name: 'Bag', image: '/bag.jpg' }, 1000);
    service.showAddedToCart({ name: 'Watch', image: '/watch.jpg' }, 1000);

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('Watch');
  });
});
