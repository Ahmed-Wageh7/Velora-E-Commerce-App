import { CollectionProductSeed } from '../product/collection-product.model';

export interface LocalCollectionPageConfig {
  title: string;
  folder: string;
  imageFiles: string[];
  products: CollectionProductSeed[];
  heroImageFile?: string;
  includeDeletedProducts?: boolean;
  fetchAllPages?: boolean;
  minimumLoadingMs?: number;
}
