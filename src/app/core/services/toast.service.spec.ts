import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
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
});
