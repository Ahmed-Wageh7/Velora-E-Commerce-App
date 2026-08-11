export interface LocalCollectionProductSeed {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  quantity?: number;
  primaryImage?: string;
  hoverImage?: string;
  coverImage?: string;
  cornerImage?: string;
}

export interface LocalCollectionPageConfig {
  title: string;
  folder: string;
  imageFiles: string[];
  products: LocalCollectionProductSeed[];
  heroImageFile?: string;
  includeDeletedProducts?: boolean;
  fetchAllPages?: boolean;
  minimumLoadingMs?: number;
}
