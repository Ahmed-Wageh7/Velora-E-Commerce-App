import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class CartAnimationService {
  private readonly document = inject(DOCUMENT);

  animateFromTrigger(
    trigger: HTMLElement | null,
    imageUrl: string,
  ): Promise<void> {
    if (!trigger || !imageUrl) {
      return Promise.resolve();
    }

    const container = trigger.closest(
      "article, .product-hero, .product-gallery, .art-card, .promise-card",
    );

    const sourceImage = container?.querySelector("img");

    if (!(sourceImage instanceof HTMLImageElement)) {
      return Promise.resolve();
    }

    return this.animateFromSource(sourceImage, imageUrl);
  }

  animateFromSource(
    sourceImage: HTMLElement | null,
    imageUrl: string,
  ): Promise<void> {
    if (!sourceImage || !imageUrl) {
      return Promise.resolve();
    }

    const cartElement = this.document.querySelector(".site-cart-link");

    if (!(cartElement instanceof HTMLElement)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const sourceRect = sourceImage.getBoundingClientRect();

          const cartIcon = cartElement.querySelector("svg");

          const cartRect =
            cartIcon instanceof SVGElement
              ? cartIcon.getBoundingClientRect()
              : cartElement.getBoundingClientRect();

          if (
            !sourceRect.width ||
            !sourceRect.height ||
            !cartRect.width ||
            !cartRect.height
          ) {
            resolve();
            return;
          }

          const animationImage = this.createAnimationImage(
            imageUrl,
            sourceRect,
          );

          this.document.body.appendChild(animationImage);

          const flyAnimation = this.createFlyAnimation(
            animationImage,
            sourceRect,
            cartRect,
          );

          this.animateCart(cartElement, cartIcon);

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

  private createAnimationImage(
    imageUrl: string,
    sourceRect: DOMRect,
  ): HTMLImageElement {
    const image = this.document.createElement("img");

    image.src = imageUrl;
    image.alt = "";
    image.className = "cart-fly-image";

    image.style.left = `${sourceRect.left}px`;
    image.style.top = `${sourceRect.top}px`;
    image.style.width = `${sourceRect.width}px`;
    image.style.height = `${sourceRect.height}px`;

    return image;
  }

  private createFlyAnimation(
    image: HTMLImageElement,
    sourceRect: DOMRect,
    cartRect: DOMRect,
  ): Animation {
    const startCenterX = sourceRect.left + sourceRect.width / 2;

    const startCenterY = sourceRect.top + sourceRect.height / 2;

    const endCenterX = cartRect.left + cartRect.width / 2;

    const endCenterY = cartRect.top + cartRect.height / 2;

    const travelX = endCenterX - startCenterX;

    const travelY = endCenterY - startCenterY;

    const arcLift = Math.min(-110, travelY * 0.34);

    return image.animate(
      [
        {
          opacity: 0.96,
          transform: "translate3d(0, 0, 0) scale(1) rotate(0deg)",
          filter: "blur(0)",
        },
        {
          opacity: 1,
          transform: `translate3d(
            ${travelX * 0.24}px,
            ${travelY * 0.14 + arcLift * 0.5}px,
            0
          ) scale(1.08) rotate(3deg)`,
          filter: "blur(0)",
          offset: 0.34,
        },
        {
          opacity: 0.94,
          transform: `translate3d(
            ${travelX * 0.7}px,
            ${travelY * 0.66 + arcLift}px,
            0
          ) scale(0.82) rotate(7deg)`,
          filter: "blur(0.15px)",
          offset: 0.76,
        },
        {
          opacity: 0,
          transform: `translate3d(
            ${travelX}px,
            ${travelY}px,
            0
          ) scale(0.08) rotate(12deg)`,
          filter: "blur(0.9px)",
        },
      ],
      {
        duration: 2100,
        easing: "cubic-bezier(0.18, 0.74, 0.22, 1)",
        fill: "forwards",
      },
    );
  }

  private animateCart(
    cartElement: HTMLElement,
    cartIcon: SVGElement | null,
  ): void {
    const delay = 1620;
    const duration = 420;

    cartElement.animate(
      [
        {
          transform: "scale(1)",
        },
        {
          transform: "scale(1.18)",
          offset: 0.45,
        },
        {
          transform: "scale(1)",
        },
      ],
      {
        duration,
        easing: "ease-out",
        delay,
      },
    );

    if (cartIcon instanceof SVGElement) {
      cartIcon.animate(
        [
          {
            transform: "rotate(0deg)",
          },
          {
            transform: "rotate(-12deg)",
            offset: 0.4,
          },
          {
            transform: "rotate(0deg)",
          },
        ],
        {
          duration,
          easing: "ease-out",
          delay,
        },
      );
    }
  }
}
