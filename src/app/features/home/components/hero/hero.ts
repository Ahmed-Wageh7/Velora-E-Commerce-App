import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { SiteNavbar } from '../../../../shared/components/site-navbar/site-navbar';

@Component({
  selector: 'app-hero',
  imports: [SiteNavbar],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero implements OnInit, OnDestroy {
  private carouselIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly currentSlide = signal(0);
  readonly slides = [
    {
      desktopSrc: '/home/hero/desktop/aura.webp',
      mobileSrc: '/home/hero/mobile/aura.webp',
      alt: 'Veloura Aura collection banner',
    },
    {
      desktopSrc: '/home/hero/desktop/cyber-sport.webp',
      mobileSrc: '/home/hero/mobile/cyber-sport.webp',
      alt: 'Veloura cyber sport collection banner',
    },
    {
      desktopSrc: '/home/hero/desktop/lady-queen.webp',
      mobileSrc: '/home/hero/mobile/lady-queen.webp',
      alt: 'Veloura lady queen collection banner',
    },
    {
      desktopSrc: '/home/hero/desktop/promise-gold.webp',
      mobileSrc: '/home/hero/mobile/promise-gold.webp',
      alt: 'Veloura promise gold collection banner',
    },
  ];
  ngOnInit() {
    this.carouselIntervalId = setInterval(() => {
      this.currentSlide.update((index) => (index + 1) % this.slides.length);
    }, 4000);
  }

  ngOnDestroy() {
    if (this.carouselIntervalId) {
      clearInterval(this.carouselIntervalId);
    }
  }

}
