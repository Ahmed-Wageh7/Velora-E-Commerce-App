import { CommonModule } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-scroll-to-top',
  imports: [CommonModule],
  templateUrl: './scroll-to-top.html',
  styleUrl: './scroll-to-top.scss',
})
export class ScrollToTopComponent {
  protected readonly scrollProgress = signal(0);
  protected readonly isVisible = signal(false);

  constructor() {
    this.updateScrollState();
  }

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.updateScrollState();
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected progressStyle(): string {
    const progress = this.scrollProgress();
    return `conic-gradient(#8f6f1f ${progress}%, #e8dfcf ${progress}% 100%)`;
  }

  private updateScrollState(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollHeight > 0 ? Math.min((scrollTop / scrollHeight) * 100, 100) : 0;

    this.scrollProgress.set(progress);
    this.isVisible.set(scrollTop > 180);
  }
}
