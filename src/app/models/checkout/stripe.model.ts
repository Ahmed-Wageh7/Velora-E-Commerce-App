export interface StripeCardElement {
  mount(domElement: HTMLElement): void;
  unmount(): void;
  destroy(): void;
  on(eventName: 'change', handler: (event: { error?: { message?: string } }) => void): void;
}
