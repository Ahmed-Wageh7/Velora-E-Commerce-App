import { Component } from '@angular/core';
import { Hero } from '../../components/hero/hero';
import { ArtDedicationComponent } from '../../components/art-dedication/art-dedication';
import { CollectionBannerSectionComponent } from '../../components/collection-banner-section/collection-banner-section';
import { FrankelCollectionSectionComponent } from '../../components/frankel-collection-section/frankel-collection-section';
import { PromiseShowcaseComponent } from '../../components/promise-showcase/promise-showcase';
import { TopReleasesComponent } from '../../components/top-releases/top-releases';
import { ViewThirdSectionComponent } from '../../components/view-third-section/view-third-section';
import { HomeCollectionCarouselSectionComponent } from '../../components/home-collection-carousel-section/home-collection-carousel-section';
import { LovedOnesGiftSectionComponent } from '../../components/loved-ones-gift-section/loved-ones-gift-section';

@Component({
  selector: 'app-home',
  imports: [
    Hero,
    TopReleasesComponent,
    ArtDedicationComponent,
    ViewThirdSectionComponent,
    FrankelCollectionSectionComponent,
    CollectionBannerSectionComponent,
    PromiseShowcaseComponent,
    HomeCollectionCarouselSectionComponent,
    LovedOnesGiftSectionComponent,
  ],
  templateUrl: './home.html',
})
export class Home {}
