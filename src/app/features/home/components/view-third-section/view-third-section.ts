import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-view-third-section',
  imports: [RouterLink],
  templateUrl: './view-third-section.html',
  styleUrl: './view-third-section.scss',
})
export class ViewThirdSectionComponent {
  protected readonly imageUrls = {
    primaryLeft: '/third-1.webp',
    primaryRight: '/third-2.webp',
    featureWide: '/third-3.webp',
  };
}
