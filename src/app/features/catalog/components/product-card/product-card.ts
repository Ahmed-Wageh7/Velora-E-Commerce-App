import { Component, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../core/services/products.service';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './product-card.html',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;

  protected get productRoute(): (number | string)[] {
    return this.product.detailFolder ? ['/product', this.product.detailFolder, this.product.id] : ['/product', this.product.id];
  }

  protected get primaryImage(): string {
    return this.product.primaryImage ?? this.product.image;
  }

  protected get coverImage(): string | undefined {
    return this.product.coverImage;
  }

  protected get cornerImage(): string | undefined {
    return this.product.cornerImage ?? this.product.conerImage;
  }
}
