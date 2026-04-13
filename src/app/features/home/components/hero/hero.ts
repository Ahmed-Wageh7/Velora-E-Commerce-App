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
      desktopSrc: '/Hero-Desc/Aura.webp',
      mobileSrc: '/Hero-Mob/Aura.webp',
      alt: 'Veloura Aura collection banner',
    },
    {
      desktopSrc: '/Hero-Desc/cyber-sport.webp',
      mobileSrc: '/Hero-Mob/cyber-sport.webp',
      alt: 'Veloura cyber sport collection banner',
    },
    {
      desktopSrc: '/Hero-Desc/lady-queen.webp',
      mobileSrc: '/Hero-Mob/lady-queen-mobile.webp',
      alt: 'Veloura lady queen collection banner',
    },
    {
      desktopSrc: '/Hero-Desc/promise-gold.webp',
      mobileSrc: '/Hero-Mob/promise-gold.webp',
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
