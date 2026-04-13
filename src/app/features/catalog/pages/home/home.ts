import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ProductCardComponent } from '../../components/product-card/product-card';
import { ProductsService } from '../../../../core/services/products.service';

@Component({
  selector: 'app-home-page',
  imports: [AsyncPipe, ProductCardComponent],
  templateUrl: './home.html',
})
export class HomePageComponent {
  private readonly productsService = inject(ProductsService);

  protected readonly products$ = this.productsService.getProducts();
}
