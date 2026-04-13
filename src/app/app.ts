import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/ui/toast/toast';
import { ScrollToTopComponent } from './shared/components/scroll-to-top/scroll-to-top';
import { SiteFooter } from './shared/components/site-footer/site-footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ScrollToTopComponent, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
