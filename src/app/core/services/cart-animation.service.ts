import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CartAnimationService {
  private readonly document = inject(DOCUMENT);

  animateFromTrigger(trigger: HTMLElement | null, imageUrl: string): Promise<void> {
    if (!trigger) {
      return Promise.resolve();
    }

    const container = trigger.closest('article, .product-hero, .product-gallery, .art-card, .promise-card');
    const sourceImage = container?.querySelector('img');

    return sourceImage instanceof HTMLImageElement
      ? this.animateFromSource(sourceImage, imageUrl)
      : Promise.resolve();
  }

  animateFromSource(sourceImage: HTMLElement | null, imageUrl: string): Promise<void> {
    const cartElement = this.document.querySelector('.site-cart-link');

    if (!sourceImage || !(cartElement instanceof HTMLElement)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const imageRect = sourceImage.getBoundingClientRect();
          const cartIcon = cartElement.querySelector('svg');
          const cartRect =
            cartIcon instanceof SVGElement ? cartIcon.getBoundingClientRect() : cartElement.getBoundingClientRect();
          const animationImage = this.document.createElement('img');
          const startCenterX = imageRect.left + imageRect.width / 2;
          const startCenterY = imageRect.top + imageRect.height / 2;
          const endCenterX = cartRect.left + cartRect.width / 2;
          const endCenterY = cartRect.top + cartRect.height / 2;
          const travelX = endCenterX - startCenterX;
          const travelY = endCenterY - startCenterY;
          const arcLift = Math.min(-110, travelY * 0.34);

          animationImage.src = imageUrl;
          animationImage.alt = '';
          animationImage.className = 'cart-fly-image';
          animationImage.style.left = `${imageRect.left}px`;
          animationImage.style.top = `${imageRect.top}px`;
          animationImage.style.width = `${imageRect.width}px`;
          animationImage.style.height = `${imageRect.height}px`;

          this.document.body.appendChild(animationImage);

          const flyAnimation = animationImage.animate(
            [
              {
                opacity: 0.96,
                transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
                filter: 'blur(0)',
              },
              {
                opacity: 1,
                transform: `translate3d(${travelX * 0.28}px, ${travelY * 0.18 + arcLift * 0.55}px, 0) scale(1.16) rotate(4deg)`,
                filter: 'blur(0)',
                offset: 0.38,
              },
              {
                opacity: 0.94,
                transform: `translate3d(${travelX * 0.72}px, ${travelY * 0.7 + arcLift}px, 0) scale(0.62) rotate(8deg)`,
                filter: 'blur(0.15px)',
                offset: 0.72,
              },
              {
                opacity: 0,
                transform: `translate3d(${travelX}px, ${travelY}px, 0) scale(0.08) rotate(12deg)`,
                filter: 'blur(0.9px)',
              },
            ],
            {
              duration: 1350,
              easing: 'cubic-bezier(0.2, 0.9, 0.24, 1)',
              fill: 'forwards',
            },
          );

          cartElement.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(1.18)', offset: 0.45 },
              { transform: 'scale(1)' },
            ],
            { duration: 360, easing: 'ease-out', delay: 980 },
          );

          if (cartIcon instanceof SVGElement) {
            cartIcon.animate(
              [
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(-12deg)', offset: 0.4 },
                { transform: 'rotate(0deg)' },
              ],
              { duration: 380, easing: 'ease-out', delay: 980 },
            );
          }

          flyAnimation.finished
            .catch(() => undefined)
            .finally(() => {
              animationImage.remove();
              resolve();
            });
        });
      });
    });
  }
}
