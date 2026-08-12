import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteNavbar } from '../../../../layout/site-navbar/site-navbar';
import { ProductCollectionPageBase } from '../shared/product-collection-page-base';

@Component({
  selector: 'app-watch-collection-page',
  imports: [RouterLink, SiteNavbar],
  templateUrl: '../shared/product-collection-page.html',
  styleUrl: '../../pages/frankel-collection/frankel-collection.scss',
})
export class WatchCollectionPageComponent extends ProductCollectionPageBase {
  protected override readonly defaultBreadcrumbParentLabel = 'Veloura Watches';
  protected override readonly useCollectionFolderForRelativeHero = false;
}
