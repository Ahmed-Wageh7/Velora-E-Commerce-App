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
    primaryLeft: '/home/editorial/third-1.webp',
    primaryRight: '/home/editorial/third-2.webp',
    featureWide: '/home/editorial/third-3.webp',
  };
}
