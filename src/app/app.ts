import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './core/notifications/toast/toast';
import { ScrollToTopComponent } from './layout/scroll-to-top/scroll-to-top';
import { SiteFooter } from './layout/site-footer/site-footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ScrollToTopComponent, SiteFooter],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
